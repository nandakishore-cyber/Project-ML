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
from models.order_item import OrderItem
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


from datetime import datetime

def update_product_price(product, db: Session):
    try:
        from ml.pricing_service import predict_price, build_product_input
        p_dict = {
            "category":         product.category or "",
            "sub_category":     product.sub_category or "",
            "base_price":       float(product.base_price)       if product.base_price       else 0.0,
            "competitor_price": float(product.competitor_price) if product.competitor_price else 0.0,
            "demand":           product.demand   or 0,
            "rating":           float(product.rating)           if product.rating           else 3.0,
            "reviews":          product.reviews  or 0,
            "stock":            product.stock    or 0,
            "discount":         float(product.discount)         if product.discount         else 0.0,
        }
        enriched = build_product_input(p_dict)
        pred = predict_price(enriched)
        product.current_price = pred["new_price"]
        product.last_price_update = datetime.now()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"ML price prediction failed: {exc}")
        product.current_price = product.base_price
        product.last_price_update = datetime.now()


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


@router.post(
    "/predict-price",
    summary="Predict optimized price for given product parameters (without saving)",
)
def predict_price_endpoint(
    body:  dict,
    admin: User = Depends(get_admin_user),
):
    """
    Run the ML model on any set of product parameters and return the
    predicted optimal price. Does NOT save anything to the database.
    Use this for the interactive Price Simulator on the admin dashboard.

    Expected body fields:
        category, sub_category, base_price, competitor_price,
        demand, stock, rating, reviews, discount
    """
    try:
        from ml.pricing_service import predict_price, build_product_input
        enriched = build_product_input({
            "category":         body.get("category", "Mobile Phone"),
            "sub_category":     body.get("sub_category", "Budget"),
            "base_price":       float(body.get("base_price", 0)),
            "competitor_price": float(body.get("competitor_price", 0)),
            "demand":           int(body.get("demand", 50)),
            "stock":            int(body.get("stock", 100)),
            "rating":           float(body.get("rating", 4.0)),
            "reviews":          int(body.get("reviews", 100)),
            "discount":         float(body.get("discount", 0)),
        })
        result = predict_price(enriched)
        return {
            "optimized_price":  result["new_price"],
            "segment":          result["segment"],
            "raw_prediction":   round(result["raw_prediction"], 2),
            "price_cap":        round(result["price_cap"], 2),
            "season_detected":  enriched["season"],
            "day_detected":     enriched["day_of_week"],
        }
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=f"No ML model for this segment: {exc}")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")


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
    update_product_price(product, db)
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

    updated_fields = body.model_dump(exclude_unset=True)
    for field, value in updated_fields.items():
        setattr(product, field, value)

    # Only re-run ML pricing if the admin did NOT explicitly set current_price.
    # When admin uses the Price Simulator and clicks "Apply & Save", we respect
    # their chosen price exactly — no re-prediction on top of it.
    if "current_price" not in updated_fields:
        update_product_price(product, db)

    db.commit()
    return {"message": "Product updated successfully", "current_price": float(product.current_price)}


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
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.created_at.desc())
        .all()
    )
