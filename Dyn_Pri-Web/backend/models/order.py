"""
models/order.py — SQLAlchemy ORM model for the `orders` table.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Order(Base):
    """Customer order header — line items live in order_items."""

    __tablename__ = "orders"

    id                 = Column(Integer,      primary_key=True, autoincrement=True)
    user_id            = Column(Integer,      ForeignKey("users.id"), nullable=False)
    total_amount       = Column(Numeric(10, 2), nullable=False)
    status             = Column(String(30),   nullable=False, default="Placed")
    delivery_address   = Column(Text,         nullable=True)
    created_at         = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user  = relationship("User",      back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
