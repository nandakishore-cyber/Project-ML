"""
database.py — SQLAlchemy engine, session factory, and Base for all ORM models.

All models import Base from here. FastAPI routes inject get_db() as a dependency.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load .env from the backend directory (one level up from wherever this file is)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

DATABASE_URL: str | None = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is not set. "
        "Add it to backend/.env before starting the server.\n"
        "Example: DATABASE_URL=postgresql://user:password@localhost:5432/dynpri_db"
    )

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        echo=False,
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ---------------------------------------------------------------------------
# Declarative base — all ORM models inherit from this
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency — yields one DB session per request, always closes it
# ---------------------------------------------------------------------------
def get_db():
    """
    Yield a SQLAlchemy session for the duration of a request.

    Usage in a route::

        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
