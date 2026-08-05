# MedGuard AI • System Architecture & Engineering Design

MedGuard AI is engineered as an enterprise-grade, privacy-centric medical document cross-checking platform designed to assist healthcare professionals in identifying medication conflicts, drug-drug interactions, duplicate therapies, allergy contraindications, and abnormal biomarker trends across unstructured health records.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend Layer (Next.js 15 + TypeScript)"]
        UI["Healthcare UI / Tailwind CSS"]
        Shell["AppShell & Context Providers"]
        RQ["React Query & API Client"]
        Recharts["Recharts Biomarker Visualizer"]
    end

    subgraph Gateway["FastAPI Application Gateway"]
        Auth["CORS & Request Validation"]
        Routers["REST API Routers"]
        Services["Core Clinical Services"]
    end

    subgraph Engines["AI & Rule Engines"]
        OCR["Document Ingestion & PyMuPDF OCR"]
        Normalizer["Brand-to-Generic Normalizer"]
        RuleEngine["Deterministic Medical Rule Engine"]
        TimelineSvc["Longitudinal Timeline Builder"]
        LabSvc["Biomarker Trend Analyzer"]
        GeminiLLM["Gemini AI / Fallback QA Provider"]
    end

    subgraph Storage["Persistence Layer"]
        DB[(SQLite / PostgreSQL Database)]
        FileStore["Document Binary Storage (/uploads)"]
    end

    UI --> Shell --> RQ
    RQ -- HTTP/JSON --> Routers
    Routers --> Services
    Services --> OCR & Normalizer & RuleEngine & TimelineSvc & LabSvc & GeminiLLM
    Services --> DB
    OCR --> FileStore
```

---

## 2. Multi-Stage Document Ingestion Pipeline

When a medical record (PDF, JPEG, PNG, or TXT) is uploaded, it transitions through sequential analytical stages:

```mermaid
sequenceDiagram
    autonumber
    actor Clinician
    participant Frontend as Next.js Dashboard
    participant API as FastAPI Ingestion
    participant OCR as OCR / PyMuPDF Engine
    participant Norm as Normalization Engine
    participant Rules as Rule Engine
    participant DB as SQLite Database

    Clinician->>Frontend: Drag & Drop Medical Document (PDF/Image)
    Frontend->>API: POST /api/patients/{id}/documents
    API->>DB: Save Document Record (status: pending)
    Frontend->>API: POST /api/documents/{id}/process
    API->>OCR: Extract Text & Page Layout
    OCR-->>API: Extracted Text Stream & OCR Confidence
    API->>Norm: Classify Record & Standardize Drug Names
    Norm-->>API: Active Ingredients & Structured Entities
    API->>Rules: Cross-Check Patient Allergies & Active Regimens
    Rules-->>API: Detected Interactions, Duplicates & Risk Scores
    API->>DB: Store Medications, Alerts, Timeline Events & Labs
    API-->>Frontend: Processing Complete (status: completed)
    Frontend->>Clinician: Real-time UI Update & Safety Alerts
```

---

## 3. Clinical Rule Engine Architecture

The safety rule engine executes deterministic medical logic across the aggregated patient history:

1. **Drug-Drug Interactions (CYP450 & Pharmacodynamic Checks):**
   - Evaluates pairs of active medications (e.g., Fluoroquinolones like *Ciprofloxacin* with Anticoagulants like *Warfarin*).
   - Generates risk level (`critical`, `high`, `medium`, `low`) and concrete clinical action plans.
2. **Duplicate Therapy Detection:**
   - Detects brand vs. generic co-prescriptions (e.g., *Glucophage* + *Metformin* or *Lipitor* + *Atorvastatin*).
3. **Allergy Contraindications:**
   - Cross-references documented allergies (e.g., *Penicillin*) with antibiotic families (e.g., *Amoxicillin*, *Ampicillin*, *Augmentin*).
4. **Dosage Anomalies & Maximum Thresholds:**
   - Flags dangerous single or daily dosages.

---

## 4. Cross-Document Conversational Reasoning with Citations

```mermaid
flowchart LR
    UserQ["Clinician Prompt"] --> API["Chat Endpoint"]
    API --> CtxBuilder["Patient Context Synthesizer"]
    CtxBuilder --> Documents["Aggregated Extracted Notes"]
    CtxBuilder --> Meds["Medication Trajectory"]
    CtxBuilder --> Alerts["Rule Engine Findings"]
    Documents & Meds & Alerts --> LLM["Clinical AI Model"]
    LLM --> CitationMatcher["Evidence Citation Extractor"]
    CitationMatcher --> FinalRes["Verified Answer + Page Citations + Confidence + Disclaimer"]
    FinalRes --> UI["Interactive Chat Stream"]
```

---

## 5. Security, Privacy & HIPAA Guardrails

- **Zero Data Leakage:** All file uploads are stored locally and sandboxed.
- **Anonymization Support:** Patient identifiers and MRNs can be scrubbed before AI processing.
- **Auditable Citations:** Every AI output includes exact document excerpts and confidence levels to enable human-in-the-loop verification.
