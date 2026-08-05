"""Analytics endpoints: overview, timeline, medications, allergies, lab-trends, alerts."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Allergy, LabResult, Medication
from app.schemas.analytics import AlertOut, LabTrendOut, OverviewOut, TimelineEventOut
from app.schemas.medical import AllergyOut, LabResultOut, MedicationOut
from app.services import patient_service
from app.services.analytics_service import get_alerts, get_lab_trends, get_overview, get_timeline

router = APIRouter(prefix="/api/patients", tags=["analytics"])


@router.get("/{patient_id}/overview", response_model=OverviewOut)
def overview(patient_id: str, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    return get_overview(db, patient_id)


@router.get("/{patient_id}/timeline", response_model=list[TimelineEventOut])
def timeline(patient_id: str, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    return get_timeline(db, patient_id)


@router.get("/{patient_id}/medications", response_model=list[MedicationOut])
def medications(patient_id: str, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    meds = db.query(Medication).filter(Medication.patient_id == patient_id).all()
    out = []
    for m in meds:
        out.append(
            MedicationOut(
                id=m.id,
                name_as_written=m.name_as_written,
                normalised_name=m.normalised_name,
                generic_name=m.generic_name,
                brand_name=m.brand_name,
                active_ingredient=m.active_ingredient,
                strength=m.strength,
                dose=m.dose,
                frequency=m.frequency,
                duration=m.duration,
                route=m.route,
                start_date=m.start_date,
                end_date=m.end_date,
                status=m.status,
                instructions=m.instructions,
                confidence=m.confidence,
                match_confidence=m.match_confidence,
                source_text=m.source_text,
                created_at=m.created_at,
            )
        )
    return out


@router.get("/{patient_id}/allergies", response_model=list[AllergyOut])
def allergies(patient_id: str, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    rows = db.query(Allergy).filter(Allergy.patient_id == patient_id).all()
    return [
        AllergyOut(
            id=a.id,
            substance=a.substance,
            reaction=a.reaction,
            severity=a.severity,
            date_recorded=a.date_recorded,
            confidence=a.confidence,
            source_text=a.source_text,
            created_at=a.created_at,
        )
        for a in rows
    ]


@router.get("/{patient_id}/lab-trends", response_model=list[LabTrendOut])
def lab_trends(patient_id: str, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    return get_lab_trends(db, patient_id)


@router.get("/{patient_id}/alerts", response_model=list[AlertOut])
def alerts(patient_id: str, db: Session = Depends(get_db)):
    patient_service.get_patient_or_404(db, patient_id)
    return get_alerts(db, patient_id)
