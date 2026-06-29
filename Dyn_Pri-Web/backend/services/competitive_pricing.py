"""
services/competitive_pricing.py — Competitive dynamic pricing engine.

When a product is ordered, this service finds all other products in the
same category (competitors) and applies mild downward price pressure to
them, simulating real-world competitive market dynamics.

Flow
----
1. For each ordered product, query all OTHER products in the same category.
2. Apply mild signal adjustments to each competitor:
   - demand            → reduced by 3–5  (ordered product "stole" demand)
   - discount          → increased by 1–3%  (competitor needs to attract buyers)
   - competitor_price  → reduced by 1–2%  (market pressure response)
3. Re-run the XGBoost ML model (xgb_pricing_bundle.pkl) via pricing_service
   to produce a new ML-predicted current_price for each competitor.
4. Persist all changes to the database in a single commit.

Uses the same predict_price() and build_product_input() functions used
by the admin trigger and the APScheduler — guaranteeing consistent
ML-driven pricing across all code paths.
"""

import logging
import random
from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Adjustment ranges — kept deliberately mild to avoid wild swings
# ---------------------------------------------------------------------------
_DEMAND_DROP_RANGE    = (3, 6)       # integer units subtracted from demand
_DISCOUNT_BUMP_RANGE  = (1.0, 3.0)  # percentage points added to discount
_COMP_PRICE_CUT_RANGE = (0.01, 0.02) # fraction of competitor_price to subtract


def _build_product_dict(product) -> dict:
    """Serialize a Product ORM object into the dict format the ML layer expects."""
    return {
        "id":               product.id,
        "name":             product.name or "",
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


def adjust_competitor_prices(ordered_product_ids: List[int], db: Session) -> int:
    """
    Adjust prices of competitor products after an order is placed.

    For every product that was just ordered, locate all other products in
    the same category and apply mild competitive adjustments, then re-run
    the XGBoost model to recompute their current_price.

    Parameters
    ----------
    ordered_product_ids : List[int]
        IDs of products that were in the order just placed.
    db : Session
        Active SQLAlchemy session (caller keeps ownership; no commit here).

    Returns
    -------
    int
        Number of competitor products whose prices were updated.
    """
    from ml.pricing_service import predict_price, build_product_input
    from models.product import Product

    if not ordered_product_ids:
        return 0

    # Fetch the ordered products to know their categories
    ordered_products = (
        db.query(Product)
        .filter(Product.id.in_(ordered_product_ids))
        .all()
    )

    if not ordered_products:
        logger.warning("competitive_pricing: no products found for ids %s", ordered_product_ids)
        return 0

    # Collect the unique categories that were ordered
    ordered_categories = {p.category for p in ordered_products}
    logger.info(
        "competitive_pricing: order triggered for categories %s — scanning competitors.",
        ordered_categories,
    )

    updated_count = 0

    for category in ordered_categories:
        # Find all products in the same category that were NOT ordered
        competitors = (
            db.query(Product)
            .filter(
                Product.category == category,
                ~Product.id.in_(ordered_product_ids),
            )
            .all()
        )

        if not competitors:
            logger.info("competitive_pricing: no competitors found for category '%s'.", category)
            continue

        logger.info(
            "competitive_pricing: found %d competitor(s) in category '%s'.",
            len(competitors), category,
        )

        for comp in competitors:
            try:
                # ── 1. Apply mild competitive adjustments ────────────────────
                demand_drop    = random.randint(*_DEMAND_DROP_RANGE)
                discount_bump  = round(random.uniform(*_DISCOUNT_BUMP_RANGE), 2)
                comp_price_cut = random.uniform(*_COMP_PRICE_CUT_RANGE)

                old_demand    = comp.demand or 0
                old_discount  = float(comp.discount or 0)
                old_comp_price = float(comp.competitor_price or comp.base_price)

                new_demand    = max(0, old_demand - demand_drop)
                new_discount  = min(50.0, old_discount + discount_bump)   # cap at 50%
                new_comp_price = round(old_comp_price * (1.0 - comp_price_cut), 2)

                comp.demand           = new_demand
                comp.discount         = new_discount
                comp.competitor_price = new_comp_price

                # Also mildly decrease base_price to reflect sustained market drop
                old_base = float(comp.base_price or 0)
                base_drop_pct = comp_price_cut * 0.5   # half of competitor drop
                new_base = round(old_base * (1.0 - base_drop_pct), 2)
                comp.base_price = new_base

                # ── 2. Re-run ML model with updated signals ──────────────────
                product_dict = _build_product_dict(comp)
                enriched     = build_product_input(product_dict)
                prediction   = predict_price(enriched)

                new_price = prediction["new_price"]
                comp.current_price     = new_price
                comp.last_price_update = datetime.now()

                logger.info(
                    "competitive_pricing: '%s' [id=%d] → "
                    "demand %d→%d | discount %.1f%%→%.1f%% | "
                    "base ₹%.0f→₹%.0f | price ₹%.0f→₹%.0f",
                    comp.name, comp.id,
                    old_demand, new_demand,
                    old_discount, new_discount,
                    old_base, new_base,
                    float(comp.competitor_price), new_price,
                )
                updated_count += 1

            except Exception as exc:
                logger.warning(
                    "competitive_pricing: skipped '%s' [id=%d] — %s: %s",
                    comp.name, comp.id, type(exc).__name__, exc,
                )
                # Roll back ORM changes on this object to avoid dirty state
                db.expunge(comp)

    logger.info(
        "competitive_pricing: updated %d competitor product(s) across %d category/ies.",
        updated_count, len(ordered_categories),
    )
    return updated_count
