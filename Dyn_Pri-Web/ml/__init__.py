"""
ml — Dynamic Pricing ML package.

Public API
----------
run_price_update    Batch inference entrypoint called by FastAPI.
                    Accepts a list of product dicts, returns a list of
                    predicted price dicts.

get_current_season  Returns "Festive" (Oct–Dec) or "Normal" for today's date.

get_today_day       Returns today's day name e.g. "Monday".

Example
-------
>>> from ml import run_price_update
>>> results = run_price_update(product_list)
"""

from ml.pricing_service import (
    run_price_update,
    get_current_season,
    get_today_day,
    build_product_input,
    predict_price,
)

__all__ = [
    "run_price_update",
    "get_current_season",
    "get_today_day",
    "build_product_input",
    "predict_price",
]
