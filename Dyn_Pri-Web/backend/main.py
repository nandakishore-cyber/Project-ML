"""
main.py — FastAPI application entry point for the Dynamic Pricing API.

Responsibilities
----------------
- Set sys.path so both backend/ internals and the ml/ package are importable
- Configure CORS for the HTML/JS frontend
- Wire all routers
- On startup: create DB tables + start APScheduler
- On shutdown: stop APScheduler

Run (from inside backend/):
    uvicorn main:app --reload

Run (from the project root Dyn_Pri-Web/):
    uvicorn backend.main:app --reload
"""

import logging
import os
import sys

# ---------------------------------------------------------------------------
# sys.path setup — MUST happen before any local imports
#
# Adds two directories to sys.path:
#   1. backend/   → so "from database import …", "from models…" etc. work
#   2. project root (Dyn_Pri-Web/) → so "from ml.pricing_service import …" works
# ---------------------------------------------------------------------------
_BACKEND_DIR  = os.path.dirname(os.path.abspath(__file__))   # …/Dyn_Pri-Web/backend
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)                # …/Dyn_Pri-Web

for _p in (_BACKEND_DIR, _PROJECT_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ---------------------------------------------------------------------------
# Standard library / third-party imports (after path setup)
# ---------------------------------------------------------------------------
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Local imports (use the paths we just set up)
# ---------------------------------------------------------------------------
from database import Base, engine
import models  # noqa: F401  — importing this registers all ORM classes with Base.metadata

from routes import auth, products, cart, orders, admin
from services import scheduler_service

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)-8s]  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan — startup + shutdown hooks
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown tasks."""
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Starting Dynamic Pricing API…")

    # Create all database tables (no-op if already exist)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created.")

    # The ML bundle is loaded by ml/pricing_service.py when it is first
    # imported (module-level). The lazy imports in scheduler_service.py
    # and routes/admin.py trigger that load on first use.
    # No manual load needed here.

    # Start the APScheduler (Mon / Wed / Fri 09:00)
    scheduler_service.start_scheduler()
    logger.info("Next scheduled pricing run: %s", scheduler_service.get_next_run_time())

    logger.info("API is ready. Docs: http://127.0.0.1:8000/docs")
    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    scheduler_service.stop_scheduler()
    logger.info("Dynamic Pricing API shut down.")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title       = "Dynamic Pricing API",
    description = (
        "E-commerce dynamic pricing backend powered by XGBoost ML. "
        "Prices are updated automatically Mon / Wed / Fri at 09:00, "
        "and can also be triggered manually via /admin/trigger-pricing."
    ),
    version  = "1.0.0",
    lifespan = lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow the HTML/JS frontend from VS Code Live Server and local dev
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
    ],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)


# ---------------------------------------------------------------------------
# Root health-check endpoint
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
def root():
    """API health check — returns a welcome message and docs URL."""
    return {
        "message": "Dynamic Pricing API is running",
        "docs":    "http://127.0.0.1:8000/docs",
        "redoc":   "http://127.0.0.1:8000/redoc",
        "status":  "ok",
    }
