"""Local medical knowledge: medicine normalisation mapping and drug-interaction dataset.

This is a demonstration dataset. It is extensible via configuration files and is
NOT a substitute for a professional clinical database.
"""
from __future__ import annotations

import json
from pathlib import Path

# ---------------------------------------------------------------------------
# Medicine normalisation mapping
# ---------------------------------------------------------------------------
# Each entry: normalised key -> record with generic name, brand names, active ingredient, class.
MEDICINE_MAP: dict[str, dict] = {
    "metformin": {
        "generic_name": "Metformin",
        "brand_names": ["Glucophage", "Fortamet", "Glumetza"],
        "active_ingredient": "Metformin hydrochloride",
        "drug_class": "biguanide",
    },
    "aspirin": {
        "generic_name": "Aspirin",
        "brand_names": ["Bayer", "Ecotrin"],
        "active_ingredient": "Acetylsalicylic acid",
        "drug_class": "nsaid",
    },
    "amoxicillin": {
        "generic_name": "Amoxicillin",
        "brand_names": ["Amoxil", "Moxatag"],
        "active_ingredient": "Amoxicillin",
        "drug_class": "penicillin",
    },
    "penicillin": {
        "generic_name": "Penicillin",
        "brand_names": ["Penicillin VK"],
        "active_ingredient": "Penicillin",
        "drug_class": "penicillin",
    },
    "warfarin": {
        "generic_name": "Warfarin",
        "brand_names": ["Coumadin", "Jantoven"],
        "active_ingredient": "Warfarin sodium",
        "drug_class": "anticoagulant",
    },
    "lisinopril": {
        "generic_name": "Lisinopril",
        "brand_names": ["Prinivil", "Zestril"],
        "active_ingredient": "Lisinopril",
        "drug_class": "ace_inhibitor",
    },
    "atorvastatin": {
        "generic_name": "Atorvastatin",
        "brand_names": ["Lipitor"],
        "active_ingredient": "Atorvastatin calcium",
        "drug_class": "statin",
    },
    "simvastatin": {
        "generic_name": "Simvastatin",
        "brand_names": ["Zocor"],
        "active_ingredient": "Simvastatin",
        "drug_class": "statin",
    },
    "insulin": {
        "generic_name": "Insulin",
        "brand_names": ["Humalog", "Lantus", "Novolog"],
        "active_ingredient": "Insulin",
        "drug_class": "insulin",
    },
    "paracetamol": {
        "generic_name": "Paracetamol",
        "brand_names": ["Panadol", "Tylenol"],
        "active_ingredient": "Acetaminophen",
        "drug_class": "analgesic",
    },
    "acetaminophen": {
        "generic_name": "Paracetamol",
        "brand_names": ["Tylenol", "Panadol"],
        "active_ingredient": "Acetaminophen",
        "drug_class": "analgesic",
    },
    "ibuprofen": {
        "generic_name": "Ibuprofen",
        "brand_names": ["Advil", "Motrin"],
        "active_ingredient": "Ibuprofen",
        "drug_class": "nsaid",
    },
    "naproxen": {
        "generic_name": "Naproxen",
        "brand_names": ["Aleve"],
        "active_ingredient": "Naproxen",
        "drug_class": "nsaid",
    },
    "clopidogrel": {
        "generic_name": "Clopidogrel",
        "brand_names": ["Plavix"],
        "active_ingredient": "Clopidogrel",
        "drug_class": "antiplatelet",
    },
    "omeprazole": {
        "generic_name": "Omeprazole",
        "brand_names": ["Prilosec", "Losec"],
        "active_ingredient": "Omeprazole",
        "drug_class": "ppi",
    },
    "losartan": {
        "generic_name": "Losartan",
        "brand_names": ["Cozaar"],
        "active_ingredient": "Losartan potassium",
        "drug_class": "arb",
    },
    "amlodipine": {
        "generic_name": "Amlodipine",
        "brand_names": ["Norvasc"],
        "active_ingredient": "Amlodipine besylate",
        "drug_class": "calcium_channel_blocker",
    },
    "hydrochlorothiazide": {
        "generic_name": "Hydrochlorothiazide",
        "brand_names": ["Microzide", "Hydrodiuril"],
        "active_ingredient": "Hydrochlorothiazide",
        "drug_class": "thiazide_diuretic",
    },
    "levothyroxine": {
        "generic_name": "Levothyroxine",
        "brand_names": ["Synthroid", "Levoxyl"],
        "active_ingredient": "Levothyroxine",
        "drug_class": "thyroid_hormone",
    },
    "sertraline": {
        "generic_name": "Sertraline",
        "brand_names": ["Zoloft"],
        "active_ingredient": "Sertraline hydrochloride",
        "drug_class": "ssri",
    },
    "ciprofloxacin": {
        "generic_name": "Ciprofloxacin",
        "brand_names": ["Cipro"],
        "active_ingredient": "Ciprofloxacin",
        "drug_class": "fluoroquinolone",
    },
    "doxycycline": {
        "generic_name": "Doxycycline",
        "brand_names": ["Vibramycin"],
        "active_ingredient": "Doxycycline",
        "drug_class": "tetracycline",
    },
    "azithromycin": {
        "generic_name": "Azithromycin",
        "brand_names": ["Zithromax", "Z-Pak"],
        "active_ingredient": "Azithromycin",
        "drug_class": "macrolide",
    },
    "prednisone": {
        "generic_name": "Prednisone",
        "brand_names": ["Deltasone", "Rayos"],
        "active_ingredient": "Prednisone",
        "drug_class": "corticosteroid",
    },
    "gabapentin": {
        "generic_name": "Gabapentin",
        "brand_names": ["Neurontin"],
        "active_ingredient": "Gabapentin",
        "drug_class": "anticonvulsant",
    },
    "tramadol": {
        "generic_name": "Tramadol",
        "brand_names": ["Ultram"],
        "active_ingredient": "Tramadol",
        "drug_class": "opioid",
    },
    "codeine": {
        "generic_name": "Codeine",
        "brand_names": ["Tylenol with Codeine"],
        "active_ingredient": "Codeine",
        "drug_class": "opioid",
    },
    "digoxin": {
        "generic_name": "Digoxin",
        "brand_names": ["Lanoxin"],
        "active_ingredient": "Digoxin",
        "drug_class": "cardiac_glycoside",
    },
    "furosemide": {
        "generic_name": "Furosemide",
        "brand_names": ["Lasix"],
        "active_ingredient": "Furosemide",
        "drug_class": "loop_diuretic",
    },
    "metoprolol": {
        "generic_name": "Metoprolol",
        "brand_names": ["Lopressor", "Toprol-XL"],
        "active_ingredient": "Metoprolol tartrate",
        "drug_class": "beta_blocker",
    },
    "atorvastatin": {
        "generic_name": "Atorvastatin",
        "brand_names": ["Lipitor"],
        "active_ingredient": "Atorvastatin calcium",
        "drug_class": "statin",
    },
}

