"""Deterministic medical safety rule engine.

Kept separate from LLM prompts. The rules operate on normalised structured data.
"""
from __future__ import annotations

import re
from collections import defaultdict

from app.medical_rules.knowledge import get_interaction
from app.medical_rules.normalisation import normalise_medicine

# Risk levels
INFO, LOW, MEDIUM, HIGH, CRITICAL = "Informational", "Low", "Medium", "High", "Critical"

# Formatting helpers
_DOSE_TOKEN = re.compile(r"([0-9.]+)\s*(mg|g|mcg|ml|units|u|%)", re.I)


def _digest_dose(dose: str | None) -> tuple[float | None, str | None]:
    """Extract (numeric value, unit) from a dose string."""
    if not dose:
        return None, None
    m = _DOSE_TOKEN.search(dose)
    if not m:
        return None, None
    return float(m.group(1)), m.group(2).lower()


def _freq_matches(f1: str | None, f2: str | None) -> bool:
    if not f1 or not f2:
        return False
    return f1.strip().lower() == f2.strip().lower()


def _key(med: dict) -> str:
    """Return a stable normalised key for a medication dict."""
    return med.get("normalised_name") or med.get("name_as_written") or med.get("name") or ""


def _display_name(med: dict) -> str:
    return med.get("normalised_name") or med.get("name_as_written") or med.get("name") or "Unknown"


def _status(med: dict) -> str:
    s = (med.get("status") or "").lower()
    return s


def _active(med: dict) -> bool:
    return _status(med) in {"", "active", "current", "ongoing", "continue"}


def detect_duplicate_medications(medications: list[dict]) -> list[dict]:
    """Detect exact duplicates, same active ingredient, and same generic with different brands."""
    alerts: list[dict] = []
    grouped: dict[str, list[dict]] = defaultdict(list)
    for med in medications:
        grouped[_key(med).lower()].append(med)

    for key, items in grouped.items():
        if len(items) < 2:
            continue
        # Same normalised name => exact/generic duplicate
        alerts.append(
            {
                "title": "Duplicate medication detected",
                "category": "Duplicate Medication",
                "risk_level": MEDIUM,
                "medications_involved": sorted({_display_name(m) for m in items}),
                "explanation": (
                    f"The medication '{_display_name(items[0])}' appears more than once across the "
                    "uploaded records. This may indicate the same medicine was prescribed by multiple "
                    "providers. This should be reviewed by a doctor or pharmacist."
                ),
                "evidence": [f"{_display_name(m)} ({m.get('source_document','')})" for m in items],
                "source_documents": sorted({m.get("source_document", "") for m in items}),
                "page_numbers": sorted({m.get("page_number") or 1 for m in items}),
                "confidence": 78.0,
                "recommended_action": "Professional review strongly recommended.",
            }
        )

    # Same active ingredient across different names
    active_group: dict[str, list[dict]] = defaultdict(list)
    for med in medications:
        resolved = normalise_medicine(_display_name(med))
        if resolved.get("matched_key"):
            active_group[resolved["matched_key"]].append(med)

    for key, items in active_group.items():
        names = {_display_name(m) for m in items}
        if len(names) > 1:
            alerts.append(
                {
                    "title": "Same active ingredient detected",
                    "category": "Duplicate Medication",
                    "risk_level": MEDIUM,
                    "medications_involved": sorted(names),
                    "explanation": (
                        f"Multiple medications with the same active ingredient were found: "
                        f"{', '.join(sorted(names))}. This may result in an unintended double dose."
                    ),
                    "evidence": [f"{_display_name(m)} ({m.get('source_document','')})" for m in items],
                    "source_documents": sorted({m.get("source_document", "") for m in items}),
                    "page_numbers": sorted({m.get("page_number") or 1 for m in items}),
                    "confidence": 72.0,
                    "recommended_action": "Professional review strongly recommended.",
                }
            )
    return alerts


