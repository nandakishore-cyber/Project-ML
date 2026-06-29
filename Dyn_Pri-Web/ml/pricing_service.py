"""
=============================================================================
  Dynamic Pricing — Inference Service  (ml/pricing_service.py)
=============================================================================
  Loads the pre-trained XGBoost bundle (xgb_pricing_bundle.pkl) ONCE at
  module import time and exposes run_price_update() as the primary FastAPI
  entrypoint.

  Responsibilities
  ----------------
  • Load bundle at startup (never reload on each request)
  • Auto-inject real-time season / day-of-week into every product record
  • Predict an optimal price using the correct per-segment XGBoost model
  • Apply the 25 % price cap and psychological pricing (nearest ₹50 − ₹1)
  • Return structured results; log and skip any product that fails

  Non-responsibilities
  --------------------
  • Does NOT retrain models
  • Does NOT read from the database (FastAPI handles that)
  • Does NOT write prices back to the database (FastAPI handles that)
=============================================================================
"""

import logging
import os
import pickle
from datetime import datetime

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1.  Bundle Loader — executed ONCE when the module is first imported
# ---------------------------------------------------------------------------
_BUNDLE_PATH: str = os.path.join(os.path.dirname(__file__), "xgb_pricing_bundle.pkl")
_BUNDLE: dict | None = None

try:
    with open(_BUNDLE_PATH, "rb") as _f:
        _BUNDLE = pickle.load(_f)
    logger.info(
        "Bundle loaded: %d segment models from '%s'.",
        len(_BUNDLE.get("models", {})),
        _BUNDLE_PATH,
    )
except FileNotFoundError:
    logger.critical(
        "Bundle file not found at '%s'.  "
        "Run 'python ml/xgb.py' to train and generate the bundle, then restart.",
        _BUNDLE_PATH,
    )
except Exception as _exc:  # noqa: BLE001
    logger.critical(
        "Failed to load pricing bundle from '%s': %s.  "
        "Pricing service will be unavailable until this is resolved.",
        _BUNDLE_PATH,
        _exc,
    )

# ---------------------------------------------------------------------------
# 2.  Internal feature-engineering helpers
#     Mirrors prepare_features() from xgb.py — kept in sync with training.
# ---------------------------------------------------------------------------
_DAY_ORDER: list[str] = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]
_DAY_MAP: dict[str, int] = {day: idx for idx, day in enumerate(_DAY_ORDER)}


def _encode_season(season: str) -> int:
    """Map season string to integer (Normal=0, Festive=1)."""
    return {"Normal": 0, "Festive": 1}.get(season, 0)


def _prepare_row(data: pd.DataFrame) -> pd.DataFrame:
    """
    Apply the same feature engineering that was used during model training.

    This function must stay in sync with ``prepare_features()`` in xgb.py.
    It operates on a single-row DataFrame produced for one product.

    Parameters
    ----------
    data : pd.DataFrame
        One-row DataFrame containing the raw product fields.

    Returns
    -------
    pd.DataFrame
        The same DataFrame enriched with engineered feature columns.
    """
    d = data.copy()
    d["season_enc"]    = d["season"].map(_encode_season)
    d["day_enc"]       = d["day_of_week"].map(_DAY_MAP).fillna(0).astype(int)
    d["is_weekend"]    = d["day_enc"].isin([5, 6]).astype(int)
    d["price_vs_comp"] = d["base_price"] / (d["competitor_price"] + 1e-6)
    d["demand_norm"]   = d["demand"]  / 575.0
    d["stock_norm"]    = d["stock"]   / 1000.0
    d["discount_ratio"] = d["discount"] / 100.0
    d["reviews_log"]   = np.log1p(d["reviews"])
    return d


# ---------------------------------------------------------------------------
# 3.  Public helper functions — season and day detection
# ---------------------------------------------------------------------------

def get_current_season() -> str:
    """
    Return the current retail season based on today's calendar month.

    Festive season covers October, November, and December — the peak shopping
    period in India corresponding to Diwali, Christmas, and New Year sales.

    Returns
    -------
    str
        ``"Festive"`` for October (10), November (11), December (12).
        ``"Normal"``  for all other months.
    """
    return "Festive" if datetime.today().month in (10, 11, 12) else "Normal"


def get_today_day() -> str:
    """
    Return today's full day name using the server's local date.

    Returns
    -------
    str
        E.g. ``"Monday"``, ``"Tuesday"``, ... ``"Sunday"``.
        Uses ``datetime.today()`` — reflects the machine's local timezone.
    """
    return datetime.today().strftime("%A")


# ---------------------------------------------------------------------------
# 4.  Product enrichment
# ---------------------------------------------------------------------------

