"""
routes/admin.py — Admin-only endpoints (is_admin = True required).

POST   /admin/trigger-pricing          — manual ML price update
GET    /admin/pricing-status           — scheduler info
GET    /admin/products                 — all products
POST   /admin/products                 — create product + spec row
PUT    /admin/products/{product_id}    — update product fields
DELETE /admin/products/{product_id}    — delete product (cascades)
GET    /admin/orders                   — all orders across all users
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.category_specs.camera import Camera
from models.category_specs.earphones import Earphones
from models.category_specs.laptop import Laptop
from models.category_specs.mobile import Mobile
from models.category_specs.smartwatch import Smartwatch
from models.category_specs.television import Television
from models.order import Order
from models.product import Product
from models.user import User
from schemas.order import OrderOut
from schemas.product import ProductCreate, ProductOut, ProductUpdate
from services.auth_service import get_admin_user
from services.scheduler_service import (
    get_last_run_time,
    get_next_run_time,
    run_pricing_job,
)

router = APIRouter(prefix="/admin", tags=["Admin"])

# Maps category string → spec ORM model
_SPEC_MAP: dict[str, Any] = {
    "Mobile Phone": Mobile,
    "Laptop":       Laptop,
    "Television":   Television,
    "Earphones":    Earphones,
    "Smartwatch":   Smartwatch,
    "Camera":       Camera,
}

VALID_CATEGORIES = frozenset(_SPEC_MAP.keys())


# ---------------------------------------------------------------------------
# ML pricing endpoints
# ---------------------------------------------------------------------------
@router.post(
    "/trigger-pricing",
    summary="Manually trigger an ML price update for all products",
)
def trigger_pricing(
    db:    Session = Depends(get_db),
    admin: User    = Depends(get_admin_user),
):
    """
    Run the ML pricing job immediately (same logic as the scheduler).

    Returns the number of updated products and the full result list.
    Returns 503 if the ML bundle is not loaded.
    """
    try:
        return run_pricing_job(db)
    except RuntimeError as exc:
        # ML bundle not available
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pricing job error: {exc}")


@router.get(
    "/pricing-status",
    summary="Get scheduler status and product count",
)
def pricing_status(
    db:    Session = Depends(get_db),
    admin: User    = Depends(get_admin_user),
):
    """Return last run time, next scheduled run, and total product count."""
    return {
        "last_run":           get_last_run_time(),
        "next_scheduled_run": get_next_run_time(),
        "total_products":     db.query(Product).count(),
    }


# ---------------------------------------------------------------------------
# Product CRUD
# ---------------------------------------------------------------------------
@router.get(
    "/products",
    response_model=list[ProductOut],
    summary="Get all products (admin view)",
)
def admin_get_products(
    db:    Session = Depends(get_db),
    admin: User    = Depends(get_admin_user),
):
    """Return every product in the catalogue."""
    return db.query(Product).all()


@router.post(
    "/products",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product with category spec",
)
def admin_create_product(
    body:  ProductCreate,
    db:    Session = Depends(get_db),
    admin: User    = Depends(get_admin_user),
):
    """
    Create a product row and the corresponding category spec row in one transaction.

    The ``spec`` field in the request body should contain the spec columns for
    the given category (e.g. ``brand``, ``ram_gb`` for Laptop).
    """
    if body.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown category '{body.category}'. "
                   f"Valid: {sorted(VALID_CATEGORIES)}",
        )

    product = Product(
        name             = body.name,
        category         = body.category,
        sub_category     = body.sub_category,
        base_price       = body.base_price,
        current_price    = body.current_price,
        competitor_price = body.competitor_price,
        demand           = body.demand,
        stock            = body.stock,
        rating           = body.rating,
        reviews          = body.reviews,
        discount         = body.discount,
        season           = body.season,
        image_url        = body.image_url,
    )
    db.add(product)
    db.flush()   # get product.id before committing

    # Create spec row in the appropriate table
    spec_model  = _SPEC_MAP[body.category]
    spec_fields = body.spec or {}
    spec_row    = spec_model(product_id=product.id, **spec_fields)
    db.add(spec_row)

    db.commit()
    db.refresh(product)
    return {"product_id": product.id, "message": "Product created successfully"}


@router.put(
    "/products/{product_id}",
    summary="Update product fields",
)
def admin_update_product(
    product_id: int,
    body:       ProductUpdate,
    db:         Session = Depends(get_db),
    admin:      User    = Depends(get_admin_user),
):
    """Partially update a product.  Only fields present in the body are changed."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    return {"message": "Product updated successfully"}


@router.delete(
    "/products/{product_id}",
    summary="Delete a product (cascades to spec + cart + order_items)",
)
def admin_delete_product(
    product_id: int,
    db:         Session = Depends(get_db),
    admin:      User    = Depends(get_admin_user),
):
    """
    Delete a product by id.

    Cascades: the spec row (all 6 spec tables have ON DELETE CASCADE),
    and any cart rows referencing this product are also deleted by the FK.
    Historical order_items are NOT deleted (important for order history integrity).
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": f"Product {product_id} deleted successfully"}


# ---------------------------------------------------------------------------
# Order management
# ---------------------------------------------------------------------------
@router.get(
    "/orders",
    response_model=list[OrderOut],
    summary="Get all orders across all users",
)
def admin_get_orders(
    db:    Session = Depends(get_db),
    admin: User    = Depends(get_admin_user),
):
    """Return every order in the system, newest first."""
    return (
        db.query(Order)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )
