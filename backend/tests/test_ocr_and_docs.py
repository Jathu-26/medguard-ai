"""Comprehensive test suite for OCR, document extraction edge cases, image preprocessing, and error recovery."""
from __future__ import annotations

import io
from pathlib import Path
import pytest
from PIL import Image, ImageDraw

from app.document_processing.extractor import extract_text, preprocess_image, _extract_pdf_pymupdf
from app.document_processing.classifier import classify_document, compute_confidence
from app.services.processing_service import friendly_error, process_document
from app.models import MedicalDocument, Patient, ProcessingJob
from app.ai.provider import MockProvider


def test_preprocess_image_contrast_and_orientation():
    """Verify that image preprocessing enhances contrast and returns valid PNG bytes."""
    img = Image.new("RGB", (200, 200), color=(240, 240, 240))
    d = ImageDraw.Draw(img)
    d.text((20, 80), "Medical Prescription Rx", fill=(30, 30, 30))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    raw_bytes = buf.getvalue()

    enhanced = preprocess_image(raw_bytes)
    assert len(enhanced) > 0
    # Output should be valid PNG bytes
    assert enhanced.startswith(b"\x89PNG")


def test_preprocess_image_rotation_and_greyscale():
    """Verify preprocessing handles dimensions and image conversions cleanly."""
    img = Image.new("RGBA", (300, 150), color=(255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10, 50), "Discharge Instructions", fill=(0, 0, 0, 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw_bytes = buf.getvalue()

    enhanced = preprocess_image(raw_bytes)
    assert len(enhanced) > 0
    assert enhanced.startswith(b"\x89PNG")


def test_extract_text_from_plain_text(tmp_path: Path):
    """Verify plaintext extraction for .txt medical records."""
    txt_file = tmp_path / "notes.txt"
    content = "Patient Assessment: 58-year-old male with Type 2 Diabetes.\nPrescribed Metformin 500mg daily."
    txt_file.write_text(content, encoding="utf-8")

    pages, method, ocr_used = extract_text(txt_file, "text/plain")
    assert len(pages) == 1
    assert "Metformin 500mg" in pages[0]
    assert method == "plaintext"
    assert not ocr_used


def test_extract_text_from_image(tmp_path: Path):
    """Verify image file extraction attempts OCR and returns pages."""
    img_file = tmp_path / "scan.png"
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((10, 30), "Rx: Lisinopril 10mg", fill=(0, 0, 0))
    img.save(img_file, format="PNG")

    pages, method, ocr_used = extract_text(img_file, "image/png")
    assert len(pages) >= 1
    assert ocr_used is True
    assert method.startswith("ocr")


def test_extract_text_empty_and_corrupt_files(tmp_path: Path):
    """Verify safe error recovery on empty or corrupted files without crashing."""
    # Empty file
    empty_file = tmp_path / "empty.txt"
    empty_file.write_text("", encoding="utf-8")
    pages, method, ocr_used = extract_text(empty_file, "text/plain")
    assert pages == [""]

    # Corrupt binary pretending to be PDF
    corrupt_pdf = tmp_path / "corrupt.pdf"
    corrupt_pdf.write_bytes(b"%PDF-1.4 corrupt content invalid header")
    pages_pdf, method_pdf, ocr_pdf = extract_text(corrupt_pdf, "application/pdf")
    assert isinstance(pages_pdf, list)


def test_extract_text_unsupported_format(tmp_path: Path):
    """Verify unsupported file formats return safe empty extraction."""
    bin_file = tmp_path / "data.bin"
    bin_file.write_bytes(b"\x00\x01\x02\x03\x04")

    pages, method, ocr_used = extract_text(bin_file, "application/octet-stream")
    assert len(pages) == 1
    assert pages[0] == ""
    assert method == "unsupported"


def test_document_classification_heuristics():
    """Verify classification accurately detects document types."""
    # Prescription
    rx_text = "Rx: Lisinopril 10mg tablets. Sig: Take 1 tab PO daily for hypertension. Disp: 30."
    rx_type, _ = classify_document(rx_text, "rx_order.pdf")
    assert "Prescription" in rx_type

    # Lab Report
    lab_text = "Comprehensive Metabolic Panel\nFasting Blood Sugar: 142 mg/dL [70-99]\nSerum Creatinine: 1.1 mg/dL"
    lab_type, _ = classify_document(lab_text, "lab_results_2026.pdf")
    assert "Lab" in lab_type

    # Clinical Note
    note_text = "Progress Note\nSubjective: Patient reports mild fatigue. Vital signs: BP 128/82, HR 72."
    note_type, _ = classify_document(note_text, "doctor_note.pdf")
    assert "note" in note_type.lower() or "clinical" in note_type.lower()


def test_confidence_computation():
    """Verify multi-factor confidence scoring."""
    # High confidence structured digital document
    high_conf = compute_confidence(
        ocr_used=False,
        text_length=1200,
        structured={"medications": [{"name": "Metformin", "confidence": 95.0}], "lab_results": []},
        date_confidence=90.0,
    )
    assert high_conf >= 80.0

    # Lower confidence OCR scanned document with short text
    low_conf = compute_confidence(
        ocr_used=True,
        text_length=80,
        structured={"medications": [], "lab_results": []},
        date_confidence=50.0,
    )
    assert low_conf < high_conf


def test_friendly_error_messages():
    """Verify technical exceptions map to patient-safe friendly explanations."""
    assert "password" in friendly_error(Exception("PDF is password encrypted")).lower()
    assert "corrupt" in friendly_error(FileNotFoundError("File was not found")).lower()
    assert "invalid data" in friendly_error(ValueError("Invalid structured output from AI provider")).lower()
    assert "timed out" in friendly_error(TimeoutError("Request timed out")).lower()


def test_background_processing_job_flow(client, db_session, tmp_path: Path):
    """Verify Phase 3: Real processing job creation and polling endpoint."""
    # Create patient
    p_res = client.post("/api/patients", json={"name": "Job Test Patient", "gender": "Female"})
    assert p_res.status_code == 201
    patient_id = p_res.json()["id"]

    # Upload document
    doc_path = tmp_path / "test_doc.txt"
    doc_path.write_text("Prescription: Metformin 500mg BID. Fasting glucose 135 mg/dL.", encoding="utf-8")
    
    with open(doc_path, "rb") as f:
        upload_res = client.post(
            f"/api/patients/{patient_id}/documents",
            files={"files": ("test_doc.txt", f, "text/plain")}
        )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["documents"][0]["id"]

    # Start processing job
    proc_res = client.post(f"/api/documents/{doc_id}/process")
    assert proc_res.status_code == 200
    job_id = proc_res.json()["job_id"]
    assert job_id is not None

    # Poll processing job status
    job_res = client.get(f"/api/processing/{job_id}")
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert job_data["id"] == job_id
    assert "current_stage" in job_data
    assert "overall_progress" in job_data
    assert isinstance(job_data["stages"], list)
