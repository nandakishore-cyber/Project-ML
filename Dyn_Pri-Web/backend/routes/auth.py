"""
routes/auth.py — Signup and login endpoints.

POST /auth/signup  — register a new user account
POST /auth/login   — authenticate and return a JWT
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.auth import LoginRequest, SignupRequest, SignupResponse, TokenResponse
from services.auth_service import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    """
    Create a new user account.

    - Password is bcrypt-hashed before storage — plain text is never saved.
    - Returns 409 if the email is already registered.
    """
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name          = body.name,
        email         = body.email,
        password_hash = hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return SignupResponse(message="Account created successfully", user_id=user.id)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a JWT access token",
)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with email + password and return a Bearer JWT token.

    - Returns the same generic 401 for both wrong email and wrong password
      to prevent email enumeration attacks.
    - Token expires after JWT_EXPIRE_DAYS days (default: 7).
    """
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, token_type="bearer")
