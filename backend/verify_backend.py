"""Comprehensive backend verification script (not part of the app)."""
from __future__ import annotations

import json
import os
import sys
import traceback

os.chdir(os.path.dirname(os.path.abspath(__file__)))

RESULTS = []


def check(name: str, fn):
    try:
        fn()
        RESULTS.append(f"[PASS] {name}")
    except Exception as exc:  # noqa: BLE001
        RESULTS.append(f"[FAIL] {name}: {exc}")
        traceback.print_exc()


def test_imports():
    from app.main import app  # noqa: F401
    assert app.title


def test_db():
    from app.database import init_db
    init_db()


def test_demo():
    from app.database import SessionLocal, init_db
    from app.services.demo_service import load_demo_patient
    init_db()
    db = SessionLocal()
    pid = load_demo_patient(db)
    db.close()
    assert pid


def test_rule_engine():
    from app.medical_rules.engine import run_all_checks
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


def test_normalisation():
    from app.medical_rules.normalisation import normalise_medicine, normalise_lab_test
    assert normalise_medicine("Glucophage")["generic_name"] == "Metformin"
    assert normalise_medicine("metformin hcl")["generic_name"] == "Metformin"
    assert normalise_lab_test("FBS")["normalised_test_name"] == "Fasting Blood Sugar"
    assert normalise_lab_test("Hb")["normalised_test_name"] == "Haemoglobin"
    assert normalise_lab_test("WBC")["normalised_test_name"] == "White Blood Cell Count"


def test_api_health():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    r = client.get("/health")
    assert r.json() == {"status": "ok"}


def test_api_patient_crud():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    r = client.post("/api/patients", json={"name": "Test Patient", "date_of_birth": "1990-01-01", "allergies": ["Aspirin"]})
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    r = client.get(f"/api/patients/{pid}")
    assert r.status_code == 200
    r = client.delete(f"/api/patients/{pid}")
    assert r.status_code in {200, 204}


def test_api_demo():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    r = client.post("/api/demo/patient")
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    ov = client.get(f"/api/patients/{pid}/overview").json()
    assert ov["total_documents"] == 4
    alerts = client.get(f"/api/patients/{pid}/alerts").json()
    assert any(a["category"] == "Drug Interaction" for a in alerts)
    assert any(a["category"] == "Allergy Conflict" for a in alerts)
    assert any(a["category"] == "Duplicate Medication" for a in alerts)
    assert any(a["category"] == "Dosage Conflict" for a in alerts)
    trends = client.get(f"/api/patients/{pid}/lab-trends").json()
    assert any(t["trend"] != "Insufficient data" for t in trends)
    chat = client.post(f"/api/patients/{pid}/chat", json={"question": "Was a medicine prescribed despite a previously recorded allergy?"}).json()
    assert chat["answer"]
    assert chat["disclaimer"]
    timeline = client.get(f"/api/patients/{pid}/timeline").json()
    assert len(timeline) >= 1


check("imports", test_imports)
check("db init", test_db)
check("demo patient load", test_demo)
check("rule engine", test_rule_engine)
check("normalisation", test_normalisation)
check("api health", test_api_health)
check("api patient crud", test_api_patient_crud)
check("api demo + analytics + chat", test_api_demo)

print("\n".join(RESULTS))
passed = sum(1 for r in RESULTS if r.startswith("[PASS]"))
print(f"\n{passed}/{len(RESULTS)} checks passed")

