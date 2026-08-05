"""Document processing orchestration.

Handles text extraction, classification, structured extraction, normalisation,
rule-engine checks, and persistence of all extracted entities.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.ai.provider import get_provider
from app.document_processing.classifier import classify_document, compute_confidence
from app.document_processing.extractor import extract_text
from app.medical_rules.engine import run_all_checks
from app.medical_rules.normalisation import (
    confidence_from_date,
    normalise_lab_test,
    normalise_medicine,
    parse_date,
)
from app.models import (
    Allergy,
    DiagnosisMention,
    DocumentPage,
    LabResult,
    MedicalDocument,
    MedicalVisit,
    Medication,
    SafetyAlert,
)
from app.schemas.medical import StructuredExtraction

logger = logging.getLogger(__name__)

PROCESSING_STAGES = [
    "Reading document",
    "Extracting text",
    "Detecting document type",
    "Detecting patient information",
    "Extracting prescriptions",
    "Extracting allergies",
    "Extracting lab results",
    "Normalising medicine names",
    "Checking medication risks",
    "Analysing lab trends",
    "Building patient timeline",
    "Preparing dashboard",
]


def _find_entity_page(pages: list[str], search_terms: list[str | None]) -> int:
    """Find the 1-indexed page where any of the search terms appear."""
    for idx, page_text in enumerate(pages, start=1):
        lower_page = page_text.lower()
        for term in search_terms:
            if term and len(term.strip()) >= 3 and term.lower() in lower_page:
                return idx
    return 1


def process_document(
    db: Session,
    doc: MedicalDocument,
    run_rules: bool = True,
    progress_callback=None,
) -> MedicalDocument:
    """Run the full extraction pipeline for a single document with optional real stage updates."""
    doc.processing_status = "processing"
    db.commit()

    def update_stage(stage_name: str, pct: float):
        if progress_callback:
            try:
                progress_callback(stage_name, pct)
            except Exception as e:
                logger.warning("Stage callback error: %s", e)

    try:
        update_stage("Reading document", 10.0)
        stored = Path(doc.stored_path) if doc.stored_path else None
        if stored is None or not stored.exists():
            raise FileNotFoundError("Stored file missing")

        # 1. Extract text
        update_stage("Extracting text", 25.0)
        pages, method, ocr_used = extract_text(stored, doc.mime_type)
        text = "\n".join(pages).strip()
        doc.text_extraction_method = method
        doc.ocr_used = ocr_used
        doc.page_count = max(1, len(pages))
        db.commit()

        # Save page-level text
        db.query(DocumentPage).filter(DocumentPage.document_id == doc.id).delete()
        for idx, page_text in enumerate(pages, start=1):
            db.add(
                DocumentPage(
                    document_id=doc.id,
                    page_number=idx,
                    text=page_text,
                    method=method,
                    confidence=80.0 if not ocr_used else 60.0,
                )
            )
        db.commit()

        if not text.strip():
            doc.processing_status = "needs_review"
            doc.error_message = "No text could be extracted. The document may be empty, scanned poorly, or password-protected."
            db.commit()
            update_stage("Completed with review needed", 100.0)
            return doc

        # 2. Classify
        update_stage("Detecting document type", 40.0)
        classification, _ = classify_document(text, doc.original_name)
        doc.classification = classification

        # 3. Structured extraction via AI provider
        update_stage("Extracting clinical entities", 60.0)
        provider = get_provider()
        raw = provider.extract_structured(text, doc.original_name)
        extraction = StructuredExtraction.model_validate(raw)

        # 4. Normalise medications and labs
        update_stage("Normalising medicine & lab names", 75.0)
        meds = []
        for m in extraction.medications:
            norm = normalise_medicine(m.name_as_written)
            meds.append({**m.model_dump(), **norm})
        extraction.medications = meds  # type: ignore[assignment]

        labs = []
        for lab in extraction.lab_results:
            norm = normalise_lab_test(lab.test_name_as_written)
            labs.append({**lab.model_dump(), **norm})
        extraction.lab_results = labs  # type: ignore[assignment]

        # 5. Compute document-level confidence
        date_conf = confidence_from_date(extraction.document.document_date)
        overall = compute_confidence(
            ocr_used=ocr_used,
            text_length=len(text),
            structured={"medications": meds, "lab_results": labs},
            date_confidence=date_conf,
        )
        doc.overall_confidence = overall
        if extraction.document.document_date:
            doc.document_date = parse_date(extraction.document.document_date)
        else:
            doc.document_date = None
        doc.provider = extraction.document.provider
        doc.doctor_name = extraction.document.doctor_name

        # 6. Persist structured entities with accurate page tracking
        update_stage("Persisting entities & cross-referencing", 85.0)
        persist_extraction(db, doc, extraction, pages)

        if run_rules:
            update_stage("Checking medication risks & lab trends", 92.0)
            rerun_rules_for_patient(db, doc.patient_id)

        doc.processing_status = "completed"
        doc.error_message = None
        db.commit()
        update_stage("Completed", 100.0)
        return doc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Processing failed for document %s", doc.id)
        doc.processing_status = "failed"
        doc.error_message = friendly_error(exc)
        db.commit()
        update_stage(f"Failed: {friendly_error(exc)}", 100.0)
        return doc


def friendly_error(exc: Exception) -> str:
    """Map technical exceptions to user-friendly messages."""
    msg = str(exc).lower()
    if "invalid structured output" in msg:
        return "AI extraction returned invalid data. Please try again."
    if "password" in msg or "encrypted" in msg:
        return "The PDF is password-protected. Please upload an unlocked copy."
    if "corrupt" in msg or "damaged" in msg or "file was not found" in msg:
        return "The document appears to be corrupted. Please upload it again."
    if "empty" in msg or "no text" in msg:
        return "No text could be extracted from this document. It may need manual review."
    if "timeout" in msg or "timed out" in msg:
        return "Processing timed out. Please try again."
    if "api" in msg or "openai" in msg or "network" in msg:
        return "The AI service is unavailable. Please try again later."
    return "Processing failed. Please try again or upload a clearer document."


def persist_extraction(
    db: Session,
    doc: MedicalDocument,
    extraction: StructuredExtraction,
    pages: list[str] | None = None,
) -> None:
    """Store extracted medications, labs, allergies, diagnoses, visit, and evidence with page tracking."""
    pages_list = pages or []

    # Visit
    visit = MedicalVisit(
        patient_id=doc.patient_id,
        document_id=doc.id,
        visit_date=parse_date(extraction.document.document_date),
        provider=extraction.document.provider,
        doctor_name=extraction.document.doctor_name,
        visit_summary="; ".join(extraction.clinical_notes[:3]),
        confidence=extraction.document.overall_confidence,
    )
    db.add(visit)
    db.flush()

    for m in extraction.medications:
        md = m.model_dump() if hasattr(m, "model_dump") else m
        page_num = md.get("page_number")
        if not page_num and pages_list:
            page_num = _find_entity_page(pages_list, [md.get("name_as_written"), md.get("generic_name"), md.get("source_text")])

        med = Medication(
            patient_id=doc.patient_id,
            document_id=doc.id,
            visit_id=visit.id,
            name_as_written=md.get("name_as_written") or "",
            normalised_name=md.get("normalised_name"),
            generic_name=md.get("generic_name"),
            brand_name=md.get("brand_name"),
            active_ingredient=md.get("active_ingredient"),
            strength=md.get("strength"),
            dose=md.get("dose"),
            frequency=md.get("frequency"),
            duration=md.get("duration"),
            route=md.get("route"),
            start_date=parse_date(md.get("start_date")),
            end_date=parse_date(md.get("end_date")),
            status=md.get("status"),
            instructions=md.get("instructions"),
            match_confidence=md.get("match_confidence", 0.0),
            confidence=md.get("confidence", 0.0),
            source_text=md.get("source_text"),
            page_number=page_num or 1,
        )
        db.add(med)

    for lab in extraction.lab_results:
        ld = lab.model_dump() if hasattr(lab, "model_dump") else lab
        page_num = ld.get("page_number")
        if not page_num and pages_list:
            page_num = _find_entity_page(pages_list, [ld.get("test_name_as_written"), ld.get("normalised_test_name"), ld.get("source_text")])

        lab_res = LabResult(
            patient_id=doc.patient_id,
            document_id=doc.id,
            test_name_as_written=ld.get("test_name_as_written") or "",
            normalised_test_name=ld.get("normalised_test_name"),
            value=ld.get("value"),
            text_value=ld.get("text_value"),
            unit=ld.get("unit"),
            reference_min=ld.get("reference_min"),
            reference_max=ld.get("reference_max"),
            reference_text=ld.get("reference_text"),
            status=ld.get("status"),
            date=parse_date(ld.get("date")) or parse_date(doc.document_date),
            confidence=ld.get("confidence", 0.0),
            source_text=ld.get("source_text"),
            page_number=page_num or 1,
        )
        db.add(lab_res)

    for a in extraction.patient.allergies:
        ad = a.model_dump() if hasattr(a, "model_dump") else a
        page_num = ad.get("page_number")
        if not page_num and pages_list:
            page_num = _find_entity_page(pages_list, [ad.get("substance"), ad.get("source_text")])

        allergy = Allergy(
            patient_id=doc.patient_id,
            document_id=doc.id,
            substance=ad.get("substance"),
            reaction=ad.get("reaction"),
            severity=ad.get("severity"),
            date_recorded=parse_date(ad.get("date_recorded")),
            confidence=ad.get("confidence", 0.0),
            source_text=ad.get("source_text"),
            page_number=page_num or 1,
        )
        db.add(allergy)

    for dx in extraction.diagnoses_mentioned:
        page_num = _find_entity_page(pages_list, [dx]) if pages_list else 1
        db.add(
            DiagnosisMention(
                patient_id=doc.patient_id,
                visit_id=visit.id,
                document_id=doc.id,
                diagnosis=dx,
                confidence=extraction.document.overall_confidence,
                page_number=page_num,
            )
        )

    db.commit()


def rerun_rules_for_patient(db: Session, patient_id: str) -> None:
    """Clear and regenerate safety alerts for a patient with authentic page references."""
    db.query(SafetyAlert).filter(SafetyAlert.patient_id == patient_id).delete()

    meds = (
        db.query(Medication)
        .filter(Medication.patient_id == patient_id)
        .all()
    )
    allergies = (
        db.query(Allergy)
        .filter(Allergy.patient_id == patient_id)
        .all()
    )
    med_dicts = [
        {
            "name_as_written": m.name_as_written,
            "normalised_name": m.normalised_name,
            "dose": m.dose,
            "frequency": m.frequency,
            "duration": m.duration,
            "route": m.route,
            "status": m.status,
            "confidence": m.confidence,
            "source_document": db.get(MedicalDocument, m.document_id).original_name if m.document_id else "",
            "page_number": getattr(m, "page_number", 1) or 1,
        }
        for m in meds
    ]
    allergy_dicts = [
        {
            "substance": a.substance,
            "reaction": a.reaction,
            "severity": a.severity,
            "source_document": db.get(MedicalDocument, a.document_id).original_name if a.document_id else "",
            "page_number": getattr(a, "page_number", 1) or 1,
        }
        for a in allergies
    ]

    alerts = run_all_checks(med_dicts, allergy_dicts)
    for a in alerts:
        db.add(
            SafetyAlert(
                patient_id=patient_id,
                title=a["title"],
                category=a["category"],
                risk_level=a["risk_level"],
                medications_involved=json.dumps(a.get("medications_involved", [])),
                relevant_dates=json.dumps(a.get("relevant_dates", [])),
                explanation=a.get("explanation"),
                evidence=json.dumps(a.get("evidence", [])),
                source_documents=json.dumps(a.get("source_documents", [])),
                page_numbers=json.dumps(a.get("page_numbers", [])),
                confidence=a.get("confidence", 0.0),
                recommended_action=a.get("recommended_action"),
            )
        )
    db.commit()

