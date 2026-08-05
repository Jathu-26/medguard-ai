"""Document upload and storage service."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    generate_storage_name,
    is_allowed_content_type,
    is_allowed_extension,
    sanitize_filename,
    safe_path,
)
from app.models import MedicalDocument, Patient
from app.schemas.document import DocumentOut

settings = get_settings()


def validate_upload(file: UploadFile) -> None:
    """Validate file type and size, raising friendly HTTP errors."""
    original = file.filename or "untitled"
    if not is_allowed_extension(original):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{Path(original).suffix}'. Please upload PDF, JPG, JPEG, PNG, or TXT.",
        )
    if not is_allowed_content_type(file.content_type):
        # Some browsers send application/octet-stream; accept if extension is allowed
        if file.content_type not in {None, "", "application/octet-stream"}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported content type '{file.content_type}'.",
            )


def store_upload(file: UploadFile, patient_id: str) -> tuple[Path, str, str, int]:
    """Save the uploaded file using a generated storage name.

    Returns (stored_path, storage_name, original_name, size_bytes).
    """
    content = file.file.read()
    size = len(content)
    if size > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {settings.max_upload_size_mb} MB.",
        )
    if size == 0:
        raise HTTPException(status_code=400, detail="Empty file. Please upload a non-empty document.")

    original = sanitize_filename(file.filename or "untitled")
    ext = Path(file.filename or "").suffix.lower()
    storage_name = generate_storage_name(original, ext)
    upload_dir = settings.upload_path / patient_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_path = safe_path(upload_dir, storage_name)
    stored_path.write_bytes(content)
    return stored_path, storage_name, original, size


def create_document_record(
    db: Session,
    patient: Patient,
    stored_path: Path,
    storage_name: str,
    original: str,
    mime: str,
    size: int,
) -> MedicalDocument:
    doc = MedicalDocument(
        patient_id=patient.id,
        file_name=storage_name,
        original_name=original,
        mime_type=mime,
        size_bytes=size,
        stored_path=str(stored_path),
        processing_status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_document_or_404(db: Session, document_id: str) -> MedicalDocument:
    doc = db.get(MedicalDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def delete_document(db: Session, document_id: str) -> None:
    doc = get_document_or_404(db, document_id)
    if doc.stored_path:
        try:
            os.remove(doc.stored_path)
        except OSError:
            pass
    db.delete(doc)
    db.commit()


def to_out(doc: MedicalDocument) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        patient_id=doc.patient_id,
        file_name=doc.file_name,
        original_name=doc.original_name,
        mime_type=doc.mime_type,
        size_bytes=doc.size_bytes,
        page_count=doc.page_count,
        classification=doc.classification,
        document_date=doc.document_date,
        provider=doc.provider,
        doctor_name=doc.doctor_name,
        overall_confidence=doc.overall_confidence,
        processing_status=doc.processing_status,
        error_message=doc.error_message,
        text_extraction_method=doc.text_extraction_method,
        ocr_used=doc.ocr_used,
        created_at=doc.created_at,
    )
