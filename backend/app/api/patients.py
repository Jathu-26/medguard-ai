"""Patient CRUD endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.patient import PatientCreate, PatientOut
from app.services import patient_service

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    return patient_service.create_patient(db, payload)


@router.get("", response_model=list[PatientOut])
def list_patients(db: Session = Depends(get_db)):
    return patient_service.list_patients(db)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    return patient_service.to_out(db, patient_service.get_patient_or_404(db, patient_id))


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: str, payload: PatientCreate, db: Session = Depends(get_db)):
    return patient_service.update_patient(db, patient_id, payload)


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient_service.delete_patient(db, patient_id)
    return None
