"""Database engine, session factory, and initialisation."""
from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.base import Base

settings = get_settings()

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

try:
    if db_url.startswith("postgresql"):
        engine = create_engine(db_url, pool_pre_ping=True)
    else:
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )
except Exception as exc:
    import logging
    logging.getLogger(__name__).warning("Failed to create engine with %s: %s. Falling back to sqlite.", db_url, exc)
    engine = create_engine(
        "sqlite:///./medguard.db",
        connect_args={"check_same_thread": False},
    )


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
    """Create all tables and perform lightweight column migrations if needed."""
    from sqlalchemy import text
    from app import models  # noqa: F401  (register models)

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Base.metadata.create_all: %s", exc)

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
            # Column already exists or table not using SQLite
            pass

