"""
models/category_specs/mobile.py — Mobile Phone-specific product details.
"""

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Mobile(Base):
    """Extended specs for Mobile Phone category products."""

    __tablename__ = "mobiles"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    product_id  = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True)
    brand       = Column(String(80),  nullable=True)
    processor   = Column(String(100), nullable=True)
    ram_gb      = Column(Integer,     nullable=True)
    storage_gb  = Column(Integer,     nullable=True)
    battery_mah = Column(Integer,     nullable=True)
    camera_mp   = Column(Integer,     nullable=True)

    product = relationship("Product", back_populates="mobile_spec")
