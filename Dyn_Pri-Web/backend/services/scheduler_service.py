"""
services/scheduler_service.py — APScheduler configuration and shared pricing job.

The function run_pricing_job() is the SINGLE source of truth for the ML price
update logic. Both the scheduler (automated) and /admin/trigger-pricing (manual)
call this same function, guaranteeing identical behaviour.

Schedule: Monday / Wednesday / Friday at 09:00 AM server local time.
"""

import logging
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scheduler instance — started once in main.py lifespan
# ---------------------------------------------------------------------------
scheduler  = AsyncIOScheduler()
_last_run: Optional[datetime] = None    # updated after every successful job

# ---------------------------------------------------------------------------
# Core pricing job — called by scheduler wrapper AND admin route directly
# ---------------------------------------------------------------------------
def run_pricing_job(db: Session) -> dict:
    """
    Run the full ML price-update cycle for all products in the database.

    Steps
    -----
    1. Fetch all Product rows from the database.
    2. Serialize them into the dict format expected by ml.pricing_service.
    3. Call run_price_update() — the ML layer returns {id, new_price, …}.
    4. Write new prices back to products.current_price in one commit.
    5. Update _last_run timestamp.

    Parameters
    ----------
    db : Session
        SQLAlchemy session.  Caller is responsible for closing it.

    Returns
    -------
    dict
        ``updated_count``  – number of products whose price was updated
        ``results``        – raw list returned by run_price_update()
        ``triggered_at``   – ISO timestamp of this run

    Raises
    ------
    RuntimeError
        If the ML bundle is not loaded (propagated from pricing_service).
    Exception
        Any DB commit error — caller should handle appropriately.
    """
    # Lazy import so the path manipulation in main.py runs first
    from ml.pricing_service import run_price_update

    from models.product import Product   # avoid circular import at module level

    products = db.query(Product).all()
    triggered_at = datetime.now()

    if not products:
        logger.info("Pricing job: no products in database — skipping.")
        return {"updated_count": 0, "results": [], "triggered_at": triggered_at.isoformat()}

    # Build lightweight dicts for the ML layer
    product_dicts = [
        {
            "id":               p.id,
            "name":             p.name or "",
            "category":         p.category or "",
            "sub_category":     p.sub_category or "",
            "base_price":       float(p.base_price)       if p.base_price       else 0.0,
            "competitor_price": float(p.competitor_price) if p.competitor_price else 0.0,
            "demand":           p.demand   or 0,
            "rating":           float(p.rating)  if p.rating  else 3.0,
            "reviews":          p.reviews  or 0,
            "stock":            p.stock    or 0,
            "discount":         float(p.discount) if p.discount else 0.0,
        }
        for p in products
    ]

    logger.info("Pricing job: running ML update for %d products.", len(product_dicts))
    results = run_price_update(product_dicts)   # list of {id, new_price, …}

    # Build a lookup map for O(1) access
    price_map = {r["id"]: r["new_price"] for r in results}

    # Apply results back to ORM objects
    for product in products:
        if product.id in price_map:
            product.current_price     = price_map[product.id]
            product.last_price_update = triggered_at

    # Single commit for the entire batch
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Pricing job: DB commit failed — rolled back. Error: %s", exc)
        raise

    global _last_run
    _last_run = triggered_at

    logger.info(
        "Pricing job complete: %d / %d products updated.",
        len(results), len(products),
    )
    return {
        "updated_count": len(results),
        "results":       results,
        "triggered_at":  triggered_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Scheduler wrapper — creates its own DB session (not injected via DI)
# ---------------------------------------------------------------------------
def _scheduled_job() -> None:
    """Wrapper invoked by APScheduler — manages its own DB session lifecycle."""
    from database import SessionLocal   # lazy import avoids circular dep at top

    db = SessionLocal()
    try:
        run_pricing_job(db)
    except Exception as exc:
        logger.error("Scheduled pricing job failed: %s", exc)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------
def start_scheduler() -> None:
    """
    Register Mon / Wed / Fri 09:00 cron jobs and start the AsyncIOScheduler.

    Idempotent — safe to call multiple times (guards against double-start).
    """
    if scheduler.running:
        logger.info("Scheduler is already running — skipping start.")
        return

    for day in ("mon", "wed", "fri"):
        scheduler.add_job(
            _scheduled_job,
            trigger="cron",
            day_of_week=day,
            hour=9,
            minute=0,
            id=f"pricing_job_{day}",
            replace_existing=True,
        )

    scheduler.start()
    logger.info("APScheduler started — pricing jobs scheduled Mon/Wed/Fri at 09:00.")


def stop_scheduler() -> None:
    """Gracefully shut down the scheduler on application shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")


def get_next_run_time() -> Optional[str]:
    """Return the next scheduled pricing run as an ISO string, or None."""
    jobs       = scheduler.get_jobs()
    next_times = [j.next_run_time for j in jobs if j.next_run_time]
    if not next_times:
        return None
    return min(next_times).isoformat()


def get_last_run_time() -> Optional[str]:
    """Return the timestamp of the last completed pricing run, or None."""
    return _last_run.isoformat() if _last_run else None
