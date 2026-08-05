"""Medical entities: MedicalVisit, Medication, Prescription, Allergy, LabResult, SafetyAlert, TimelineEvent."""
from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def _uuid() -> str:
    return str(uuid.uuid4())


class MedicalVisit(Base, TimestampMixin):
    __tablename__ = "medical_visits"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    document_id: Mapped[str | None] = mapped_column(
        ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True
    )
    visit_date: Mapped[str | None] = mapped_column(String, nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    visit_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    patient: Mapped["Patient"] = relationship(back_populates="visits")  # noqa: F821
    medications: Mapped[List["Medication"]] = relationship(back_populates="visit")
    diagnoses: Mapped[List["DiagnosisMention"]] = relationship(
        back_populates="visit", cascade="all, delete-orphan"
    )
    notes: Mapped[List["ClinicalNote"]] = relationship(
        back_populates="visit", cascade="all, delete-orphan"
    )


class Medication(Base, TimestampMixin):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    document_id: Mapped[str | None] = mapped_column(
        ForeignKey("medical_documents.id", ondelete="CASCADE"), nullable=True
    )
    visit_id: Mapped[str | None] = mapped_column(
        ForeignKey("medical_visits.id", ondelete="SET NULL"), nullable=True
    )

    name_as_written: Mapped[str] = mapped_column(String, nullable=False)
    normalised_name: Mapped[str | None] = mapped_column(String, nullable=True)
    generic_name: Mapped[str | None] = mapped_column(String, nullable=True)
    brand_name: Mapped[str | None] = mapped_column(String, nullable=True)
    active_ingredient: Mapped[str | None] = mapped_column(String, nullable=True)
    strength: Mapped[str | None] = mapped_column(String, nullable=True)
    dose: Mapped[str | None] = mapped_column(String, nullable=True)
    frequency: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[str | None] = mapped_column(String, nullable=True)
    route: Mapped[str | None] = mapped_column(String, nullable=True)
    start_date: Mapped[str | None] = mapped_column(String, nullable=True)
    end_date: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)  # active/discontinued/unknown
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, default=1, nullable=True)

    patient: Mapped["Patient"] = relationship()  # noqa: F821
    document: Mapped["MedicalDocument"] = relationship(back_populates="medications")
    visit: Mapped["MedicalVisit"] = relationship(back_populates="medications")


class Prescription(Base, TimestampMixin):
    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"), nullable=True)
    medication_id: Mapped[str | None] = mapped_column(ForeignKey("medications.id", ondelete="SET NULL"), nullable=True)
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("medical_visits.id", ondelete="SET NULL"), nullable=True)
    prescribed_date: Mapped[str | None] = mapped_column(String, nullable=True)
    dose: Mapped[str | None] = mapped_column(String, nullable=True)
    frequency: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[str | None] = mapped_column(String, nullable=True)
    route: Mapped[str | None] = mapped_column(String, nullable=True)
    refills: Mapped[str | None] = mapped_column(String, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    page_number: Mapped[int | None] = mapped_column(Integer, default=1, nullable=True)


class Allergy(Base, TimestampMixin):
    __tablename__ = "allergies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"), nullable=True)
    substance: Mapped[str] = mapped_column(String, nullable=False)
    reaction: Mapped[str | None] = mapped_column(String, nullable=True)
    severity: Mapped[str | None] = mapped_column(String, nullable=True)
    date_recorded: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, default=1, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="allergies")


class LabResult(Base, TimestampMixin):
    __tablename__ = "lab_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"), nullable=True)

    test_name_as_written: Mapped[str] = mapped_column(String, nullable=False)
    normalised_test_name: Mapped[str | None] = mapped_column(String, nullable=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    text_value: Mapped[str | None] = mapped_column(String, nullable=True)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    reference_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_text: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, default=1, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="lab_results")
    document: Mapped["MedicalDocument"] = relationship(back_populates="lab_results")


class SafetyAlert(Base, TimestampMixin):
    __tablename__ = "safety_alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    risk_level: Mapped[str] = mapped_column(String, nullable=False)
    medications_involved: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list
    relevant_dates: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of snippets
    source_documents: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list
    page_numbers: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="alerts")


class DiagnosisMention(Base, TimestampMixin):
    __tablename__ = "diagnosis_mentions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("medical_visits.id", ondelete="SET NULL"), nullable=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"), nullable=True)
    diagnosis: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, default=1, nullable=True)

    visit: Mapped["MedicalVisit"] = relationship(back_populates="diagnoses")


class ClinicalNote(Base, TimestampMixin):
    __tablename__ = "clinical_notes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("medical_visits.id", ondelete="SET NULL"), nullable=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="CASCADE"), nullable=True)
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    page_number: Mapped[int | None] = mapped_column(Integer, default=1, nullable=True)

    visit: Mapped["MedicalVisit"] = relationship(back_populates="notes")


class TimelineEvent(Base, TimestampMixin):
    __tablename__ = "timeline_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    event_date: Mapped[str | None] = mapped_column(String, nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)  # visit/prescription/lab/discharge/note/allergy
    document_type: Mapped[str | None] = mapped_column(String, nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnoses: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    medications: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    lab_results: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    source_document_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source_document: Mapped[str | None] = mapped_column(String, nullable=True)
    page_numbers: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    supporting_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    patient: Mapped["Patient"] = relationship(back_populates="timeline_events")
