"""Database engine, session factory, and initialisation."""
from __future__ import annotations

import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.base import Base

logger = logging.getLogger(__name__)
settings = get_settings()

sqlite_url = "sqlite:///./medguard.db"


def _build_engine():
    db_url = settings.database_url
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    if db_url.startswith("postgresql"):
        try:
            pg_engine = create_engine(
                db_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3},
            )
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL database.")
            return pg_engine
        except Exception as exc:
            logger.warning("PostgreSQL connection failed (%s). Falling back to SQLite.", exc)
            return create_engine(
                sqlite_url,
                connect_args={"check_same_thread": False},
            )

    return create_engine(
        db_url or sqlite_url,
        connect_args={"check_same_thread": False},
    )


engine = _build_engine()


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:  # noqa: ANN001
    """Enable foreign keys for SQLite."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    except Exception:  # pragma: no cover - only relevant for SQLite
        pass


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db():
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables with full SQLite fallback guarantee."""
    global engine, SessionLocal
    from app import models  # noqa: F401 (register all models)

    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.warning("Base.metadata.create_all failed on primary engine: %s. Re-binding to SQLite...", exc)
        engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        SessionLocal.configure(bind=engine)
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized on SQLite fallback.")

    # Lightweight SQLite migration for newly added columns
    tables_to_check = [
        ("allergies", "page_number", "INTEGER DEFAULT 1"),
        ("medications", "page_number", "INTEGER DEFAULT 1"),
        ("prescriptions", "page_number", "INTEGER DEFAULT 1"),
        ("lab_results", "page_number", "INTEGER DEFAULT 1"),
        ("diagnosis_mentions", "page_number", "INTEGER DEFAULT 1"),
        ("clinical_notes", "page_number", "INTEGER DEFAULT 1"),
    ]
    for table, col, col_type in tables_to_check:
        try:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
        except Exception:
            pass
