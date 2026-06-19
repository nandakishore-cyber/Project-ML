"""
models/product.py — SQLAlchemy ORM model for the `products` master table.

Every product the ML model can price lives here. The ML service reads
base_price, competitor_price, demand, stock, rating, reviews, discount
and writes back current_price + last_price_update.
"""

from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Product(Base):
    """Master product catalogue — ML writes current_price here."""

    __tablename__ = "products"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    name              = Column(String(150), nullable=False)
    category          = Column(String(50),  nullable=False)   # "Mobile Phone", "Laptop" …
    sub_category      = Column(String(20),  nullable=False)   # "Budget" | "Mid" | "Premium"

    # Pricing columns
    base_price        = Column(Numeric(10, 2), nullable=False)  # original / reference price
    current_price     = Column(Numeric(10, 2), nullable=True)   # ML writes here
    competitor_price  = Column(Numeric(10, 2), nullable=True)

    # ML signal columns
    demand            = Column(Integer,        nullable=True, default=0)
    stock             = Column(Integer,        nullable=True, default=0)
    rating            = Column(Numeric(3, 1),  nullable=True, default=0)
    reviews           = Column(Integer,        nullable=True, default=0)
    discount          = Column(Numeric(5, 2),  nullable=True, default=0)
    season            = Column(String(20),     nullable=True, default="Normal")

    # Display
    image_url         = Column(Text, nullable=True)

    # Timestamps
    last_price_update = Column(DateTime(timezone=True), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships — cart + order history
    cart_items  = relationship("Cart",      back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")

    # Category spec tables (one-to-one, optional)
    laptop_spec     = relationship("Laptop",      back_populates="product", uselist=False, cascade="all, delete-orphan")
    mobile_spec     = relationship("Mobile",      back_populates="product", uselist=False, cascade="all, delete-orphan")
    tv_spec         = relationship("Television",  back_populates="product", uselist=False, cascade="all, delete-orphan")
    earphones_spec  = relationship("Earphones",   back_populates="product", uselist=False, cascade="all, delete-orphan")
    smartwatch_spec = relationship("Smartwatch",  back_populates="product", uselist=False, cascade="all, delete-orphan")
    camera_spec     = relationship("Camera",      back_populates="product", uselist=False, cascade="all, delete-orphan")
