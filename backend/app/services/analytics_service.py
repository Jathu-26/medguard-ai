"""Analytics services: overview, timeline, lab trends, alerts."""
from __future__ import annotations

import json
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models import (
    Allergy,
    DiagnosisMention,
    LabResult,
    MedicalDocument,
    MedicalVisit,
    Medication,
    SafetyAlert,
    TimelineEvent,
)
from app.schemas.analytics import AlertOut, LabTrendOut, LabTrendPoint, OverviewOut, TimelineEventOut


def get_overview(db: Session, patient_id: str) -> OverviewOut:
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).all()
    visits = db.query(MedicalVisit).filter(MedicalVisit.patient_id == patient_id).count()
    meds = db.query(Medication).filter(Medication.patient_id == patient_id).all()
    allergies = db.query(Allergy).filter(Allergy.patient_id == patient_id).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == patient_id).all()
    alerts = db.query(SafetyAlert).filter(SafetyAlert.patient_id == patient_id).all()

    active_meds = [m for m in meds if (m.status or "").lower() in {"", "active", "current", "ongoing", "continue"}]
    abnormal = [l for l in labs if l.status in {"High", "Critical", "Low"}]
    high = [a for a in alerts if a.risk_level in {"High", "Critical"}]
    medium = [a for a in alerts if a.risk_level == "Medium"]
    low = [a for a in alerts if a.risk_level in {"Low", "Informational"}]

    confidences = [d.overall_confidence for d in docs if d.overall_confidence]
    avg_conf = round(sum(confidences) / len(confidences), 1) if confidences else 0.0

    return OverviewOut(
        total_documents=len(docs),
        total_visits=visits,
        current_medications=len(active_meds),
        known_allergies=sorted({a.substance for a in allergies}),
        abnormal_lab_results=len(abnormal),
        high_risk_warnings=len(high),
        medium_risk_warnings=len(medium),
        low_risk_warnings=len(low),
        average_confidence=avg_conf,
        documents_needing_review=sum(1 for d in docs if d.processing_status in {"needs_review", "failed"}),
    )


def get_alerts(db: Session, patient_id: str) -> list[AlertOut]:
    alerts = (
        db.query(SafetyAlert)
        .filter(SafetyAlert.patient_id == patient_id)
        .order_by(SafetyAlert.created_at.desc())
        .all()
    )
    result = []
    for a in alerts:
        result.append(
            AlertOut(
                title=a.title,
                category=a.category,
                risk_level=a.risk_level,
                medications_involved=json.loads(a.medications_involved or "[]"),
                relevant_dates=json.loads(a.relevant_dates or "[]"),
                explanation=a.explanation,
                evidence=json.loads(a.evidence or "[]"),
                source_documents=json.loads(a.source_documents or "[]"),
                page_numbers=json.loads(a.page_numbers or "[]"),
                confidence=a.confidence,
                recommended_action=a.recommended_action,
            )
        )
    return result


def get_timeline(db: Session, patient_id: str) -> list[TimelineEventOut]:
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.patient_id == patient_id)
        .order_by(TimelineEvent.event_date.desc())
        .all()
    )
    result = []
    for e in events:
        result.append(
            TimelineEventOut(
                id=e.id,
                event_date=e.event_date,
                event_type=e.event_type,
                document_type=e.document_type,
                provider=e.provider,
                doctor_name=e.doctor_name,
                summary=e.summary,
                diagnoses=json.loads(e.diagnoses or "[]"),
                medications=json.loads(e.medications or "[]"),
                lab_results=json.loads(e.lab_results or "[]"),
                allergies=json.loads(e.allergies or "[]"),
                clinical_notes=json.loads(e.clinical_notes or "[]"),
                source_document=e.source_document,
                source_document_id=e.source_document_id,
                page_numbers=json.loads(e.page_numbers or "[]"),
                supporting_text=e.supporting_text,
                confidence=e.confidence,
            )
        )
    return result


def get_lab_trends(db: Session, patient_id: str) -> list[LabTrendOut]:
    """Retrieve lab trends as typed Pydantic models for API responses."""
    trends_dicts = calculate_lab_trends(db, patient_id)
    return [LabTrendOut(**t) for t in trends_dicts]


def calculate_lab_trends(db: Session, patient_id: str) -> list[dict]:
    """Calculate longitudinal lab trends returning dictionary structures."""
    labs = db.query(LabResult).filter(LabResult.patient_id == patient_id).order_by(LabResult.date).all()
    grouped: dict[str, list[LabResult]] = defaultdict(list)
    for lab in labs:
        key = lab.normalised_test_name or lab.test_name_as_written
        grouped[key].append(lab)

    trends = []
    for name, items in grouped.items():
        points = []
        for lab in items:
            doc = db.get(MedicalDocument, lab.document_id) if lab.document_id else None
            points.append(
                LabTrendPoint(
                    date=lab.date,
                    value=lab.value,
                    text_value=lab.text_value,
                    unit=lab.unit,
                    reference_min=lab.reference_min,
                    reference_max=lab.reference_max,
                    status=lab.status,
                    source_document=doc.original_name if doc else None,
                    confidence=lab.confidence,
                )
            )
        trend, explanation, trend_direction = compute_trend(name, points)
        last_point = points[-1] if points else None
        trends.append(
            {
                "test_name": name,
                "normalised_test_name": items[0].normalised_test_name,
                "points": points,
                "trend": trend,
                "trend_direction": trend_direction,
                "status": last_point.status if last_point else "Unknown range",
                "current_value": last_point.value if last_point else None,
                "unit": last_point.unit if last_point else "",
                "explanation": explanation,
                "statuses": [p.status or "Unknown range" for p in points],
            }
        )
    return trends


