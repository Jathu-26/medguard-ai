"""Demo patient and synthetic document loading.

The demo works without an AI API by using the MockProvider and pre-baked
synthetic documents that exercise duplicate, interaction, dosage, allergy,
and lab-trend scenarios.
"""
from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.document_processing.classifier import classify_document
from app.document_processing.extractor import extract_text
from app.models import (
    DocumentPage,
    MedicalDocument,
    Patient,
)
from app.services.analytics_service import build_timeline_events
from app.services.processing_service import persist_extraction, rerun_rules_for_patient
from app.schemas.medical import StructuredExtraction

settings = get_settings()

# Synthetic documents for the demo patient. Each is a .txt file so text extraction
# is deterministic and no OCR is required.
DEMO_DOCUMENTS = [
    {
        "name": "visit1_prescription.txt",
        "date": "2024-03-10",
        "provider": "City General Hospital",
        "doctor": "Dr. A. Patel",
        "text": (
            "PRESCRIPTION\n"
            "Patient: Demo Patient\n"
            "Date: 2024-03-10\n\n"
            "1. Metformin 500 mg twice daily (BID) - active\n"
            "2. Lisinopril 10 mg once daily - active\n"
            "3. Aspirin 81 mg once daily - active\n\n"
            "Allergy to Penicillin (rash) noted. Follow-up in 2 weeks.\n"
            "Diagnosis: Type 2 diabetes, Hypertension.\n"
        ),
    },
    {
        "name": "visit2_doctor_note.txt",
        "date": "2024-04-05",
        "provider": "City General Hospital",
        "doctor": "Dr. A. Patel",
        "text": (
            "DOCTOR NOTE\n"
            "Date: 2024-04-05\n\n"
            "Change Metformin to 850 mg twice daily (BID). "
            "Add Amoxicillin 500 mg three times daily for 7 days for respiratory infection.\n"
            "Continue Lisinopril. Aspirin 81 mg continues.\n"
            "Blood glucose 152 mg/dL. HbA1c 7.4%.\n"
            "Diagnosis: Type 2 diabetes, Hypertension, Respiratory infection.\n"
        ),
    },
    {
        "name": "visit3_lab_report.txt",
        "date": "2024-05-20",
        "provider": "Metro Diagnostic Lab",
        "doctor": None,
        "text": (
            "LABORATORY REPORT\n"
            "Date: 2024-05-20\n\n"
            "Blood glucose 168 mg/dL (High)\n"
            "HbA1c 7.8%\n"
            "Creatinine 1.1 mg/dL\n"
            "Total Cholesterol 210 mg/dL (High)\n"
            "Haemoglobin 12.5 g/dL\n"
            "WBC 9.2 x10^9/L\n"
        ),
    },
    {
        "name": "visit4_discharge.txt",
        "date": "2024-06-15",
        "provider": "City General Hospital",
        "doctor": "Dr. M. Chen",
        "text": (
            "DISCHARGE SUMMARY\n"
            "Date: 2024-06-15\n\n"
            "Admitted for unstable blood pressure. "
            "Discharge medications: Metformin 500 mg BID, Lisinopril 10 mg once daily, "
            "Atorvastatin 20 mg once daily.\n"
            "Warfarin 5 mg once daily added for anticoagulation.\n"
            "Discontinue Aspirin to reduce bleeding risk.\n"
            "Blood glucose 175 mg/dL. Creatinine 1.2 mg/dL.\n"
        ),
    },
]


def _write_demo_files() -> dict[str, Path]:
    """Write demo .txt files to the demo-data directory. Returns name->path."""
    demo_dir = settings.demo_data_path
    demo_dir.mkdir(parents=True, exist_ok=True)
    paths = {}
    for doc in DEMO_DOCUMENTS:
        p = demo_dir / doc["name"]
        p.write_text(doc["text"], encoding="utf-8")
        paths[doc["name"]] = p
    return paths


