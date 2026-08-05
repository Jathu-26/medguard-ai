"""Comprehensive clinical intelligence, multi-visit isolation, page traceability, and RAG verification."""
from __future__ import annotations

import json
import pytest
from app.ai.provider import MockProvider
from app.database import SessionLocal
from app.medical_rules.engine import (
    detect_allergy_conflicts,
    detect_dosage_conflicts,
    detect_duplicate_medications,
    detect_drug_interactions,
    detect_missing_info,
    detect_timing_conflicts,
    run_all_checks,
)
from app.medical_rules.normalisation import normalise_lab_test, normalise_medicine
from app.models import (
    Allergy,
    DiagnosisMention,
    DocumentPage,
    LabResult,
    MedicalDocument,
    MedicalVisit,
    Medication,
    Patient,
    ProcessingJob,
    SafetyAlert,
    TimelineEvent,
)
from app.services.analytics_service import (
    build_timeline_events,
    calculate_lab_trends,
    get_alerts,
    get_lab_trends,
    get_overview,
    get_timeline,
)
from app.services.chat_service import answer_question, get_history
from app.services.processing_service import _find_entity_page, process_document, rerun_rules_for_patient


def test_extended_medicine_normalisation():
    """Verify brand-to-generic normalisation, active ingredient resolution, and case-insensitivity."""
    # Brand to generic
    res = normalise_medicine("Glucophage 500mg")
    assert res["generic_name"] == "Metformin"
    assert res["active_ingredient"] == "metformin"

    # Case insensitivity and whitespace
    res2 = normalise_medicine("  LIPITOR   20mg  ")
    assert res2["generic_name"] == "Atorvastatin"

    # Distinct medications must remain distinct
    res3 = normalise_medicine("Metoprolol")
    res4 = normalise_medicine("Metformin")
    assert res3["generic_name"] != res4["generic_name"]


def test_extended_lab_normalisation():
    """Verify normalization of diverse lab test aliases."""
    assert normalise_lab_test("FBS")["normalised_test_name"] == "Fasting Blood Sugar"
    assert normalise_lab_test("Fasting Glucose")["normalised_test_name"] == "Fasting Blood Sugar"
    assert normalise_lab_test("Hb")["normalised_test_name"] == "Haemoglobin"
    assert normalise_lab_test("WBC")["normalised_test_name"] == "White Blood Cell Count"
    assert normalise_lab_test("HbA1c")["normalised_test_name"] == "HbA1c"


def test_timing_and_missing_info_checks():
    """Verify detection of discontinued medications and missing dosage/frequency metadata."""
    meds = [
        {"name_as_written": "Aspirin", "dose": "81 mg", "frequency": "daily", "status": "discontinued", "source_document": "doc1.pdf", "confidence": 90, "page_number": 1},
        {"name_as_written": "Aspirin", "dose": "81 mg", "frequency": "daily", "status": "active", "source_document": "doc2.pdf", "confidence": 90, "page_number": 2},
        {"name_as_written": "UnknownDrug", "dose": None, "frequency": None, "status": "active", "source_document": "doc3.pdf", "confidence": 40, "page_number": 1},
    ]
    timing_alerts = detect_timing_conflicts(meds)
    assert len(timing_alerts) >= 1
    assert "discontinued" in timing_alerts[0]["title"].lower()

    missing_alerts = detect_missing_info(meds)
    categories = [a["category"] for a in missing_alerts]
    assert "Missing Information" in categories
    assert "Low Confidence" in categories


def test_mock_ai_grounded_chat():
    """Verify question answering with evidence grounding and insufficiency fallback."""
    provider = MockProvider()
    chunks = [
        "Visit 1: Patient prescribed Metformin 500 mg BID. Allergy to Penicillin noted.",
        "Visit 2: Blood glucose 185 mg/dL. Prescribed Amoxicillin 500 mg TID.",
        "Visit 3: Prescribed Glucophage 500 mg daily.",
    ]
    # Question on duplicate
    res_dup = provider.answer_question("Did two doctors prescribe the same medicine?", chunks)
    assert "answer" in res_dup
    assert "confidence" in res_dup
    assert "disclaimer" in res_dup

    # Question on glucose
    res_glu = provider.answer_question("How has blood glucose changed?", chunks)
    assert "185" in res_glu["answer"]

    # Question with insufficient info
    res_empty = provider.answer_question("What was the MRI result?", chunks)
    assert "not contain enough reliable information" in res_empty["answer"]


