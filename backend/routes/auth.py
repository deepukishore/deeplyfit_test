from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User, PasswordResetToken
from schemas import UserCreate, UserLogin, Token, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from auth.jwt import verify_password, get_password_hash, create_access_token, decode_token
from utils.profile import ensure_unique_public_slug
import secrets
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
import os

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def is_smtp_configured(smtp_user: str, smtp_pass: str) -> bool:
    placeholder_values = {
        "",
        "your_gmail@gmail.com",
        "your_app_password",
        "your-email@gmail.com",
        "your-password",
    }
    return smtp_user.strip() not in placeholder_values and smtp_pass.strip() not in placeholder_values


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
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = get_password_hash(user_data.password)
        user = User(
            email=user_data.email,
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
        user = db.query(User).filter(User.email == user_data.email).first()
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
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Return success anyway to avoid email enumeration
        return {"message": "If that email exists, a reset link has been sent."}

    # Invalidate old tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == 0
    ).update({"used": 1})

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires)
    db.add(reset_token)
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = first_configured_value(os.getenv("SMTP_USER", ""), os.getenv("MAIL_USERNAME", "deepu004.dk@gmail.com"))
    smtp_pass = first_configured_value(os.getenv("SMTP_PASS", ""), os.getenv("MAIL_PASSWORD", "sjhd dofp hzof qpou"))
    smtp_sender = first_configured_value(os.getenv("SMTP_SENDER", ""), os.getenv("MAIL_DEFAULT_SENDER", "deepu004.dk@gmail.com"), smtp_user)

    if is_smtp_configured(smtp_user, smtp_pass):
        try:
            body = f"""Hi {user.name or 'there'},

You requested a password reset for your Deeply Fit account.

Click the link below to reset your password (valid for 1 hour):
{reset_url}

If you didn't request this, ignore this email.

-- Deeply Fit Team"""
            msg = MIMEText(body)
            msg["Subject"] = "Reset your Deeply Fit password"
            msg["From"] = smtp_sender
            msg["To"] = user.email
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_sender, user.email, msg.as_string())
        except Exception as e:
            print(f"[SMTP] Password reset email failed for {user.email}: {e}")
            raise HTTPException(
                status_code=500,
                detail="Could not send the reset email. Check the server SMTP email settings.",
            )
    else:
        print(f"[DEV] Password reset link for {user.email}: {reset_url}")
        return {
            "message": "SMTP is not configured. Use this development reset link.",
            "reset_url": reset_url,
        }

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token,
        PasswordResetToken.used == 0
    ).first()

    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(data.new_password)
    record.used = 1
    db.commit()

    return {"message": "Password updated successfully"}
