"""
models/order_item.py — SQLAlchemy ORM model for the `order_items` table.

price_at_purchase is captured as a SNAPSHOT of current_price at the exact
moment the order is placed. It must never be recalculated later.
"""

from sqlalchemy import Column, ForeignKey, Integer, Numeric
from sqlalchemy.orm import relationship

from database import Base


class OrderItem(Base):
    """One line item in an order — price locked at time of purchase."""

    __tablename__ = "order_items"

    id                = Column(Integer,      primary_key=True, autoincrement=True)
    order_id          = Column(Integer,      ForeignKey("orders.id",   ondelete="CASCADE"), nullable=False)
    product_id        = Column(Integer,      ForeignKey("products.id"), nullable=False)
    quantity          = Column(Integer,      nullable=False)
    price_at_purchase = Column(Numeric(10, 2), nullable=False)  # LIVE price snapshot

    # Relationships
    order   = relationship("Order",   back_populates="items")
    product = relationship("Product", back_populates="order_items")
