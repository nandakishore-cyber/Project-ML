"""
routes/products.py — Public product browsing endpoints.

GET /products                        — list all products (filterable)
GET /products/category/{name}        — all products in a category
GET /products/{product_id}           — full product detail + spec table
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.category_specs.camera import Camera
from models.category_specs.earphones import Earphones
from models.category_specs.laptop import Laptop
from models.category_specs.mobile import Mobile
from models.category_specs.smartwatch import Smartwatch
from models.category_specs.television import Television
from models.product import Product
from schemas.product import ProductDetailOut, ProductOut

router = APIRouter(prefix="/products", tags=["Products"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
VALID_CATEGORIES = frozenset({
    "Mobile Phone", "Laptop", "Television", "Earphones", "Smartwatch", "Camera",
})

# Maps category name → spec ORM model
CATEGORY_SPEC_MAP: dict[str, Any] = {
    "Mobile Phone": Mobile,
    "Laptop":       Laptop,
    "Television":   Television,
    "Earphones":    Earphones,
    "Smartwatch":   Smartwatch,
    "Camera":       Camera,
}


# ---------------------------------------------------------------------------
# Internal helper — fetch spec row and convert to plain dict
# ---------------------------------------------------------------------------
def _get_spec_dict(product: Product, db: Session) -> Optional[dict]:
    """
    Query the appropriate spec table for the given product and return a dict.

    Returns None if the category is unknown or no spec row exists yet.
    """
    spec_model = CATEGORY_SPEC_MAP.get(product.category)
    if not spec_model:
        return None

    spec = db.query(spec_model).filter(spec_model.product_id == product.id).first()
    if not spec:
        return None

    # Exclude FK and PK columns from the dict
    return {
        col.name: getattr(spec, col.name)
        for col in spec.__table__.columns
        if col.name not in ("id", "product_id")
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=list[ProductOut],
    summary="List all products",
)
def list_products(
    category:     Optional[str] = None,
    sub_category: Optional[str] = None,
    db:           Session = Depends(get_db),
):
    """
    Return all products.  Optionally filter by ``category`` and / or
    ``sub_category`` query parameters.  No authentication required.
    """
    q = db.query(Product)
    if category:
        q = q.filter(Product.category == category)
    if sub_category:
        q = q.filter(Product.sub_category == sub_category)
    return q.all()


@router.get(
    "/category/{category_name}",
    response_model=list[ProductOut],
    summary="List products by category",
)
def products_by_category(category_name: str, db: Session = Depends(get_db)):
    """
    Return all products in *category_name*.

    Valid categories: Mobile Phone, Laptop, Television, Earphones, Smartwatch, Camera.
    Returns 404 for unknown category names.
    """
    if category_name not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category_name}' not found. "
                   f"Valid categories: {sorted(VALID_CATEGORIES)}",
        )
    return db.query(Product).filter(Product.category == category_name).all()


@router.get(
    "/{product_id}",
    response_model=ProductDetailOut,
    summary="Get full product detail with spec",
)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """
    Return a single product including its category-specific spec data.

    - ``spec`` will be ``null`` if no spec row exists (data not yet populated).
    - Returns 404 if the product id does not exist.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    spec = _get_spec_dict(product, db)

    # Build a dict so we can inject the spec field for Pydantic validation
    product_data = {
        col.name: getattr(product, col.name)
        for col in product.__table__.columns
    }
    product_data["spec"] = spec
    return product_data
