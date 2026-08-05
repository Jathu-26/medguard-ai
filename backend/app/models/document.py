"""Document-related models: MedicalDocument, DocumentPage, ExtractedText, EvidenceReference, ProcessingJob."""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class ProcessingJob(Base, TimestampMixin):
    __tablename__ = "processing_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String, default="queued")
    current_stage: Mapped[str] = mapped_column(String, default="")
    overall_progress: Mapped[float] = mapped_column(Float, default=0.0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    stages: Mapped[str] = mapped_column(Text, default="[]")  # JSON list of completed stages


class MedicalDocument(Base, TimestampMixin):
    __tablename__ = "medical_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    original_name: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stored_path: Mapped[str | None] = mapped_column(String, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    classification: Mapped[str | None] = mapped_column(String, nullable=True)
    document_date: Mapped[str | None] = mapped_column(String, nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    processing_status: Mapped[str] = mapped_column(String, default="uploaded")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    text_extraction_method: Mapped[str | None] = mapped_column(String, nullable=True)
    ocr_used: Mapped[bool] = mapped_column(default=False)

    patient: Mapped["Patient"] = relationship(back_populates="documents")  # noqa: F821
    pages: Mapped[List["DocumentPage"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    extracted_texts: Mapped[List["ExtractedText"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    evidence: Mapped[List["EvidenceReference"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    medications: Mapped[List["Medication"]] = relationship(  # noqa: F821
        back_populates="document", cascade="all, delete-orphan"
    )
    lab_results: Mapped[List["LabResult"]] = relationship(  # noqa: F821
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentPage(Base, TimestampMixin):
    __tablename__ = "document_pages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"))
    page_number: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text, default="")
    method: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    document: Mapped["MedicalDocument"] = relationship(back_populates="pages")


class ExtractedText(Base, TimestampMixin):
    __tablename__ = "extracted_texts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"))
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    text: Mapped[str] = mapped_column(Text, default="")
    method: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    document: Mapped["MedicalDocument"] = relationship(back_populates="extracted_texts")


class EvidenceReference(Base, TimestampMixin):
    __tablename__ = "evidence_references"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"))
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    entity_type: Mapped[str | None] = mapped_column(String, nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)

    document: Mapped["MedicalDocument"] = relationship(back_populates="evidence")
