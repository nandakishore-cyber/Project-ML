"""
models/category_specs/television.py — Television-specific product details.
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from database import Base


class Television(Base):
    """Extended specs for Television category products."""

    __tablename__ = "televisions"

    id          = Column(Integer,      primary_key=True, autoincrement=True)
    product_id  = Column(Integer,      ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True)
    brand       = Column(String(80),   nullable=True)
    screen_inch = Column(Numeric(4,1), nullable=True)
    resolution  = Column(String(20),   nullable=True)   # e.g. "4K", "1080p"
    panel_type  = Column(String(30),   nullable=True)   # e.g. "OLED", "QLED", "LED"
    smart_tv    = Column(Boolean,      nullable=True, default=False)

    product = relationship("Product", back_populates="tv_spec")
