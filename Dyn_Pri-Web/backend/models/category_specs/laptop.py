"""
models/category_specs/laptop.py — Laptop-specific product details.
"""

from sqlalchemy import Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from database import Base


class Laptop(Base):
    """Extended specs for Laptop category products."""

    __tablename__ = "laptops"

    id            = Column(Integer,      primary_key=True, autoincrement=True)
    product_id    = Column(Integer,      ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True)
    brand         = Column(String(80),   nullable=True)
    processor     = Column(String(100),  nullable=True)
    ram_gb        = Column(Integer,      nullable=True)
    storage_gb    = Column(Integer,      nullable=True)
    display_inch  = Column(Numeric(4,1), nullable=True)
    os            = Column(String(50),   nullable=True)

    product = relationship("Product", back_populates="laptop_spec")
