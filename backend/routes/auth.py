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
import smtplib
from email.mime.text import MIMEText
from datetime import timedelta
import os

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
OTP_LIFETIME_MINUTES = 10
RESET_TOKEN_LIFETIME_MINUTES = 15
MAX_OTP_ATTEMPTS = 5


def is_smtp_configured(smtp_user: str, smtp_pass: str) -> bool:
    placeholder_values = {
        "",
        "your_gmail@gmail.com",
        "your_app_password",
        "your-email@gmail.com",
        "your-password",
    }
    return smtp_user.strip() not in placeholder_values and smtp_pass.strip() not in placeholder_values


def is_production_environment() -> bool:
    environment = (os.getenv("ENVIRONMENT", "") or "").strip().lower()
    return bool(os.getenv("RENDER")) or environment in {"production", "prod"}


def first_configured_value(*values: str) -> str:
    placeholder_values = {
        "",
        "your_gmail@gmail.com",
        "your_app_password",
        "your-email@gmail.com",
        "your-password",
    }
    for value in values:
        normalized = (value or "").strip()
        if normalized and normalized not in placeholder_values:
            return normalized
    return ""


def get_smtp_settings() -> tuple[str, int, str, str, str]:
    smtp_host = (os.getenv("SMTP_HOST", "smtp.gmail.com") or "").strip()
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="SMTP_PORT must be a valid number") from exc
    smtp_user = first_configured_value(
        os.getenv("SMTP_USER", ""),
        os.getenv("MAIL_USERNAME", ""),
    )
    smtp_pass = first_configured_value(
        os.getenv("SMTP_PASS", ""),
        os.getenv("MAIL_PASSWORD", ""),
    )
    smtp_sender = first_configured_value(
        os.getenv("SMTP_SENDER", ""),
        os.getenv("MAIL_DEFAULT_SENDER", ""),
        smtp_user,
    )
    return smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender


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

    smtp_host, smtp_port, smtp_user, smtp_pass, smtp_sender = get_smtp_settings()

    if is_smtp_configured(smtp_user, smtp_pass):
        try:
            body = f"""Hi {user.name or 'there'},

You requested a password reset for your Deeply Fit account.

Your verification code is: {otp}

Enter this code in the Deeply Fit website or mobile app. It is valid for {OTP_LIFETIME_MINUTES} minutes.

If you didn't request this, ignore this email.

-- Deeply Fit Team"""
            msg = MIMEText(body)
            msg["Subject"] = f"{otp} is your Deeply Fit verification code"
            msg["From"] = smtp_sender
            msg["To"] = user.email
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_sender, user.email, msg.as_string())
        except Exception as e:
            print(f"[SMTP] Password reset email failed for {user.email}: {e}")
            reset_token.used = 1
            db.commit()
            raise HTTPException(
                status_code=500,
                detail="Could not send the verification email. Check the server SMTP email settings.",
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
            "message": "SMTP is not configured. Use this development verification code.",
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