def detect_drug_interactions(medications: list[dict]) -> list[dict]:
    """Detect potential drug interactions between medications."""
    alerts: list[dict] = []
    meds = list(medications)
    for i in range(len(meds)):
        for j in range(i + 1, len(meds)):
            a, b = meds[i], meds[j]
            ra = normalise_medicine(_display_name(a))
            rb = normalise_medicine(_display_name(b))
            if not ra.get("matched_key") or not rb.get("matched_key"):
                continue
            info = get_interaction(ra["matched_key"], rb["matched_key"])
            if info:
                alerts.append(
                    {
                        "title": f"Potential drug interaction: {_display_name(a)} + {_display_name(b)}",
                        "category": "Drug Interaction",
                        "risk_level": info["risk"],
                        "medications_involved": [_display_name(a), _display_name(b)],
                        "explanation": (
                            f"Potential interaction detected between {_display_name(a)} and "
                            f"{_display_name(b)}. {info['description']} This should be reviewed by a "
                            "doctor or pharmacist."
                        ),
                        "evidence": [
                            f"{_display_name(a)} ({a.get('source_document','')})",
                            f"{_display_name(b)} ({b.get('source_document','')})",
                        ],
                        "source_documents": sorted(
                            {a.get("source_document", ""), b.get("source_document", "")}
                        ),
                        "page_numbers": sorted(
                            {(a.get("page_number") or 1), (b.get("page_number") or 1)}
                        ),
                        "confidence": 70.0,
                        "recommended_action": "Professional review strongly recommended.",
                    }
                )
    return alerts


def detect_dosage_conflicts(medications: list[dict]) -> list[dict]:
    """Detect conflicting dosage, frequency, duration, or route for the same medication."""
    alerts: list[dict] = []
    grouped: dict[str, list[dict]] = defaultdict(list)
    for med in medications:
        grouped[_key(med).lower()].append(med)

    for key, items in grouped.items():
        if len(items) < 2:
            continue
        doses = {_digest_dose(m.get("dose")) for m in items}
        freqs = {_freq_matches(m.get("frequency"), m.get("frequency")) and m.get("frequency") for m in items}
        routes = {m.get("route") for m in items}
        durations = {m.get("duration") for m in items}

        if len(doses) > 1:
            alerts.append(
                {
                    "title": "Possible dosage conflict detected",
                    "category": "Dosage Conflict",
                    "risk_level": HIGH,
                    "medications_involved": [_display_name(items[0])],
                    "explanation": (
                        f"Different dosages were recorded for '{_display_name(items[0])}' across "
                        "documents. Available records may be incomplete."
                    ),
                    "evidence": [f"{_display_name(m)} dose={m.get('dose')} ({m.get('source_document','')})" for m in items],
                    "source_documents": sorted({m.get("source_document", "") for m in items}),
                    "page_numbers": sorted({m.get("page_number") or 1 for m in items}),
                    "confidence": 66.0,
                    "recommended_action": "Professional review strongly recommended.",
                }
            )
        if len(freqs) > 1:
            alerts.append(
                {
                    "title": "Possible frequency conflict detected",
                    "category": "Dosage Conflict",
                    "risk_level": MEDIUM,
                    "medications_involved": [_display_name(items[0])],
                    "explanation": (
                        f"Different frequency instructions were recorded for '{_display_name(items[0])}'."
                    ),
                    "evidence": [f"{_display_name(m)} frequency={m.get('frequency')} ({m.get('source_document','')})" for m in items],
                    "source_documents": sorted({m.get("source_document", "") for m in items}),
                    "page_numbers": sorted({m.get("page_number") or 1 for m in items}),
                    "confidence": 62.0,
                    "recommended_action": "Professional review strongly recommended.",
                }
            )
        if len(routes) > 1:
            alerts.append(
                {
                    "title": "Possible route conflict detected",
                    "category": "Dosage Conflict",
                    "risk_level": MEDIUM,
                    "medications_involved": [_display_name(items[0])],
                    "explanation": (
                        f"Different routes of administration were recorded for '{_display_name(items[0])}'."
                    ),
                    "evidence": [f"{_display_name(m)} route={m.get('route')} ({m.get('source_document','')})" for m in items],
                    "source_documents": sorted({m.get("source_document", "") for m in items}),
                    "page_numbers": sorted({m.get("page_number") or 1 for m in items}),
                    "confidence": 60.0,
                    "recommended_action": "Professional review strongly recommended.",
                }
            )
        if len(durations) > 1:
            alerts.append(
                {
                    "title": "Possible duration conflict detected",
                    "category": "Dosage Conflict",
                    "risk_level": LOW,
                    "medications_involved": [_display_name(items[0])],
                    "explanation": (
                        f"Different treatment durations were recorded for '{_display_name(items[0])}'."
                    ),
                    "evidence": [f"{_display_name(m)} duration={m.get('duration')} ({m.get('source_document','')})" for m in items],
                    "source_documents": sorted({m.get("source_document", "") for m in items}),
                    "page_numbers": sorted({m.get("page_number") or 1 for m in items}),
                    "confidence": 58.0,
                    "recommended_action": "Professional review strongly recommended.",
                }
            )
    return alerts


