"""
services/auth_service.py — JWT creation/verification and FastAPI auth dependencies.

All JWT secrets are loaded from environment variables — never hardcoded.
Passwords are hashed with bcrypt via passlib.
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models.user import User

# ---------------------------------------------------------------------------
# Configuration — loaded from .env
# ---------------------------------------------------------------------------
JWT_SECRET_KEY  = os.getenv("JWT_SECRET_KEY", "changeme-insecure-default")
JWT_ALGORITHM   = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))

# OAuth2 scheme — clients send: Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

import bcrypt

# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored bcrypt *hashed* value."""
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_access_token(data: dict) -> str:
    """
    Sign a JWT with the given payload and a rolling expiry.

    Parameters
    ----------
    data : dict
        Arbitrary claims; should include at least ``"sub"`` (user id as str).

    Returns
    -------
    str
        Signed JWT string ready to return as Bearer token.
    """
    to_encode = data.copy()
    expire    = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """
    Decode and validate a JWT.

    Raises
    ------
    HTTPException 401
        If the token is expired, tampered, or otherwise invalid.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db:    Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency — decode JWT and return the matching User ORM object.

    Raises
    ------
    HTTPException 401
        Token invalid, expired, missing ``sub`` claim, or user not found.
    """
    payload  = verify_token(token)
    user_id  = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing user identity",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token no longer exists",
        )
    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency — same as get_current_user but also checks is_admin.

    Raises
    ------
    HTTPException 403
        If the authenticated user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