def load_demo_patient(db: Session) -> str:
    """Create the demo patient and process all synthetic documents. Returns patient id."""
    patient = Patient(
        name="Demo Patient",
        date_of_birth="1982-04-12",
        gender="Female",
        reference_number="YGC-001",
        known_allergies=json.dumps(["Penicillin"]),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    paths = _write_demo_files()

    for doc in DEMO_DOCUMENTS:
        path = paths[doc["name"]]
        pages, method, ocr_used = extract_text(path, "text/plain")
        text = "\n".join(pages)

        md = MedicalDocument(
            patient_id=patient.id,
            file_name=path.name,
            original_name=doc["name"],
            mime_type="text/plain",
            size_bytes=path.stat().st_size,
            stored_path=str(path),
            page_count=len(pages),
            classification=classify_document(text, doc["name"])[0],
            document_date=doc["date"],
            provider=doc["provider"],
            doctor_name=doc["doctor"],
            processing_status="completed",
            overall_confidence=0.82,
            text_extraction_method=method,
            ocr_used=ocr_used,
        )
        db.add(md)
        db.flush()

        for idx, page_text in enumerate(pages, start=1):
            db.add(
                DocumentPage(
                    document_id=md.id,
                    page_number=idx,
                    text=page_text,
                    method=method,
                    confidence=80.0,
                )
            )

        # Build structured extraction manually (deterministic demo)
        extraction = _build_demo_extraction(doc, text)
        persist_extraction(db, md, extraction)
        md.overall_confidence = 0.82 + (0.0 if "lab" not in doc["name"] else -0.05)
        db.commit()

    # Re-run rules and build timeline
    rerun_rules_for_patient(db, patient.id)
    build_timeline_events(db, patient.id)
    return patient.id


def _build_demo_extraction(doc: dict, text: str) -> StructuredExtraction:
    """Build a deterministic StructuredExtraction for a demo document."""
    extraction = StructuredExtraction(
        patient={"name": "Demo Patient", "date_of_birth": "1982-04-12", "gender": "Female"},
        document={
            "file_name": doc["name"],
            "document_type": doc["name"].split("_")[0].title(),
            "document_date": doc["date"],
            "provider": doc["provider"],
            "doctor_name": doc["doctor"],
            "overall_confidence": 82.0,
        },
        diagnoses_mentioned=[],
        clinical_notes=[text[:200]],
        warnings=[],
    )

    if "prescription" in doc["name"]:
        extraction.patient.allergies.append(
            {"substance": "Penicillin", "reaction": "rash", "severity": "moderate", "confidence": 82.0}
        )
        extraction.medications = [
            {"name_as_written": "Metformin", "dose": "500 mg", "frequency": "BID", "status": "active", "confidence": 82.0},
            {"name_as_written": "Lisinopril", "dose": "10 mg", "frequency": "once daily", "status": "active", "confidence": 82.0},
            {"name_as_written": "Aspirin", "dose": "81 mg", "frequency": "once daily", "status": "active", "confidence": 82.0},
        ]
        extraction.diagnoses_mentioned = ["Type 2 diabetes", "Hypertension"]
    elif "doctor_note" in doc["name"]:
        extraction.medications = [
            {"name_as_written": "Metformin", "dose": "850 mg", "frequency": "BID", "status": "active", "confidence": 82.0},
            {"name_as_written": "Amoxicillin", "dose": "500 mg", "frequency": "three times daily", "duration": "7 days", "status": "active", "confidence": 82.0},
            {"name_as_written": "Lisinopril", "dose": "10 mg", "frequency": "once daily", "status": "active", "confidence": 82.0},
            {"name_as_written": "Aspirin", "dose": "81 mg", "frequency": "once daily", "status": "active", "confidence": 82.0},
        ]
        extraction.lab_results = [
            {"test_name_as_written": "Blood glucose", "value": 152.0, "unit": "mg/dL", "status": "High", "confidence": 78.0},
            {"test_name_as_written": "HbA1c", "value": 7.4, "unit": "%", "status": "High", "confidence": 78.0},
        ]
        extraction.diagnoses_mentioned = ["Type 2 diabetes", "Hypertension", "Respiratory infection"]
    elif "lab_report" in doc["name"]:
        extraction.lab_results = [
            {"test_name_as_written": "Blood glucose", "value": 168.0, "unit": "mg/dL", "status": "High", "confidence": 80.0},
            {"test_name_as_written": "HbA1c", "value": 7.8, "unit": "%", "status": "High", "confidence": 80.0},
            {"test_name_as_written": "Creatinine", "value": 1.1, "unit": "mg/dL", "status": "Normal", "confidence": 80.0},
            {"test_name_as_written": "Total Cholesterol", "value": 210.0, "unit": "mg/dL", "status": "High", "confidence": 80.0},
            {"test_name_as_written": "Haemoglobin", "value": 12.5, "unit": "g/dL", "status": "Normal", "confidence": 80.0},
            {"test_name_as_written": "WBC", "value": 9.2, "unit": "x10^9/L", "status": "Normal", "confidence": 80.0},
        ]
    elif "discharge" in doc["name"]:
        extraction.medications = [
            {"name_as_written": "Metformin", "dose": "500 mg", "frequency": "BID", "status": "active", "confidence": 82.0},
            {"name_as_written": "Lisinopril", "dose": "10 mg", "frequency": "once daily", "status": "active", "confidence": 82.0},
            {"name_as_written": "Atorvastatin", "dose": "20 mg", "frequency": "once daily", "status": "active", "confidence": 82.0},
            {"name_as_written": "Warfarin", "dose": "5 mg", "frequency": "once daily", "status": "active", "confidence": 82.0},
            {"name_as_written": "Aspirin", "dose": "81 mg", "frequency": "once daily", "status": "discontinued", "confidence": 82.0},
        ]
        extraction.lab_results = [
            {"test_name_as_written": "Blood glucose", "value": 175.0, "unit": "mg/dL", "status": "High", "confidence": 80.0},
            {"test_name_as_written": "Creatinine", "value": 1.2, "unit": "mg/dL", "status": "Normal", "confidence": 80.0},
        ]
        extraction.diagnoses_mentioned = ["Hypertension"]
    return extraction