def compute_trend(test_name: str, points: list[LabTrendPoint]) -> tuple[str, str, str]:
    """Determine trend direction and produce a plain-language explanation.
    Returns (trend_display, explanation, trend_direction)."""
    values = [(p.value, p.status) for p in points if p.value is not None]
    if len(values) < 2:
        msg = (
            f"Insufficient data to determine a trend for {test_name}. "
            "Additional laboratory results are needed."
        )
        return "Insufficient data", msg, "insufficient data"

    nums = [v for v, _ in values]
    first, last = nums[0], nums[-1]
    delta = last - first

    if abs(delta) < 0.05 * max(abs(first), 1):
        trend = "Stable trend"
        trend_direction = "stable"
    elif delta > 0:
        trend = "Increasing trend"
        trend_direction = "increasing"
    else:
        trend = "Decreasing trend"
        trend_direction = "decreasing"

    # Fluctuating check: multiple direction changes
    changes = 0
    for i in range(2, len(nums)):
        if (nums[i] - nums[i - 1]) * (nums[i - 1] - nums[i - 2]) < 0:
            changes += 1
    if changes >= 2:
        trend = "Fluctuating trend"
        trend_direction = "fluctuating"

    # Range crossing
    last_status = values[-1][1]
    first_status = values[0][1]
    moved_into_abnormal = (
        last_status in {"High", "Low", "Critical", "abnormal"} and first_status in {"Normal", "Unknown range", None, "normal"}
    )
    moved_toward_normal = (
        last_status in {"Normal", None, "normal"} and first_status in {"High", "Low", "Critical", "abnormal"}
    )

    parts = []
    if moved_into_abnormal:
        parts.append(
            f"{test_name} has moved into an abnormal range in the most recent recorded result."
        )
    elif moved_toward_normal:
        parts.append(
            f"{test_name} has moved back toward the normal range in the most recent recorded result."
        )

    parts.append(
        f"{test_name} showed a {trend.lower()} across {len(nums)} recorded values "
        f"(from {first} to {last} {points[-1].unit or ''})."
    )
    parts.append(
        "This is not a diagnosis. Please discuss the result with a qualified clinician."
    )
    return trend, " ".join(parts), trend_direction


def build_timeline_events(db: Session, patient_id: str) -> None:
    """Regenerate timeline events from extracted data with strict visit/document scoping."""
    db.query(TimelineEvent).filter(TimelineEvent.patient_id == patient_id).delete()

    visits = db.query(MedicalVisit).filter(MedicalVisit.patient_id == patient_id).all()
    for visit in visits:
        # Scope medications strictly to this visit/document
        meds = (
            db.query(Medication)
            .filter(Medication.visit_id == visit.id)
            .all()
        )
        # Scope labs strictly to this visit's document
        labs = []
        if visit.document_id:
            labs = (
                db.query(LabResult)
                .filter(LabResult.document_id == visit.document_id)
                .all()
            )
        # Scope allergies strictly to this visit's document
        allergies = []
        if visit.document_id:
            allergies = (
                db.query(Allergy)
                .filter(Allergy.document_id == visit.document_id)
                .all()
            )
        diagnoses = (
            db.query(DiagnosisMention)
            .filter(DiagnosisMention.visit_id == visit.id)
            .all()
        )
        doc = db.get(MedicalDocument, visit.document_id) if visit.document_id else None

        lab_entries = [
            f"{l.normalised_test_name or l.test_name_as_written}: {l.value}{' ' + l.unit if l.unit else ''}"
            for l in labs
        ]

        # Aggregate real page numbers from visit entities
        pages_set = set()
        for m in meds:
            if getattr(m, "page_number", None):
                pages_set.add(m.page_number)
        for l in labs:
            if getattr(l, "page_number", None):
                pages_set.add(l.page_number)
        for a in allergies:
            if getattr(a, "page_number", None):
                pages_set.add(a.page_number)
        page_numbers_list = sorted(pages_set) if pages_set else [1]

        db.add(
            TimelineEvent(
                patient_id=patient_id,
                event_date=visit.visit_date,
                event_type="visit",
                document_type=doc.classification if doc else None,
                provider=visit.provider,
                doctor_name=visit.doctor_name,
                summary=visit.visit_summary or "Medical visit",
                diagnoses=json.dumps([d.diagnosis for d in diagnoses]),
                medications=json.dumps([m.normalised_name or m.name_as_written for m in meds]),
                lab_results=json.dumps(lab_entries),
                allergies=json.dumps([a.substance for a in allergies]),
                clinical_notes=json.dumps([]),
                source_document=doc.original_name if doc else None,
                source_document_id=doc.id if doc else None,
                page_numbers=json.dumps(page_numbers_list),
                supporting_text=None,
                confidence=visit.confidence,
            )
        )
    db.commit()
