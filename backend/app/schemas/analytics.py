"""Analytics schemas: overview, timeline, alerts, lab trends."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OverviewOut(BaseModel):
    total_documents: int = 0
    total_visits: int = 0
    current_medications: int = 0
    known_allergies: list[str] = Field(default_factory=list)
    abnormal_lab_results: int = 0
    high_risk_warnings: int = 0
    medium_risk_warnings: int = 0
    low_risk_warnings: int = 0
    average_confidence: float = 0.0
    documents_needing_review: int = 0


class AlertOut(BaseModel):
    title: str
    category: str
    risk_level: str
    medications_involved: list[str] = Field(default_factory=list)
    relevant_dates: list[str] = Field(default_factory=list)
    explanation: str | None = None
    evidence: list[str] = Field(default_factory=list)
    source_documents: list[str] = Field(default_factory=list)
    page_numbers: list[int] = Field(default_factory=list)
    confidence: float = 0.0
    recommended_action: str | None = None


class TimelineEventOut(BaseModel):
    id: str | None = None
    event_date: str | None = None
    event_type: str = ""
    document_type: str | None = None
    provider: str | None = None
    doctor_name: str | None = None
    summary: str | None = None
    diagnoses: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    lab_results: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    clinical_notes: list[str] = Field(default_factory=list)
    source_document: str | None = None
    source_document_id: str | None = None
    page_numbers: list[int] = Field(default_factory=list)
    supporting_text: str | None = None
    confidence: float = 0.0


class LabTrendPoint(BaseModel):
    date: str | None = None
    value: float | None = None
    text_value: str | None = None
    unit: str | None = None
    reference_min: float | None = None
    reference_max: float | None = None
    status: str | None = None
    source_document: str | None = None
    confidence: float = 0.0


class LabTrendOut(BaseModel):
    test_name: str
    normalised_test_name: str | None = None
    points: list[LabTrendPoint] = Field(default_factory=list)
    trend: str = "Insufficient data"
    trend_direction: str | None = None
    status: str | None = None
    current_value: float | None = None
    unit: str | None = None
    explanation: str = ""
    statuses: list[str] = Field(default_factory=list)


class ChatAnswerOut(BaseModel):
    answer: str
    reasoning_summary: str | None = None
    relevant_dates: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    tests: list[str] = Field(default_factory=list)
    evidence: list[Any] = Field(default_factory=list)
    confidence: float = 0.0
    risk_level: str | None = None
    recommendation: str | None = None
    disclaimer: str | None = None
    missing_information: list[str] = Field(default_factory=list)
