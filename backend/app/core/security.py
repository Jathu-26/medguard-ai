"""Security helpers: filename sanitisation and safe storage names."""
from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

_ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".txt"}


def sanitize_filename(name: str) -> str:
    """Remove dangerous characters and length-limit a file name."""
    base = os.path.basename(name or "file")
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", base)
    return safe[:120] or "file"


def generate_storage_name(original_name: str, extension: str | None = None) -> str:
    """Generate a unique storage name so original names never collide."""
    ext = extension or Path(original_name or "").suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        ext = ".pdf"
    return f"{uuid.uuid4().hex}{ext}"


def is_allowed_extension(filename: str) -> bool:
    return Path(filename or "").suffix.lower() in _ALLOWED_EXTENSIONS


def is_allowed_content_type(content_type: str | None) -> bool:
    if not content_type:
        return False
    mime = content_type.lower()
    return mime in {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/pjpeg",
        "image/x-png",
        "text/plain",
    }


def safe_path(base_dir: Path, filename: str) -> Path:
    """Return a Path inside base_dir, preventing directory traversal."""
    candidate = (base_dir / filename).resolve()
    base_resolved = base_dir.resolve()
    if not candidate.is_relative_to(base_resolved):
        raise ValueError("Unsafe file path")
    return candidate

