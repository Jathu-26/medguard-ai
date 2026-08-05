"""Medical normalisation: medicine names, lab test names, units, and dates."""
from __future__ import annotations

import re
from datetime import datetime

from app.medical_rules.knowledge import MEDICINE_MAP

# ---------------------------------------------------------------------------
# Medicine normalisation
# ---------------------------------------------------------------------------

# Explicit brand-name alias -> normalised key
_BRAND_ALIASES: dict[str, str] = {}
for _key, _rec in MEDICINE_MAP.items():
    for _brand in _rec.get("brand_names", []):
        _BRAND_ALIASES[_brand.lower()] = _key


def _normalise_key(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    t = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _clean_medicine_key(text: str) -> str:
    """Strip dosage, strength, form, and salt words to get base drug name."""
    t = _normalise_key(text)
    # Remove dosage and units (e.g. 500mg, 10 mg, 0.5g, 100mcg, 5ml, 10%)
    t = re.sub(r"\b\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|units?|u|%|iu)\b", " ", t, flags=re.I)
    # Remove common salt / form / formulation tokens
    t = re.sub(
        r"\b(hcl|hydrochloride|sodium|potassium|calcium|tartrate|maleate|fumarate|sulfate|succinate|"
        r"xr|er|cr|sr|dr|tablet|tablets|tab|tabs|capsule|capsules|cap|caps|oral|solution|syrup|suspension|injection)\b",
        " ",
        t,
        flags=re.I,
    )
    return re.sub(r"\s+", " ", t).strip()


def resolve_medicine(name: str) -> dict | None:
    """Resolve a medicine name to its normalised record (name, confidence, matched key)."""
    if not name:
        return None
    raw_key = _normalise_key(name)
    clean_key = _clean_medicine_key(name)

    # 1. Exact match on raw or cleaned key in MEDICINE_MAP
    for k in (raw_key, clean_key):
        if k and k in MEDICINE_MAP:
            return {**MEDICINE_MAP[k], "matched_key": k, "confidence": 95.0}

    # 2. Exact match on raw or cleaned key in _BRAND_ALIASES
    for k in (raw_key, clean_key):
        if k and k in _BRAND_ALIASES:
            mk = _BRAND_ALIASES[k]
            return {**MEDICINE_MAP[mk], "matched_key": mk, "confidence": 90.0}

    # 3. Match individual words in cleaned key against MEDICINE_MAP or _BRAND_ALIASES
    for word in clean_key.split():
        if len(word) >= 3:
            if word in MEDICINE_MAP:
                return {**MEDICINE_MAP[word], "matched_key": word, "confidence": 88.0}
            if word in _BRAND_ALIASES:
                mk = _BRAND_ALIASES[word]
                return {**MEDICINE_MAP[mk], "matched_key": mk, "confidence": 88.0}

    # 4. Partial / substring match on MEDICINE_MAP keys
    for mk, rec in MEDICINE_MAP.items():
        if (clean_key and (clean_key == mk or (len(clean_key) >= 4 and clean_key in mk))) or mk in clean_key:
            return {**rec, "matched_key": mk, "confidence": 80.0}

    # 5. Brand alias substring match
    for brand, mk in _BRAND_ALIASES.items():
        if (clean_key and (clean_key == brand or (len(clean_key) >= 4 and clean_key in brand))) or brand in clean_key:
            return {**MEDICINE_MAP[mk], "matched_key": mk, "confidence": 80.0}

    # 6. Match against active ingredient / generic name
    for mk, rec in MEDICINE_MAP.items():
        gn = _normalise_key(rec.get("generic_name", ""))
        ai = _normalise_key(rec.get("active_ingredient", ""))
        if (clean_key and (clean_key in gn or clean_key in ai)) or (gn and gn in clean_key) or (ai and ai in clean_key):
            return {**rec, "matched_key": mk, "confidence": 85.0}

    return None


def normalise_medicine(name: str) -> dict:
    """Return a normalised medicine record with a matched_key and confidence (0-100)."""
    resolved = resolve_medicine(name)
    if resolved:
        active_ing = resolved.get("matched_key") or (resolved.get("active_ingredient") or "").lower()
        return {
            "normalised_name": resolved["generic_name"],
            "generic_name": resolved["generic_name"],
            "active_ingredient": active_ing.lower() if active_ing else None,
            "drug_class": resolved.get("drug_class"),
            "matched_key": resolved["matched_key"],
            "match_confidence": resolved["confidence"],
        }
    return {
        "normalised_name": name.strip(),
        "generic_name": None,
        "active_ingredient": None,
        "drug_class": None,
        "matched_key": None,
        "match_confidence": 30.0,
    }


# ---------------------------------------------------------------------------
# Lab test normalisation
# ---------------------------------------------------------------------------
# Aliases -> canonical test name + units + reference range
LAB_TEST_MAP: dict[str, dict] = {
    "fbs": {"name": "Fasting Blood Sugar", "unit": "mg/dL", "ref_min": 70, "ref_max": 99},
    "fasting blood sugar": {"name": "Fasting Blood Sugar", "unit": "mg/dL", "ref_min": 70, "ref_max": 99},
    "fasting glucose": {"name": "Fasting Blood Sugar", "unit": "mg/dL", "ref_min": 70, "ref_max": 99},
    "blood glucose": {"name": "Blood Glucose", "unit": "mg/dL", "ref_min": 70, "ref_max": 140},
    "glucose": {"name": "Blood Glucose", "unit": "mg/dL", "ref_min": 70, "ref_max": 140},
    "hba1c": {"name": "HbA1c", "unit": "%", "ref_min": 4, "ref_max": 5.6},
    "a1c": {"name": "HbA1c", "unit": "%", "ref_min": 4, "ref_max": 5.6},
    "creatinine": {"name": "Creatinine", "unit": "mg/dL", "ref_min": 0.6, "ref_max": 1.2},
    "cholesterol": {"name": "Total Cholesterol", "unit": "mg/dL", "ref_min": 0, "ref_max": 200},
    "total cholesterol": {"name": "Total Cholesterol", "unit": "mg/dL", "ref_min": 0, "ref_max": 200},
    "ldl": {"name": "LDL Cholesterol", "unit": "mg/dL", "ref_min": 0, "ref_max": 100},
    "hdl": {"name": "HDL Cholesterol", "unit": "mg/dL", "ref_min": 40, "ref_max": 999},
    "triglycerides": {"name": "Triglycerides", "unit": "mg/dL", "ref_min": 0, "ref_max": 150},
    "haemoglobin": {"name": "Haemoglobin", "unit": "g/dL", "ref_min": 12, "ref_max": 17.5},
    "hemoglobin": {"name": "Haemoglobin", "unit": "g/dL", "ref_min": 12, "ref_max": 17.5},
    "hb": {"name": "Haemoglobin", "unit": "g/dL", "ref_min": 12, "ref_max": 17.5},
    "white blood cell count": {"name": "White Blood Cell Count", "unit": "x10^9/L", "ref_min": 4, "ref_max": 11},
    "wbc": {"name": "White Blood Cell Count", "unit": "x10^9/L", "ref_min": 4, "ref_max": 11},
    "platelet count": {"name": "Platelet Count", "unit": "x10^9/L", "ref_min": 150, "ref_max": 400},
    "platelets": {"name": "Platelet Count", "unit": "x10^9/L", "ref_min": 150, "ref_max": 400},
    "alt": {"name": "ALT", "unit": "U/L", "ref_min": 7, "ref_max": 56},
    "ast": {"name": "AST", "unit": "U/L", "ref_min": 10, "ref_max": 40},
    "blood pressure": {"name": "Blood Pressure", "unit": "mmHg", "ref_min": 90, "ref_max": 130},
    "bp": {"name": "Blood Pressure", "unit": "mmHg", "ref_min": 90, "ref_max": 130},
    "sodium": {"name": "Sodium", "unit": "mmol/L", "ref_min": 135, "ref_max": 145},
    "potassium": {"name": "Potassium", "unit": "mmol/L", "ref_min": 3.5, "ref_max": 5.0},
    "eGFR": {"name": "eGFR", "unit": "mL/min/1.73m2", "ref_min": 60, "ref_max": 999},
    "egfr": {"name": "eGFR", "unit": "mL/min/1.73m2", "ref_min": 60, "ref_max": 999},
    "bun": {"name": "BUN", "unit": "mg/dL", "ref_min": 7, "ref_max": 20},
    "uric acid": {"name": "Uric Acid", "unit": "mg/dL", "ref_min": 3.5, "ref_max": 7.2},
    "vitamin d": {"name": "Vitamin D", "unit": "ng/mL", "ref_min": 30, "ref_max": 100},
    "tsh": {"name": "TSH", "unit": "mIU/L", "ref_min": 0.4, "ref_max": 4.0},
}


def normalise_lab_test(name: str) -> dict:
    """Normalise a lab test name to a canonical record with units and reference range."""
    key = _normalise_key(name)
    if key in LAB_TEST_MAP:
        rec = LAB_TEST_MAP[key]
        return {
            "normalised_test_name": rec["name"],
            "unit": rec["unit"],
            "ref_min": rec["ref_min"],
            "ref_max": rec["ref_max"],
            "confidence": 95.0,
        }
    # substring match
    for k, rec in LAB_TEST_MAP.items():
        if key in k or k in key:
            return {
                "normalised_test_name": rec["name"],
                "unit": rec["unit"],
                "ref_min": rec["ref_min"],
                "ref_max": rec["ref_max"],
                "confidence": 85.0,
            }
    return {
        "normalised_test_name": name.strip(),
        "unit": None,
        "ref_min": None,
        "ref_max": None,
        "confidence": 40.0,
    }


# Very simple unit conversion for glucose (mg/dL <-> mmol/L)
def convert_glucose(value: float, unit: str) -> float:
    """Convert glucose units to mg/dL standard. Returns None-equivalent via caller."""
    u = unit.strip().lower()
    if "mmol" in u:
        return value * 18.0182
    return value


# ---------------------------------------------------------------------------
# Date parsing
# ---------------------------------------------------------------------------
_DATE_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d-%m-%Y",
    "%Y/%m/%d",
    "%d %B %Y",
    "%B %d, %Y",
    "%b %d, %Y",
    "%d-%b-%Y",
    "%Y-%m",
    "%d/%m/%y",
]


def parse_date(text: str | None) -> str | None:
    """Return an ISO date (YYYY-MM-DD) if the text can be parsed, else None."""
    if not text:
        return None
    t = text.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(t, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def confidence_from_date(text: str | None) -> float:
    """90 if the date parsed cleanly, else 40."""
    return 90.0 if parse_date(text) else 40.0