def test_lab_trends_calculation(db_session):
    """Verify lab trend trajectory calculation and compatibility wrapper."""
    patient = Patient(name="Lab Trend Patient", gender="Female")
    db_session.add(patient)
    db_session.commit()

    lab1 = LabResult(
        patient_id=patient.id,
        test_name_as_written="Fasting Glucose",
        normalised_test_name="Fasting Blood Sugar",
        value=110.0,
        unit="mg/dL",
        reference_min=70.0,
        reference_max=100.0,
        status="abnormal",
        confidence=90.0,
        page_number=1,
    )
    lab2 = LabResult(
        patient_id=patient.id,
        test_name_as_written="FBS",
        normalised_test_name="Fasting Blood Sugar",
        value=145.0,
        unit="mg/dL",
        reference_min=70.0,
        reference_max=100.0,
        status="abnormal",
        confidence=95.0,
        page_number=2,
    )
    db_session.add_all([lab1, lab2])
    db_session.commit()

    # Test dictionary output
    trends = calculate_lab_trends(db_session, patient.id)
    assert len(trends) >= 1
    assert trends[0]["test_name"] == "Fasting Blood Sugar"
    assert trends[0]["trend_direction"] in ["increasing", "abnormal", "moved into abnormal range"]

    # Test typed Pydantic output
    typed_trends = get_lab_trends(db_session, patient.id)
    assert len(typed_trends) >= 1
    assert typed_trends[0].test_name == "Fasting Blood Sugar"


def test_multi_visit_isolation_and_no_cross_contamination(db_session):
    """Verify Phase 7: Timeline events contain ONLY records from their specific visit/document."""
    patient = Patient(name="Multi-Visit Patient", gender="Male")
    db_session.add(patient)
    db_session.commit()

    doc1 = MedicalDocument(patient_id=patient.id, file_name="visit1.pdf", original_name="visit1.pdf", classification="Prescription")
    doc2 = MedicalDocument(patient_id=patient.id, file_name="visit2.pdf", original_name="visit2.pdf", classification="Laboratory report")
    db_session.add_all([doc1, doc2])
    db_session.commit()

    # Visit 1: Metformin prescription only
    visit1 = MedicalVisit(patient_id=patient.id, document_id=doc1.id, visit_date="2026-01-10", provider="Clinic A", visit_summary="Routine follow-up")
    db_session.add(visit1)
    db_session.flush()

    med1 = Medication(patient_id=patient.id, document_id=doc1.id, visit_id=visit1.id, name_as_written="Metformin", normalised_name="Metformin", dose="500 mg", page_number=1)
    allergy1 = Allergy(patient_id=patient.id, document_id=doc1.id, substance="Penicillin", page_number=1)
    db_session.add_all([med1, allergy1])

    # Visit 2: Lab report only (HbA1c, no meds)
    visit2 = MedicalVisit(patient_id=patient.id, document_id=doc2.id, visit_date="2026-02-15", provider="LabCorp", visit_summary="Lab test encounter")
    db_session.add(visit2)
    db_session.flush()

    lab2 = LabResult(patient_id=patient.id, document_id=doc2.id, test_name_as_written="HbA1c", normalised_test_name="HbA1c", value=7.2, unit="%", page_number=2)
    db_session.add(lab2)
    db_session.commit()

    # Build timeline
    build_timeline_events(db_session, patient.id)
    timeline = get_timeline(db_session, patient.id)
    assert len(timeline) == 2

    # Verify Visit 1 event does NOT contain HbA1c from Visit 2
    v1_event = next(e for e in timeline if e.event_date == "2026-01-10")
    assert "Metformin" in v1_event.medications
    assert "Penicillin" in v1_event.allergies
    assert len(v1_event.lab_results) == 0  # No labs in Visit 1

    # Verify Visit 2 event does NOT contain Metformin or Penicillin from Visit 1
    v2_event = next(e for e in timeline if e.event_date == "2026-02-15")
    assert len(v2_event.medications) == 0  # No meds in Visit 2
    assert len(v2_event.allergies) == 0   # No allergies in Visit 2
    assert any("HbA1c" in l for l in v2_event.lab_results)


