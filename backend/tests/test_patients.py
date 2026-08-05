import pytest

def test_create_and_get_patient(client):
    payload = {
        "name": "Sarah Connor",
        "date_of_birth": "1985-05-12",
        "gender": "Female",
        "reference_number": "MRN-101",
        "allergies": ["Penicillin", "Sulfa drugs"],
    }
    response = client.post("/api/patients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sarah Connor"
    assert data["reference_number"] == "MRN-101"
    patient_id = data["id"]

    # Get by ID
    get_res = client.get(f"/api/patients/{patient_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Sarah Connor"

def test_update_patient(client):
    payload = {
        "name": "John Doe",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "reference_number": "MRN-002",
        "allergies": ["Aspirin"],
    }
    create_res = client.post("/api/patients", json=payload)
    assert create_res.status_code == 201
    patient_id = create_res.json()["id"]

    # Update patient
    update_payload = {
        "name": "Johnathan Doe",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "reference_number": "MRN-002",
        "allergies": ["Aspirin", "Ibuprofen"],
    }
    update_res = client.put(f"/api/patients/{patient_id}", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Johnathan Doe"

def test_delete_patient(client):
    payload = {
        "name": "To Delete",
        "allergies": [],
    }
    create_res = client.post("/api/patients", json=payload)
    patient_id = create_res.json()["id"]

    del_res = client.delete(f"/api/patients/{patient_id}")
    assert del_res.status_code in [200, 204]

    # Verify 404 on get
    get_res = client.get(f"/api/patients/{patient_id}")
    assert get_res.status_code == 404
