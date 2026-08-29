from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import User, PasswordResetToken
from schemas import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    ForgotPasswordRequest,
    VerifyPasswordResetOtpRequest,
    ResetPasswordRequest,
)
from auth.jwt import verify_password, get_password_hash, create_access_token, decode_token, get_secret_key
from utils.profile import ensure_unique_public_slug
from utils.time import is_past, utc_now
import secrets
import hashlib
import hmac
import requests
from datetime import timedelta
import os

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
OTP_LIFETIME_MINUTES = 10
RESET_TOKEN_LIFETIME_MINUTES = 15
MAX_OTP_ATTEMPTS = 5


def is_email_configured(api_key: str) -> bool:
    placeholder_values = {
        "",
        "your_brevo_api_key",
    }
    return api_key.strip() not in placeholder_values


def is_production_environment() -> bool:
    environment = (os.getenv("ENVIRONMENT", "") or "").strip().lower()
    return bool(os.getenv("RENDER")) or environment in {"production", "prod"}


def get_email_settings() -> tuple[str, str, str]:
    """Brevo (HTTPS API) settings. Replaces the old SMTP settings, since
    Render's free tier blocks outbound SMTP ports (25/465/587)."""
    api_key = (os.getenv("BREVO_API_KEY", "") or "").strip()
    sender_email = (
        os.getenv("SMTP_SENDER", "")
        or os.getenv("EMAIL_SENDER", "")
        or "deeplyfitai@gmail.com"
    ).strip()
    sender_name = (os.getenv("EMAIL_SENDER_NAME", "") or "Deeply Fit").strip()
    return api_key, sender_email, sender_name


def find_user_by_email(db: Session, email: str):
    """Keep email identity consistent across the website and mobile app."""
    normalized_email = str(email).strip().casefold()
    return db.query(User).filter(func.lower(User.email) == normalized_email).first()


def hash_reset_otp(user_id: int, otp: str, salt: str | None = None) -> str:
    """Hash short-lived OTPs so the code is never stored in plaintext."""
    otp_salt = salt or secrets.token_hex(16)
    payload = f"{user_id}:{otp_salt}:{otp}".encode("utf-8")
    digest = hmac.new(get_secret_key().encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return f"otp${otp_salt}${digest}"


def verify_reset_otp_hash(user_id: int, otp: str, stored_value: str) -> bool:
    try:
        prefix, salt, expected_digest = stored_value.split("$", 2)
    except ValueError:
        return False
    if prefix != "otp":
        return False
    actual_digest = hash_reset_otp(user_id, otp, salt).rsplit("$", 1)[-1]
    return hmac.compare_digest(actual_digest, expected_digest)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        normalized_email = str(user_data.email).strip().casefold()
        existing = find_user_by_email(db, normalized_email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = get_password_hash(user_data.password)
        user = User(
            email=normalized_email,
            hashed_password=hashed,
            name=user_data.name,
            public_profile_slug=ensure_unique_public_slug(
                db,
                user_data.name or user_data.email.split("@")[0],
            ),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        user = find_user_by_email(db, user_data.email)
        if not user or not verify_password(user_data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = find_user_by_email(db, data.email)
    if not user:
        # Return success anyway to avoid email enumeration
        return {"message": "If that email exists, a verification code has been sent."}

    # Invalidate old tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == 0
    ).update({"used": 1})

    otp = f"{secrets.randbelow(1_000_000):06d}"
    expires = utc_now() + timedelta(minutes=OTP_LIFETIME_MINUTES)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=hash_reset_otp(user.id, otp),
        expires_at=expires,
        attempts=0,
    )
    db.add(reset_token)
    db.commit()

    api_key, sender_email, sender_name = get_email_settings()

    if is_email_configured(api_key):
        try:
            body_html = f"""<p>Hi {user.name or 'there'},</p>
<p>You requested a password reset for your Deeply Fit account.</p>
<p>Your verification code is: <strong>{otp}</strong></p>
<p>Enter this code in the Deeply Fit website or mobile app. It is valid for {OTP_LIFETIME_MINUTES} minutes.</p>
<p>If you didn't request this, ignore this email.</p>
<p>-- Deeply Fit Team</p>"""

            response = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "sender": {"name": sender_name, "email": sender_email},
                    "to": [{"email": user.email}],
                    "subject": f"{otp} is your Deeply Fit verification code",
                    "htmlContent": body_html,
                },
                timeout=15,
            )
            response.raise_for_status()
        except Exception as e:
            print(f"[Brevo] Password reset email failed for {user.email}: {e}")
            reset_token.used = 1
            db.commit()
            raise HTTPException(
                status_code=500,
                detail="Could not send the verification email. Check the server email settings.",
            )
    else:
        if is_production_environment():
            reset_token.used = 1
            db.commit()
            raise HTTPException(
                status_code=503,
                detail="Password reset email is not configured on the server.",
            )
        print(f"[DEV] Password reset OTP for {user.email}: {otp}")
        return {
            "message": "Email is not configured. Use this development verification code.",
            "development_otp": otp,
        }

    return {"message": "If that email exists, a verification code has been sent."}


@router.post("/verify-reset-otp")
def verify_password_reset_otp(data: VerifyPasswordResetOtpRequest, db: Session = Depends(get_db)):
    invalid_code = HTTPException(status_code=400, detail="Invalid or expired verification code")
    user = find_user_by_email(db, data.email)
    if not user:
        raise invalid_code

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == 0,
    ).order_by(PasswordResetToken.created_at.desc(), PasswordResetToken.id.desc()).first()

    if not record:
        raise invalid_code
    if is_past(record.expires_at) or record.attempts >= MAX_OTP_ATTEMPTS:
        record.used = 1
        db.commit()
        raise invalid_code
    if not verify_reset_otp_hash(user.id, data.otp, record.token):
        record.attempts += 1
        if record.attempts >= MAX_OTP_ATTEMPTS:
            record.used = 1
        db.commit()
        raise invalid_code

    # Exchange the six-digit code for a high-entropy, short-lived reset token.
    reset_token = secrets.token_urlsafe(32)
    record.token = reset_token
    record.expires_at = utc_now() + timedelta(minutes=RESET_TOKEN_LIFETIME_MINUTES)
    record.attempts = 0
    db.commit()
    return {"reset_token": reset_token, "message": "Verification code confirmed"}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token,
        PasswordResetToken.used == 0
    ).first()

    if not record or is_past(record.expires_at):
        raise HTTPException(status_code=400, detail="Invalid or expired password reset request")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(data.new_password)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == 0,
    ).update({"used": 1})
    db.commit()

    return {"message": "Password updated successfully"}