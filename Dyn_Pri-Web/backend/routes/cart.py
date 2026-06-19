"""
routes/cart.py — Shopping cart management (auth required for all endpoints).

POST   /cart/add                    — add item (or merge quantity if already present)
GET    /cart                        — list cart with LIVE prices
PUT    /cart/update/{cart_item_id}  — update quantity
DELETE /cart/remove/{cart_item_id}  — remove item
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.cart import Cart
from models.product import Product
from models.user import User
from schemas.cart import CartAddRequest, CartItemOut, CartResponse, CartUpdateRequest
from services.auth_service import get_current_user

router = APIRouter(prefix="/cart", tags=["Cart"])


# ---------------------------------------------------------------------------
# Internal helper — assert cart item belongs to the requesting user
# ---------------------------------------------------------------------------
def _owned_cart_item(cart_item_id: int, current_user: User, db: Session) -> Cart:
    item = db.query(Cart).filter(Cart.id == cart_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this cart item",
        )
    return item


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post(
    "/add",
    status_code=status.HTTP_201_CREATED,
    summary="Add a product to the cart",
)
def add_to_cart(
    body:         CartAddRequest,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a product to the authenticated user's cart.

    - If the product is already in the cart, quantity is incremented.
    - Returns 404 if the product doesn't exist.
    - Returns 400 if the product is out of stock.
    """
    product = db.query(Product).filter(Product.id == body.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock is not None and product.stock <= 0:
        raise HTTPException(status_code=400, detail="Product is out of stock")

    # Merge into existing cart row if present
    existing = (
        db.query(Cart)
        .filter(Cart.user_id == current_user.id, Cart.product_id == body.product_id)
        .first()
    )
    if existing:
        existing.quantity += body.quantity
        db.commit()
        return {"message": "Cart quantity updated", "cart_item_id": existing.id}

    cart_item = Cart(
        user_id    = current_user.id,
        product_id = body.product_id,
        quantity   = body.quantity,
    )
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return {"message": "Item added to cart", "cart_item_id": cart_item.id}


@router.get(
    "/",
    response_model=CartResponse,
    summary="View the current user's cart with live prices",
)
def get_cart(
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all cart items with LIVE prices fetched from the products table.

    Prices shown here always reflect the most recent ML update — they are
    NOT cached from when the item was added.
    """
    items = db.query(Cart).filter(Cart.user_id == current_user.id).all()

    cart_items: list[CartItemOut] = []
    total = 0.0

    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue  # product was deleted — skip silently
        price = float(product.current_price) if product.current_price else 0.0
        cart_items.append(
            CartItemOut(
                id            = item.id,
                product_id    = item.product_id,
                product_name  = product.name,
                current_price = price,
                quantity      = item.quantity,
                added_at      = item.added_at,
            )
        )
        total += price * item.quantity

    return CartResponse(items=cart_items, total=round(total, 2))


@router.put(
    "/update/{cart_item_id}",
    summary="Update the quantity of a cart item",
)
def update_cart_item(
    cart_item_id: int,
    body:         CartUpdateRequest,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Set a new quantity for the given cart item.

    - Returns 403 if the item does not belong to the current user.
    - Quantity must be >= 1 (enforced by schema validator).
    """
    item = _owned_cart_item(cart_item_id, current_user, db)
    item.quantity = body.quantity
    db.commit()
    return {"message": "Cart item updated"}


@router.delete(
    "/remove/{cart_item_id}",
    summary="Remove an item from the cart",
)
def remove_cart_item(
    cart_item_id: int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove a cart item by id.

    - Returns 403 (not 404) if the item belongs to a different user, to
      avoid leaking the existence of other users' cart items.
    """
    item = _owned_cart_item(cart_item_id, current_user, db)
    db.delete(item)
    db.commit()
    return {"message": "Item removed from cart"}
