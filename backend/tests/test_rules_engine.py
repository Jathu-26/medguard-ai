import pytest
from app.medical_rules.engine import run_all_checks
from app.medical_rules.normalisation import normalise_medicine, normalise_lab_test

def test_medical_rules_engine_interactions_and_allergies():
    meds = [
        {"normalised_name": "Metformin", "dose": "500 mg", "frequency": "BID", "status": "active", "source_document": "a", "confidence": 80},
        {"normalised_name": "Metformin", "dose": "850 mg", "frequency": "BID", "status": "active", "source_document": "b", "confidence": 80},
        {"normalised_name": "Aspirin", "dose": "81 mg", "frequency": "once daily", "status": "active", "source_document": "c", "confidence": 80},
        {"normalised_name": "Warfarin", "dose": "5 mg", "frequency": "once daily", "status": "active", "source_document": "d", "confidence": 80},
        {"normalised_name": "Amoxicillin", "dose": "500 mg", "frequency": "TID", "status": "active", "source_document": "e", "confidence": 80},
    ]
    allergies = [{"substance": "Penicillin", "source_document": "f"}]

    alerts = run_all_checks(meds, allergies)
    categories = {a["category"] for a in alerts}

    assert "Duplicate Medication" in categories
    assert "Drug Interaction" in categories
    assert "Dosage Conflict" in categories
    assert "Allergy Conflict" in categories

def test_drug_and_lab_normalisation():
    assert normalise_medicine("Glucophage")["generic_name"] == "Metformin"
    assert normalise_medicine("metformin hcl")["generic_name"] == "Metformin"
    assert normalise_lab_test("FBS")["normalised_test_name"] == "Fasting Blood Sugar"
    assert normalise_lab_test("Hb")["normalised_test_name"] == "Haemoglobin"
