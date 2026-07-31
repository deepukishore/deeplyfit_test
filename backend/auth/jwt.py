from datetime import timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from utils.time import utc_now
import os

LOCAL_DEVELOPMENT_SECRET = "fittrack-local-development-only"


def get_secret_key() -> str:
    configured_secret = (os.getenv("SECRET_KEY", "") or "").strip()
    if configured_secret:
        return configured_secret

    environment = (os.getenv("ENVIRONMENT", "") or "").strip().lower()
    is_production = bool(os.getenv("RENDER")) or environment in {"production", "prod"}
    if is_production:
        raise RuntimeError("SECRET_KEY must be configured in production")

    return LOCAL_DEVELOPMENT_SECRET


SECRET_KEY = get_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = utc_now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
