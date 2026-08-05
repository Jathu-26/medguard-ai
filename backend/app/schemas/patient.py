"""Patient schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PatientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    date_of_birth: str | None = None
    gender: str | None = None
    reference_number: str | None = None
    allergies: list[str] = Field(default_factory=list)


class PatientOut(BaseModel):
    id: str
    name: str
    date_of_birth: str | None = None
    gender: str | None = None
    reference_number: str | None = None
    known_allergies: str | None = None
    document_count: int = 0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
