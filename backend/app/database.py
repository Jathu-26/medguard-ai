"""Database engine, session factory, and initialisation."""
from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.base import Base

settings = get_settings()

if settings.database_url.startswith("postgres"):
    engine = create_engine(settings.database_url, pool_pre_ping=True)
else:
    engine = create_engine(
        settings.database_url,
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

    Base.metadata.create_all(bind=engine)

    # Lightweight SQLite migration for newly added columns
    with engine.begin() as conn:
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
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
            except Exception:
                # Column already exists or table not using SQLite
                pass

