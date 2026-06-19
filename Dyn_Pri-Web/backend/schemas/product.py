"""
schemas/product.py — Pydantic schemas for product endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Shared base
# ---------------------------------------------------------------------------
class ProductBase(BaseModel):
    name:             str
    category:         str
    sub_category:     str
    base_price:       float
    current_price:    float
    competitor_price: float
    demand:           int
    stock:            int
    rating:           float
    reviews:          int
    discount:         float
    season:           str
    image_url:        Optional[str] = None


# ---------------------------------------------------------------------------
# Input schemas (admin only)
# ---------------------------------------------------------------------------
class ProductCreate(ProductBase):
    """Create a new product + optional category spec dict."""
    spec: Optional[dict[str, Any]] = None


class ProductUpdate(BaseModel):
    """All fields optional — only supplied fields are updated (PATCH semantics)."""
    name:             Optional[str]   = None
    category:         Optional[str]   = None
    sub_category:     Optional[str]   = None
    base_price:       Optional[float] = None
    current_price:    Optional[float] = None
    competitor_price: Optional[float] = None
    demand:           Optional[int]   = None
    stock:            Optional[int]   = None
    rating:           Optional[float] = None
    reviews:          Optional[int]   = None
    discount:         Optional[float] = None
    season:           Optional[str]   = None
    image_url:        Optional[str]   = None


# ---------------------------------------------------------------------------
# Output schemas
# ---------------------------------------------------------------------------
class ProductOut(ProductBase):
    """Basic product list / card response."""
    id:                int
    last_price_update: Optional[datetime] = None
    created_at:        Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductDetailOut(ProductOut):
    """Full product detail including category-specific spec data."""
    spec: Optional[dict[str, Any]] = None
