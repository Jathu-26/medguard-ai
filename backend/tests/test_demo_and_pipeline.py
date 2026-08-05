import pytest

def test_demo_patient_seeding_and_analytics_pipeline(client):
    # Trigger demo patient initialization
    demo_res = client.post("/api/demo/patient")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    patient_id = demo_data["id"]
    assert patient_id is not None

    # Overview check
    overview_res = client.get(f"/api/patients/{patient_id}/overview")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["total_documents"] >= 1

    # Alerts check
    alerts_res = client.get(f"/api/patients/{patient_id}/alerts")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert isinstance(alerts, list)
    assert any(a["category"] == "Drug Interaction" for a in alerts)

    # Timeline check
    timeline_res = client.get(f"/api/patients/{patient_id}/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert isinstance(timeline, list)
    assert len(timeline) >= 1

    # Lab trends check
    labs_res = client.get(f"/api/patients/{patient_id}/lab-trends")
    assert labs_res.status_code == 200
    labs = labs_res.json()
    assert isinstance(labs, list)

    # Chat test
    chat_payload = {"question": "What medications is this patient taking?"}
    chat_res = client.post(f"/api/patients/{patient_id}/chat", json=chat_payload)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "answer" in chat_data or "response" in chat_data
