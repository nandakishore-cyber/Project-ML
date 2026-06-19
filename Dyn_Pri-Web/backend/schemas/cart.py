"""
schemas/cart.py — Pydantic schemas for cart endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class CartAddRequest(BaseModel):
    product_id: int
    quantity:   int = 1

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class CartUpdateRequest(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class CartItemOut(BaseModel):
    """One cart row with LIVE product price and name joined in."""
    id:            int
    product_id:    int
    product_name:  Optional[str]      = None
    current_price: float
    quantity:      int
    added_at:      Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    """Full cart with calculated total."""
    items: list[CartItemOut]
    total: float
