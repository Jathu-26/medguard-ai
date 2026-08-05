"""Document classification based on extracted text."""
from __future__ import annotations

import re

_CLASSIFICATION_RULES: list[tuple[str, str, str]] = [
    # (label, keyword regex, confidence boost)
    ("Laboratory report", r"\b(laboratory report|labs?|blood test|glucose|creatinine|hba1c|hdl|ldl|haemoglobin|white blood cell|platelet)\b", "high"),
    ("Prescription", r"\b(prescription|tablet|capsule|dispense|take \d+ (mg|g)|sig:|rx)\b", "high"),
    ("Discharge summary", r"\b(discharge summary|discharge instructions|discharged|admission summary)\b", "high"),
    ("Doctor note", r"\b(doctor note|clinical note|progress note|consultation|clinic note|office note)\b", "high"),
    ("Medical certificate", r"\b(medical certificate|fit to work|sick leave|medical leave)\b", "high"),
]

_UNKNOWN_LABEL = "Unknown medical document"
_REVIEW_LABEL = "Unknown – requires review"


def classify_document(text: str, file_name: str) -> tuple[str, float]:
    """Return (classification, confidence 0-100)."""
    lower = (file_name + " " + text).lower()
    if not text.strip():
        return _REVIEW_LABEL, 20.0

    best_label = _UNKNOWN_LABEL
    best_score = 30.0
    for label, pattern, boost in _CLASSIFICATION_RULES:
        matches = len(re.findall(pattern, lower))
        if matches > 0:
            score = 55.0 + min(20.0, matches * 8.0)
            if boost == "high":
                score += 10.0
            if score > best_score:
                best_score = score
                best_label = label

    if best_label == _UNKNOWN_LABEL:
        return _REVIEW_LABEL, 25.0
    return best_label, round(min(best_score, 96.0), 1)


def compute_confidence(
    ocr_used: bool, text_length: int, structured: dict, date_confidence: float = 0.0
) -> float:
    """Compute an overall extraction confidence score (0-100)."""
    score = 75.0
    if ocr_used:
        score -= 10.0  # OCR is less reliable
    else:
        score += 5.0

    if text_length < 40:
        score -= 15.0
    elif text_length < 100:
        score -= 5.0
    elif text_length > 500:
        score += 5.0

    med_count = len(structured.get("medications", []))
    lab_count = len(structured.get("lab_results", []))
    if med_count == 0 and lab_count == 0:
        score -= 12.0
    else:
        score += 6.0

    if date_confidence:
        score += (date_confidence - 50.0) * 0.15

    return round(max(5.0, min(98.0, score)), 1)