def build_product_input(product: dict) -> dict:
    """
    Enrich a raw product record from the database with auto-derived signals.

    Overwrites ``season`` and ``day_of_week`` in the returned dict with
    real-time values so FastAPI does not need to supply them manually.
    The original ``product`` dict is never mutated.

    Parameters
    ----------
    product : dict
        Raw product record from the database.  Expected keys (minimum):
        ``category``, ``sub_category``, ``base_price``, ``competitor_price``,
        ``demand``, ``rating``, ``reviews``, ``stock``, ``discount``.
        Any extra fields (e.g. ``created_at``) are carried through harmlessly.

    Returns
    -------
    dict
        A shallow copy of ``product`` with ``season`` and ``day_of_week``
        set to the current real-time values ready for :func:`predict_price`.
    """
    enriched: dict = dict(product)          # shallow copy — never mutate caller
    enriched["season"]      = get_current_season()
    enriched["day_of_week"] = get_today_day()
    return enriched


# ---------------------------------------------------------------------------
# 5.  Core prediction function
# ---------------------------------------------------------------------------

def predict_price(product: dict) -> dict:
    """
    Predict the optimal price for a single enriched product record.

    Uses the pre-loaded bundle to select the correct per-segment XGBoost model,
    applies the 25 % price cap, and applies psychological pricing
    (round to nearest ₹50 boundary, then subtract ₹1).

    Parameters
    ----------
    product : dict
        Enriched product dict — typically the output of
        :func:`build_product_input`.  Must contain:
        ``category``, ``sub_category``, ``base_price``, ``competitor_price``,
        ``demand``, ``rating``, ``reviews``, ``stock``, ``discount``,
        ``season``, ``day_of_week``.

    Returns
    -------
    dict
        ``new_price``      – final psychologically priced integer (e.g. 12_499)
        ``segment``        – human-readable label e.g. ``"Mobile Phone | Budget"``
        ``raw_prediction`` – raw float output from XGBRegressor before cap / rounding
        ``price_cap``      – hard ceiling = ``base_price × price_cap_mult``

    Raises
    ------
    RuntimeError
        If the bundle was not loaded at startup.
    KeyError
        If no trained model exists for the product's (category, sub_category).
    ValueError
        If feature engineering or XGBoost inference raises any error.
    """
    if _BUNDLE is None:
        raise RuntimeError(
            "Pricing bundle is not loaded.  "
            "Generate 'xgb_pricing_bundle.pkl' by running 'python ml/xgb.py', "
            "then restart the service."
        )

    cat           = product.get("category", "")
    sub           = product.get("sub_category", "")
    segment_key   = (cat, sub)
    segment_label = f"{cat} | {sub}"

    models       = _BUNDLE["models"]
    feature_cols = _BUNDLE["feature_cols"]
    cap_mult     = _BUNDLE["price_cap_mult"]

    # ---- segment look-up --------------------------------------------------
    if segment_key not in models:
        raise KeyError(
            f"No trained model for segment {segment_key!r}.  "
            f"Valid segments: {sorted(models.keys())}"
        )

    model = models[segment_key]

    # ---- feature engineering -----------------------------------------------
    try:
        row = pd.DataFrame([product])
        row = _prepare_row(row)
        X   = row[feature_cols].values
    except Exception as exc:
        raise ValueError(
            f"Feature engineering failed for segment {segment_label!r}: {exc}"
        ) from exc

    # ---- model inference ---------------------------------------------------
    try:
        raw_pred = float(model.predict(X)[0])
    except Exception as exc:
        raise ValueError(
            f"Model inference failed for segment {segment_label!r}: {exc}"
        ) from exc

    # ---- price cap ---------------------------------------------------------
    base_price = float(product["base_price"])
    price_cap  = base_price * cap_mult
    capped     = min(raw_pred, price_cap)

    # ---- psychological pricing: nearest ₹50 boundary, then subtract ₹1 ----
    #      e.g. ₹12 513 → nearest ₹50 = ₹12 500 → final = ₹12 499
    final_price = int(round(capped / 50.0) * 50 - 1)

    return {
        "new_price":      final_price,
        "segment":        segment_label,
        "raw_prediction": raw_pred,
        "price_cap":      price_cap,
    }


# ---------------------------------------------------------------------------
# 6.  run_price_update — primary entrypoint called by FastAPI
# ---------------------------------------------------------------------------