# ---------------------------------------------------------------------------
# Drug interaction dataset (demonstration)
# ---------------------------------------------------------------------------
# Each entry: frozenset of two normalised keys -> description + risk level.
DRUG_INTERACTIONS: dict[tuple[str, str], dict] = {
    ("warfarin", "aspirin"): {
        "risk": "High",
        "description": "Both warfarin and aspirin affect blood clotting. Combined use may increase the risk of bleeding.",
    },
    ("warfarin", "ibuprofen"): {
        "risk": "High",
        "description": "NSAIDs such as ibuprofen can increase bleeding risk when taken with warfarin.",
    },
    ("warfarin", "naproxen"): {
        "risk": "High",
        "description": "NSAIDs such as naproxen can increase bleeding risk when taken with warfarin.",
    },
    ("warfarin", "clopidogrel"): {
        "risk": "High",
        "description": "Combining warfarin with clopidogrel may significantly increase bleeding risk.",
    },
    ("aspirin", "clopidogrel"): {
        "risk": "High",
        "description": "Combined antiplatelet therapy with aspirin and clopidogrel increases bleeding risk.",
    },
    ("simvastatin", "amiodarone"): {
        "risk": "High",
        "description": "Simvastatin combined with amiodarone raises the risk of muscle toxicity.",
    },
    ("atorvastatin", "ciprofloxacin"): {
        "risk": "Medium",
        "description": "Ciprofloxacin may slightly increase statin exposure and muscle toxicity risk.",
    },
    ("lisinopril", "losartan"): {
        "risk": "High",
        "description": "Combining ACE inhibitors with ARBs is generally avoided due to risk of kidney injury and hyperkalaemia.",
    },
    ("tramadol", "sertraline"): {
        "risk": "Medium",
        "description": "Combining tramadol with SSRIs may increase the risk of serotonin syndrome.",
    },
    ("tramadol", "codeine"): {
        "risk": "Medium",
        "description": "Combining multiple opioids may increase sedation and respiratory depression risk.",
    },
    ("metformin", "furosemide"): {
        "risk": "Medium",
        "description": "Loop diuretics may affect kidney function and lactic acidosis risk with metformin.",
    },
    ("digoxin", "furosemide"): {
        "risk": "High",
        "description": "Diuretic-induced potassium loss may increase digoxin toxicity risk.",
    },
    ("potassium", "lisinopril"): {
        "risk": "Medium",
        "description": "Potassium supplements with ACE inhibitors may cause hyperkalaemia.",
    },
    ("aspirin", "ibuprofen"): {
        "risk": "Medium",
        "description": "Combining NSAIDs may increase gastrointestinal bleeding risk; ibuprofen may reduce aspirin's antiplatelet effect.",
    },
}


def _load_extension_json() -> tuple[dict, dict]:
    """Optionally load extension mappings from a JSON file if present."""
    base = Path(__file__).resolve().parent / "extensions"
    meds = {}
    interactions = {}
    if base.exists():
        for f in base.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                meds.update(data.get("medicines", {}))
                for pair, info in data.get("interactions", {}).items():
                    a, b = pair.lower().split("_")
                    interactions[(a, b)] = info
            except Exception:  # pragma: no cover
                continue
    return meds, interactions


_MED_EXT, _INT_EXT = _load_extension_json()
if _MED_EXT:
    MEDICINE_MAP.update(_MED_EXT)
if _INT_EXT:
    DRUG_INTERACTIONS.update(_INT_EXT)


def get_interaction(a: str, b: str) -> dict | None:
    """Look up an interaction between two normalised medicine keys."""
    key = frozenset((a, b))
    for (x, y), info in DRUG_INTERACTIONS.items():
        if frozenset((x, y)) == key:
            return info
    return None
