"""
schemas/order.py — Pydantic schemas for order endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PlaceOrderRequest(BaseModel):
    delivery_address:  str


class OrderItemOut(BaseModel):
    id:                int
    product_id:        int
    quantity:          int
    price_at_purchase: float

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    id:                int
    total_amount:      float
    status:            str
    delivery_address:  Optional[str]      = None
    created_at:        Optional[datetime] = None
    items:             list[OrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)


class PlaceOrderResponse(BaseModel):
    order_id:     int
    total_amount: float
    status:       str
