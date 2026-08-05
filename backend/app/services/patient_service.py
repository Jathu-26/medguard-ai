"""Patient CRUD service."""
from __future__ import annotations

import json

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import MedicalDocument, Patient
from app.schemas.patient import PatientCreate, PatientOut


def create_patient(db: Session, payload: PatientCreate) -> PatientOut:
    known = json.dumps(payload.allergies) if payload.allergies else None
    patient = Patient(
        name=payload.name,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        reference_number=payload.reference_number,
        known_allergies=known,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return to_out(db, patient)


def list_patients(db: Session) -> list[PatientOut]:
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()
    return [to_out(db, p) for p in patients]


def get_patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def update_patient(db: Session, patient_id: str, payload: PatientCreate) -> PatientOut:
    patient = get_patient_or_404(db, patient_id)
    patient.name = payload.name
    patient.date_of_birth = payload.date_of_birth
    patient.gender = payload.gender
    patient.reference_number = payload.reference_number
    if payload.allergies is not None:
        patient.known_allergies = json.dumps(payload.allergies) if payload.allergies else None
    db.commit()
    db.refresh(patient)
    return to_out(db, patient)


def delete_patient(db: Session, patient_id: str) -> None:
    patient = get_patient_or_404(db, patient_id)
    db.delete(patient)
    db.commit()


def to_out(db: Session, patient: Patient) -> PatientOut:
    count = (
        db.query(func.count(MedicalDocument.id))
        .filter(MedicalDocument.patient_id == patient.id)
        .scalar()
        or 0
    )
    return PatientOut(
        id=patient.id,
        name=patient.name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        reference_number=patient.reference_number,
        known_allergies=patient.known_allergies,
        document_count=count,
        created_at=patient.created_at,
    )
