"""Document and processing schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DocumentOut(BaseModel):
    id: str
    patient_id: str
    file_name: str
    original_name: str
    mime_type: str | None = None
    size_bytes: int | None = None
    page_count: int = 1
    classification: str | None = None
    document_date: str | None = None
    provider: str | None = None
    doctor_name: str | None = None
    overall_confidence: float = 0.0
    processing_status: str = "uploaded"
    error_message: str | None = None
    text_extraction_method: str | None = None
    ocr_used: bool = False
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    documents: list[DocumentOut]


class ProcessingJobOut(BaseModel):
    id: str
    patient_id: str
    status: str
    current_stage: str
    overall_progress: float
    error_message: str | None = None
    stages: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ProcessResponse(BaseModel):
    job_id: str
    status: str
