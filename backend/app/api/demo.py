"""Demo mode endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.demo_service import load_demo_patient

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/patient")
def load_demo(patient_id: str | None = None, db: Session = Depends(get_db)):
    new_id = load_demo_patient(db)
    return {"id": new_id, "message": "Demo patient loaded successfully"}