def run_price_update(db_products: list) -> list:
    """
    Predict optimal prices for a batch of products from the database.

    Iterates over every product in ``db_products``, auto-injects real-time
    season and day-of-week signals, runs XGBoost inference, and collects
    successful results.  Any product that fails at any step is logged and
    skipped so one bad product never aborts the whole batch.

    Parameters
    ----------
    db_products : list[dict]
        List of product records supplied by FastAPI (fetched from the DB).
        Each dict must contain:
        ``id``, ``name``, ``category``, ``sub_category``, ``base_price``,
        ``competitor_price``, ``demand``, ``rating``, ``reviews``,
        ``stock``, ``discount``.
        Fields ``season`` and ``day_of_week`` are ignored and overwritten
        automatically.

    Returns
    -------
    list[dict]
        One entry per successfully predicted product — results are returned
        in the order predictions succeeded (not necessarily input order if
        some products are skipped):

        ``id``             – same product id from input (int)
        ``new_price``      – predicted optimal price, int (e.g. 12_499)
        ``segment``        – label e.g. ``"Mobile Phone | Budget"``
        ``raw_prediction`` – raw float from XGBRegressor, rounded to 4 dp
        ``price_cap``      – hard ceiling price, rounded to 2 dp

        Failed products are omitted from the output list.
    """
    # ---- guard: bundle unavailable ----------------------------------------
    if _BUNDLE is None:
        logger.critical(
            "run_price_update called but pricing bundle is not loaded.  "
            "Run 'python ml/xgb.py' to generate the bundle and restart."
        )
        return []

    # ---- guard: empty input -----------------------------------------------
    if not db_products:
        logger.info("run_price_update received an empty product list — nothing to do.")
        return []

    results: list = []
    total   = len(db_products)
    success = 0
    skipped = 0

    logger.info("Starting price update batch: %d product(s).", total)

    for product in db_products:
        product_id = product.get("id", "<unknown>")

        # ---- guard: missing id field --------------------------------------
        if "id" not in product:
            logger.warning(
                "Skipping product with no 'id' field: %r",
                {k: v for k, v in product.items() if k in ("name", "category")},
            )
            skipped += 1
            continue

        try:
            enriched = build_product_input(product)
            pred     = predict_price(enriched)

            results.append({
                "id":             int(product_id),
                "new_price":      pred["new_price"],
                "segment":        pred["segment"],
                "raw_prediction": round(pred["raw_prediction"], 4),
                "price_cap":      round(pred["price_cap"], 2),
            })
            success += 1

        except KeyError as exc:
            # Segment not in bundle — expected for unsupported categories
            logger.warning(
                "Product id=%s (%s | %s) skipped — segment not found: %s",
                product_id,
                product.get("category", "?"),
                product.get("sub_category", "?"),
                exc,
            )
            skipped += 1

        except Exception as exc:  # noqa: BLE001
            # Any other error (feature engineering, inference, type errors …)
            logger.error(
                "Product id=%s (%s) skipped — unexpected error: %s: %s",
                product_id,
                product.get("name", "?"),
                type(exc).__name__,
                exc,
            )
            skipped += 1

    logger.info(
        "Price update complete — success=%d  skipped=%d  total=%d.",
        success, skipped, total,
    )
    return results


# ---------------------------------------------------------------------------
# 7.  Self-test  (run with: python -m ml.pricing_service)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("  pricing_service.py — Self-Test")
    print("=" * 65)

    _test_products = [
        # ── Test 1: Valid product — should succeed ─────────────────────────
        {
            "id":               101,
            "name":             "Samsung Galaxy A35",
            "category":         "Mobile Phone",
            "sub_category":     "Budget",
            "base_price":       11858.0,
            "competitor_price": 12000.0,
            "demand":           400,
            "rating":           3.5,
            "reviews":          2500,
            "stock":            400,
            "discount":         8.0,
        },
        # ── Test 2: Invalid segment (Tablet ∉ training data) → skip ────────
        {
            "id":               202,
            "name":             "Generic Tablet",
            "category":         "Tablet",           # ← not a valid category
            "sub_category":     "Mid",
            "base_price":       25000.0,
            "competitor_price": 24000.0,
            "demand":           120,
            "rating":           3.8,
            "reviews":          300,
            "stock":            100,
            "discount":         5.0,
        },
        # ── Test 3: Missing required field (competitor_price) → skip ──────
        {
            "id":               303,
            "name":             "Sony Alpha Camera",
            "category":         "Camera",
            "sub_category":     "Premium",
            "base_price":       175511.0,
            # "competitor_price" deliberately omitted to test error handling
            "demand":           450,
            "rating":           4.5,
            "reviews":          800,
            "stock":            200,
            "discount":         5.0,
        },
    ]

    print(f"\n  Auto-detected season   : {get_current_season()}")
    print(f"  Auto-detected day      : {get_today_day()}")
    print()

    _results = run_price_update(_test_products)

    print(f"\n  Results returned: {len(_results)} / {len(_test_products)}")
    print()
    for r in _results:
        print(f"  Product id={r['id']}")
        print(f"    Segment        : {r['segment']}")
        print(f"    Raw prediction : Rs {r['raw_prediction']:,.2f}")
        print(f"    Price cap      : Rs {r['price_cap']:,.2f}")
        print(f"    [OK] New price : Rs {r['new_price']:,}")
        print()

    print("=" * 65)