def detect_allergy_conflicts(medications: list[dict], allergies: list[dict]) -> list[dict]:
    """Detect medication that matches a known allergy or a related drug class."""
    alerts: list[dict] = []
    for med in medications:
        resolved = normalise_medicine(_display_name(med))
        drug_class = resolved.get("drug_class")
        for allergy in allergies:
            substance = (allergy.get("substance") or "").lower()
            if not substance:
                continue
            # Direct match on allergy substance
            if substance in _display_name(med).lower() or substance in _key(med).lower():
                alerts.append(
                    {
                        "title": f"Allergy conflict: {_display_name(med)} vs {allergy.get('substance')}",
                        "category": "Allergy Conflict",
                        "risk_level": CRITICAL,
                        "medications_involved": [_display_name(med), allergy.get("substance", "")],
                        "explanation": (
                            f"A medication ('{_display_name(med)}') appears to match the recorded "
                            f"allergy to '{allergy.get('substance')}'. This must be reviewed by a doctor."
                        ),
                        "evidence": [
                            f"Allergy: {allergy.get('substance')} ({allergy.get('source_document','')})",
                            f"Medication: {_display_name(med)} ({med.get('source_document','')})",
                        ],
                        "source_documents": sorted(
                            {allergy.get("source_document", ""), med.get("source_document", "")}
                        ),
                        "page_numbers": sorted(
                            {(allergy.get("page_number") or 1), (med.get("page_number") or 1)}
                        ),
                        "confidence": 74.0,
                        "recommended_action": "Professional review strongly recommended.",
                    }
                )
            # Related drug class (e.g. penicillin allergy vs amoxicillin)
            if drug_class and drug_class in substance:
                alerts.append(
                    {
                        "title": f"Related drug-class allergy conflict: {_display_name(med)}",
                        "category": "Allergy Conflict",
                        "risk_level": HIGH,
                        "medications_involved": [_display_name(med), allergy.get("substance", "")],
                        "explanation": (
                            f"'{_display_name(med)}' belongs to a drug class ({drug_class}) related to "
                            f"the recorded allergy to '{allergy.get('substance')}'. Cross-reactivity is "
                            "possible and should be reviewed."
                        ),
                        "evidence": [
                            f"Allergy: {allergy.get('substance')} ({allergy.get('source_document','')})",
                            f"Medication: {_display_name(med)} ({med.get('source_document','')})",
                        ],
                        "source_documents": sorted(
                            {allergy.get("source_document", ""), med.get("source_document", "")}
                        ),
                        "page_numbers": sorted(
                            {(allergy.get("page_number") or 1), (med.get("page_number") or 1)}
                        ),
                        "confidence": 68.0,
                        "recommended_action": "Professional review strongly recommended.",
                    }
                )
    return alerts


