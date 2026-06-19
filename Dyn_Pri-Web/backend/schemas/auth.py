"""
schemas/auth.py — Pydantic schemas for authentication endpoints.
"""

from pydantic import BaseModel, EmailStr, field_validator


class SignupRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class SignupResponse(BaseModel):
    message: str
    user_id: int


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
