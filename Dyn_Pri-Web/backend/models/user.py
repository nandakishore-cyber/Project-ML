"""
models/user.py — SQLAlchemy ORM model for the `users` table.
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    """Registered user account (customer or admin)."""

    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(100), nullable=True)
    email         = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_admin      = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    cart_items = relationship("Cart",  back_populates="user", cascade="all, delete-orphan")
    orders     = relationship("Order", back_populates="user")
