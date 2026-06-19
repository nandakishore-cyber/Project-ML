"""
models/cart.py — SQLAlchemy ORM model for the `cart` table.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Cart(Base):
    """Shopping cart item — one row per (user, product) pair."""

    __tablename__ = "cart"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity   = Column(Integer, default=1, nullable=False)
    added_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Prevent duplicate cart entries for the same user + product
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
    )

    # Relationships
    user    = relationship("User",    back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")
