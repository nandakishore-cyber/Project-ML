"""
models/__init__.py

Import all ORM model classes so that SQLAlchemy's metadata registry is
complete when main.py calls Base.metadata.create_all(). Without this,
tables whose models haven't been imported won't be created.
"""

from .cart import Cart
from .category_specs.camera import Camera
from .category_specs.earphones import Earphones
from .category_specs.laptop import Laptop
from .category_specs.mobile import Mobile
from .category_specs.smartwatch import Smartwatch
from .category_specs.television import Television
from .order import Order
from .order_item import OrderItem
from .product import Product
from .user import User

__all__ = [
    "User",
    "Product",
    "Cart",
    "Order",
    "OrderItem",
    "Laptop",
    "Mobile",
    "Television",
    "Earphones",
    "Smartwatch",
    "Camera",
]
