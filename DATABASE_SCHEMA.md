# MedGuard AI • Database Schema & Entity Relationship Model

MedGuard AI uses an entity-relational schema built with SQLAlchemy ORM, compatible with SQLite (local development/testing) and PostgreSQL (production).

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    PATIENTS ||--o{ DOCUMENTS : "uploads"
    PATIENTS ||--o{ MEDICATIONS : "prescribed"
    PATIENTS ||--o{ SAFETY_ALERTS : "triggers"
    PATIENTS ||--o{ TIMELINE_EVENTS : "history"
    PATIENTS ||--o{ LAB_RESULTS : "tested"
    DOCUMENTS ||--o{ MEDICATIONS : "extracts"
    DOCUMENTS ||--o{ TIMELINE_EVENTS : "sources"
    DOCUMENTS ||--o{ LAB_RESULTS : "sources"

    PATIENTS {
        string id PK "UUID"
        string name "Full Name"
        string date_of_birth "YYYY-MM-DD"
        string gender "Gender"
        string reference_number "MRN / External ID"
        text known_allergies "JSON array of allergens"
        datetime created_at
        datetime updated_at
    }

    DOCUMENTS {
        string id PK "UUID"
        string patient_id FK "References patients.id"
        string original_name "File name"
        string stored_filename "Hashed on disk"
        string file_path "Absolute path"
        integer size_bytes "Size in bytes"
        integer page_count "Pages"
        string classification "Prescription, Discharge, etc."
        string document_date "Date on record"
        string provider "Clinic/Hospital"
        string doctor_name "Physician"
        float overall_confidence "0.0 - 1.0"
        string processing_status "pending, processing, completed, failed"
        string text_extraction_method "pymupdf, tesseract, mock"
        boolean ocr_used
        text extracted_text "Raw extracted text stream"
        datetime created_at
    }

    MEDICATIONS {
        string id PK "UUID"
        string patient_id FK "References patients.id"
        string document_id FK "References documents.id"
        string drug_name "Brand / Prescribed Name"
        string normalized_name "Generic / Active Ingredient"
        string dosage "e.g. 500mg"
        string frequency "e.g. BID, Once daily"
        string route "Oral, IV, Topical"
        string status "active, discontinued"
        string start_date "YYYY-MM-DD"
        string end_date "YYYY-MM-DD"
        text supporting_text "Source excerpt"
        float confidence "0.0 - 1.0"
    }

    SAFETY_ALERTS {
        string id PK "UUID"
        string patient_id FK "References patients.id"
        string title "Alert headline"
        string category "Drug Interaction, Duplicate, Allergy"
        string risk_level "critical, high, medium, low"
        text explanation "Clinical rationale"
        text recommended_action "Actionable advice"
        text supporting_text "Document citations"
        float confidence "0.0 - 1.0"
        datetime created_at
    }

    LAB_RESULTS {
        string id PK "UUID"
        string patient_id FK "References patients.id"
        string document_id FK "References documents.id"
        string test_name "e.g. Blood Glucose"
        string test_date "YYYY-MM-DD"
        float value "Measured numeric value"
        string unit "mg/dL, mmol/L"
        float normal_range_min "Normal lower boundary"
        float normal_range_max "Normal upper boundary"
        string status "normal, high, low, abnormal"
        string interpretation "Diagnostic note"
        text supporting_text "Lab report excerpt"
        float confidence "0.0 - 1.0"
    }

    TIMELINE_EVENTS {
        string id PK "UUID"
        string patient_id FK "References patients.id"
        string document_id FK "References documents.id"
        string event_date "YYYY-MM-DD"
        string event_type "Prescription, Visit, Lab, Discharge"
        string provider "Hospital name"
        string doctor_name "Physician name"
        text summary "Event description"
        text diagnoses "JSON array"
        text medications "JSON array"
        text lab_results "JSON array"
        text supporting_text "Verifiable excerpt"
        float confidence "0.0 - 1.0"
    }
```

---

## 2. Table Specifications & Indexing Strategy

- **`patients`**: Indexed on `reference_number` and `name` for high-throughput lookup.
- **`documents`**: Foreign key to `patients.id` with `ON DELETE CASCADE`. Indexed on `(patient_id, processing_status)`.
- **`medications`**: Foreign key to `patients.id` and `documents.id`. Indexed on `(patient_id, status)` and `normalized_name`.
- **`safety_alerts`**: Indexed on `(patient_id, risk_level)`.
- **`lab_results`**: Indexed on `(patient_id, test_name, test_date)` to accelerate time-series aggregation.
- **`timeline_events`**: Indexed on `(patient_id, event_date)`.
