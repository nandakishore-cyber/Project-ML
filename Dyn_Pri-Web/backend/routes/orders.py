"""
routes/orders.py — Order placement and retrieval (auth required).

POST  /orders/place      — place order from cart (atomic transaction)
GET   /orders            — list all orders for the current user
GET   /orders/{order_id} — full order detail (user can only see own orders)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.cart import Cart
from models.order import Order
from models.order_item import OrderItem
from models.product import Product
from models.user import User
from schemas.order import OrderOut, PlaceOrderRequest, PlaceOrderResponse
from services.auth_service import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "/place",
    response_model=PlaceOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Place an order from the current cart (atomic transaction)",
)
def place_order(
    body:         PlaceOrderRequest,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Convert the user's cart into a confirmed order.

    Transaction steps (all-or-nothing):
    1. Read current cart items.
    2. Snapshot ``current_price`` into ``price_at_purchase`` for each item.
    3. Create the Order row.
    4. Create all OrderItem rows.
    5. Delete all cart rows for this user.
    6. Commit — if anything raises, the whole transaction is rolled back.

    Returns 400 if the cart is empty.
    """
    cart_items = (
        db.query(Cart)
        .filter(Cart.user_id == current_user.id)
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    try:
        order_item_data = []
        total = 0.0

        for cart_item in cart_items:
            product = db.query(Product).filter(Product.id == cart_item.product_id).first()
            if not product:
                # Product was deleted after it was added to cart — skip it
                continue

            # ── LIVE price snapshot — captured at this exact moment ──────────
            price = float(product.current_price) if product.current_price else 0.0
            total += price * cart_item.quantity

            order_item_data.append({
                "product_id":        product.id,
                "quantity":          cart_item.quantity,
                "price_at_purchase": price,
            })

        if not order_item_data:
            raise HTTPException(
                status_code=400,
                detail="None of the cart items could be fulfilled (products may have been removed)",
            )

        # Create the order header
        order = Order(
            user_id           = current_user.id,
            total_amount      = round(total, 2),
            status            = "Placed",
            delivery_address  = body.delivery_address,
        )
        db.add(order)
        db.flush()  # reserve order.id without committing

        # Insert all order line items
        for oi in order_item_data:
            db.add(
                OrderItem(
                    order_id          = order.id,
                    product_id        = oi["product_id"],
                    quantity          = oi["quantity"],
                    price_at_purchase = oi["price_at_purchase"],
                )
            )

        # Clear the user's cart
        for cart_item in cart_items:
            db.delete(cart_item)

        # ── Single commit — if this fails, everything above is rolled back ──
        db.commit()
        db.refresh(order)

        return PlaceOrderResponse(
            order_id     = order.id,
            total_amount = float(order.total_amount),
            status       = order.status,
        )

    except HTTPException:
        raise   # let FastAPI handle HTTP exceptions normally
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Order placement failed due to an internal error: {exc}",
        )


@router.get(
    "/",
    response_model=list[OrderOut],
    summary="List all orders for the current user",
)
def get_orders(
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all orders belonging to the authenticated user, newest first."""
    return (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get(
    "/{order_id}",
    response_model=OrderOut,
    summary="Get full order detail",
)
def get_order(
    order_id:     int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return a single order with all its line items.

    - Returns 404 if the order doesn't exist.
    - Returns 403 if the order belongs to a different user.
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorised to view this order",
        )
    return order
