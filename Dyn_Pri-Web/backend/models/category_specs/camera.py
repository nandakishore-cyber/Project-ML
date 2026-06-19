"""
models/category_specs/camera.py — Camera-specific product details.
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Camera(Base):
    """Extended specs for Camera category products."""

    __tablename__ = "cameras"

    id          = Column(Integer,   primary_key=True, autoincrement=True)
    product_id  = Column(Integer,   ForeignKey("products.id", ondelete="CASCADE"), nullable=False, unique=True)
    brand       = Column(String(80),  nullable=True)
    megapixels  = Column(Integer,     nullable=True)
    sensor_type = Column(String(50),  nullable=True)   # e.g. "Full-frame", "APS-C"
    video_4k    = Column(Boolean,     nullable=True, default=False)
    lens_mount  = Column(String(30),  nullable=True)   # e.g. "E-mount", "RF"

    product = relationship("Product", back_populates="camera_spec")