def detect_timing_conflicts(medications: list[dict]) -> list[dict]:
    """Detect overlapping prescriptions, discontinued-then-represcribed, and timing issues."""
    alerts: list[dict] = []
    grouped: dict[str, list[dict]] = defaultdict(list)
    for med in medications:
        grouped[_key(med).lower()].append(med)

    for key, items in grouped.items():
        if len(items) < 2:
            continue
        # Discontinued in one doc but active in another
        statuses = {_status(m) for m in items}
        if "discontinued" in statuses and any(_active(m) for m in items):
            alerts.append(
                {
                    "title": "Medication marked discontinued but also active",
                    "category": "Prescription Timing Conflict",
                    "risk_level": MEDIUM,
                    "medications_involved": [_display_name(items[0])],
                    "explanation": (
                        f"'{_display_name(items[0])}' is marked discontinued in one document but appears "
                        "active in another. The records may be inconsistent."
                    ),
                    "evidence": [f"{_display_name(m)} status={m.get('status')} ({m.get('source_document','')})" for m in items],
                    "source_documents": sorted({m.get("source_document", "") for m in items}),
                    "page_numbers": sorted({m.get("page_number") or 1 for m in items}),
                    "confidence": 64.0,
                    "recommended_action": "Professional review strongly recommended.",
                }
            )
    return alerts


def detect_missing_info(medications: list[dict]) -> list[dict]:
    """Flag missing dosage, frequency, or date as informational/low-confidence alerts."""
    alerts: list[dict] = []
    for med in medications:
        if not med.get("dose"):
            alerts.append(
                {
                    "title": f"Missing dosage information: {_display_name(med)}",
                    "category": "Missing Information",
                    "risk_level": LOW,
                    "medications_involved": [_display_name(med)],
                    "explanation": (
                        f"No dosage was recorded for '{_display_name(med)}'. The records may be incomplete."
                    ),
                    "evidence": [f"{_display_name(med)} ({med.get('source_document','')})"],
                    "source_documents": [med.get("source_document", "")],
                    "page_numbers": [med.get("page_number") or 1],
                    "confidence": 50.0,
                    "recommended_action": "Available records may be incomplete. Confirm with a clinician.",
                }
            )
        if not med.get("frequency"):
            alerts.append(
                {
                    "title": f"Missing frequency information: {_display_name(med)}",
                    "category": "Missing Information",
                    "risk_level": LOW,
                    "medications_involved": [_display_name(med)],
                    "explanation": (
                        f"No frequency was recorded for '{_display_name(med)}'. The records may be incomplete."
                    ),
                    "evidence": [f"{_display_name(med)} ({med.get('source_document','')})"],
                    "source_documents": [med.get("source_document", "")],
                    "page_numbers": [med.get("page_number") or 1],
                    "confidence": 48.0,
                    "recommended_action": "Available records may be incomplete. Confirm with a clinician.",
                }
            )
        if med.get("confidence", 100) < 55:
            alerts.append(
                {
                    "title": f"Low-confidence extraction: {_display_name(med)}",
                    "category": "Low Confidence",
                    "risk_level": INFO,
                    "medications_involved": [_display_name(med)],
                    "explanation": (
                        f"'{_display_name(med)}' was extracted with low confidence. It may need manual review."
                    ),
                    "evidence": [f"{_display_name(med)} ({med.get('source_document','')})"],
                    "source_documents": [med.get("source_document", "")],
                    "page_numbers": [med.get("page_number") or 1],
                    "confidence": med.get("confidence", 50.0),
                    "recommended_action": "Professional review strongly recommended.",
                }
            )
    return alerts


def run_all_checks(medications: list[dict], allergies: list[dict]) -> list[dict]:
    """Run every safety rule and return the combined alert list."""
    alerts: list[dict] = []
    alerts.extend(detect_duplicate_medications(medications))
    alerts.extend(detect_drug_interactions(medications))
    alerts.extend(detect_dosage_conflicts(medications))
    alerts.extend(detect_allergy_conflicts(medications, allergies))
    alerts.extend(detect_timing_conflicts(medications))
    alerts.extend(detect_missing_info(medications))
    # De-duplicate by title+category
    seen = set()
    unique = []
    for a in alerts:
        key = (a["title"], a["category"])
        if key not in seen:
            seen.add(key)
            unique.append(a)
    return unique
