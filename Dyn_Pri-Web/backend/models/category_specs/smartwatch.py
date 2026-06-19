"""
models/category_specs/smartwatch.py — Smartwatch-specific product details.
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Smartwatch(Base):
    """Extended specs for Smartwatch category products."""

    __tablename__ = "smartwatches"

    id           = Column(Integer,  primary_key=True, autoincrement=True)
    product_id   = Column(Integer,  ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True)
    brand        = Column(String(80),  nullable=True)
    display_type = Column(String(30),  nullable=True)   # e.g. "AMOLED", "LCD"
    battery_days = Column(Integer,     nullable=True)
    water_resist = Column(Boolean,     nullable=True, default=False)

    product = relationship("Product", back_populates="smartwatch_spec")