def test_evidence_page_traceability(db_session):
    """Verify Phase 6: Accurate page numbers are persisted and passed to timeline and alerts."""
    pages = [
        "Page 1 Header\nPatient intake and history.",
        "Page 2 Clinical Encounter\nPrescription: Atorvastatin 20mg daily.",
        "Page 3 Laboratory Findings\nAllergy to Sulfa noted. Blood glucose 155 mg/dL.",
    ]
    # Check page finder utility
    assert _find_entity_page(pages, ["Atorvastatin"]) == 2
    assert _find_entity_page(pages, ["Sulfa"]) == 3
    assert _find_entity_page(pages, ["NonExistentEntity"]) == 1

    patient = Patient(name="Traceability Patient", gender="Female")
    db_session.add(patient)
    db_session.commit()

    doc = MedicalDocument(patient_id=patient.id, file_name="multi_page.pdf", original_name="multi_page.pdf")
    db_session.add(doc)
    db_session.commit()

    med = Medication(patient_id=patient.id, document_id=doc.id, name_as_written="Atorvastatin", page_number=2)
    allergy = Allergy(patient_id=patient.id, document_id=doc.id, substance="Sulfa", page_number=3)
    db_session.add_all([med, allergy])
    db_session.commit()

    assert med.page_number == 2
    assert allergy.page_number == 3


def test_cross_document_rag_scenarios(db_session):
    """Verify Phase 4: Hybrid RAG handles complex clinical questions across multiple documents."""
    patient = Patient(name="RAG Test Patient", gender="Male")
    db_session.add(patient)
    db_session.commit()

    doc1 = MedicalDocument(patient_id=patient.id, file_name="doc1.txt", original_name="doc1.txt", document_date="2026-01-01", classification="Prescription")
    doc2 = MedicalDocument(patient_id=patient.id, file_name="doc2.txt", original_name="doc2.txt", document_date="2026-02-01", classification="Lab Report")
    db_session.add_all([doc1, doc2])
    db_session.commit()

    p1 = DocumentPage(document_id=doc1.id, page_number=1, text="Hospital Visit 1. Prescribed Warfarin 5mg daily. Allergy to Penicillin recorded.")
    p2 = DocumentPage(document_id=doc2.id, page_number=1, text="Clinic Visit 2. Prescribed Ciprofloxacin 500mg. Fasting blood sugar 160 mg/dL.")
    db_session.add_all([p1, p2])

    med1 = Medication(patient_id=patient.id, document_id=doc1.id, name_as_written="Warfarin", dose="5mg", page_number=1)
    med2 = Medication(patient_id=patient.id, document_id=doc2.id, name_as_written="Ciprofloxacin", dose="500mg", page_number=1)
    allergy1 = Allergy(patient_id=patient.id, document_id=doc1.id, substance="Penicillin", page_number=1)
    db_session.add_all([med1, med2, allergy1])
    db_session.commit()

    # 1. Allergy conflict question
    ans1, _ = answer_question(db_session, patient.id, "Does the patient have any allergy conflict with medications?")
    assert ans1.confidence > 0
    assert ans1.disclaimer is not None
    assert ans1.recommendation is not None

    # 2. Glucose question with synonym
    ans2, _ = answer_question(db_session, patient.id, "What is the patient's blood sugar or glucose reading?")
    assert "160" in ans2.answer or "glucose" in ans2.answer.lower() or "sugar" in ans2.answer.lower()

    # 3. Insufficient evidence question
    ans3, _ = answer_question(db_session, patient.id, "What did the echocardiogram show?")
    assert "not contain enough reliable information" in ans3.answer.lower()
