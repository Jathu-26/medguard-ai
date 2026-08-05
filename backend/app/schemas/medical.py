"""Medical data schemas used by the extraction pipeline and API responses."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AllergyIn(BaseModel):
    substance: str = Field(..., min_length=1)
    reaction: str | None = None
    severity: str | None = None
    date_recorded: str | None = None
    confidence: float = Field(0.0, ge=0, le=100)
    source_document_id: str | None = None
    page_number: int | None = None
    source_text: str | None = None


class MedicationIn(BaseModel):
    name_as_written: str = Field(..., min_length=1)
    normalised_name: str | None = None
    generic_name: str | None = None
    brand_name: str | None = None
    active_ingredient: str | None = None
    strength: str | None = None
    dose: str | None = None
    frequency: str | None = None
    duration: str | None = None
    route: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    status: str | None = None
    instructions: str | None = None
    confidence: float = Field(0.0, ge=0, le=100)
    source_document_id: str | None = None
    page_number: int | None = None
    source_text: str | None = None


class LabResultIn(BaseModel):
    test_name_as_written: str = Field(..., min_length=1)
    normalised_test_name: str | None = None
    value: float | None = None
    text_value: str | None = None
    unit: str | None = None
    reference_min: float | None = None
    reference_max: float | None = None
    reference_text: str | None = None
    status: str | None = None
    date: str | None = None
    confidence: float = Field(0.0, ge=0, le=100)
    source_document_id: str | None = None
    page_number: int | None = None
    source_text: str | None = None


class DocumentMeta(BaseModel):
    document_id: str | None = None
    file_name: str | None = None
    document_type: str | None = None
    document_date: str | None = None
    provider: str | None = None
    doctor_name: str | None = None
    overall_confidence: float = Field(0.0, ge=0, le=100)


class PatientInfo(BaseModel):
    name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    patient_identifier: str | None = None
    allergies: list[AllergyIn] = Field(default_factory=list)


class StructuredExtraction(BaseModel):
    patient: PatientInfo = Field(default_factory=PatientInfo)
    document: DocumentMeta = Field(default_factory=DocumentMeta)
    medications: list[MedicationIn] = Field(default_factory=list)
    lab_results: list[LabResultIn] = Field(default_factory=list)
    diagnoses_mentioned: list[str] = Field(default_factory=list)
    clinical_notes: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class MedicationOut(MedicationIn):
    id: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AllergyOut(AllergyIn):
    id: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class LabResultOut(LabResultIn):
    id: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
