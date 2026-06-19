"""
models/category_specs/earphones.py — Earphones-specific product details.
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Earphones(Base):
    """Extended specs for Earphones category products."""

    __tablename__ = "earphones"

    id          = Column(Integer,   primary_key=True, autoincrement=True)
    product_id  = Column(Integer,   ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True)
    brand       = Column(String(80),  nullable=True)
    type        = Column(String(30),  nullable=True)   # "In-ear" | "Over-ear" | "On-ear"
    wireless    = Column(Boolean,     nullable=True, default=False)
    battery_hrs = Column(Integer,     nullable=True)

    product = relationship("Product", back_populates="earphones_spec")
