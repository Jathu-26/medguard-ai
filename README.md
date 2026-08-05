# MedGuard AI • Intelligent Clinical Document Cross-Checking Platform

> **MedGuard AI** is an enterprise healthcare decision support platform engineered to cross-check unstructured medical records, detect dangerous drug interactions, identify duplicate therapies, flag allergy contraindications, and track longitudinal biomarkers across multiple hospital visits and prescriptions.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38bdf8?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features & Capabilities

- **📑 Multi-Document Clinical Ingestion & OCR:**
  - Automated extraction of PDF prescriptions, discharge summaries, and lab reports using PyMuPDF and optical character recognition.
  - OCR confidence scoring and interactive terminal-style raw text inspector.
- **💊 Brand-to-Generic Medication Reconciliation:**
  - Normalizes brand drug names (e.g., *Glucophage* $\rightarrow$ *Metformin*, *Lipitor* $\rightarrow$ *Atorvastatin*).
  - Categorizes active versus discontinued regimens and tracks dosage trajectories.
- **🛡️ Deterministic Clinical Safety Rule Engine:**
  - Evaluates severe drug-drug interactions (e.g., *Ciprofloxacin + Warfarin* bleeding risk).
  - Detects duplicate therapies and same-class drug duplications.
  - Cross-references patient allergy profiles against beta-lactam and antibiotic families.
- **📈 Interactive Longitudinal Biomarker Tracking:**
  - Dynamic Recharts line and area charts with clinical reference intervals (Min/Max normal boundaries).
  - Real-time status badges for high, normal, and out-of-range lab results.
- **💬 Ask MedGuard AI (Conversational QA with Citations):**
  - Synthesizes cross-document evidence to answer complex physician queries.
  - Verifiable document citations with page numbers, relevance matches, and exact text excerpts.
- **⚡ Live Interactive Stepper Pipeline:**
  - Visual 5-stage processing stepper with live execution progress and error boundaries.
- **🧪 Comprehensive Test Suites:**
  - Full `pytest` backend integration suite and `vitest` frontend component test suite.

---

## 🚀 Quick Start Guide

### Option 1: Running with Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/Jathu-26/my-react-app.git MedGuard-AI
cd MedGuard-AI

# Launch multi-container stack
docker-compose up -d --build
```
- Open **`http://localhost:3000`** in your browser.
- Backend API Docs available at **`http://localhost:8000/docs`**.

---

### Option 2: Running Locally

#### 1. Start the FastAPI Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Start the Next.js Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open **`http://localhost:3000`**.

---

## 🔬 Evaluating the Pre-Configured Demo Scenario

1. Open `http://localhost:3000` and click **"Load Demo Patient Profile"**.
2. **Eleanor Vance** (MRN-10892) is loaded with 3 medical records:
   - *Emergency Visit Prescription:* Prescribes `Ciprofloxacin 500mg` and `Amoxicillin 500mg`.
   - *Primary Care History:* Documents active `Warfarin 5mg`, `Metformin 500mg`, and `Glucophage 850mg`.
   - *Blood Chemistry Panel:* Records longitudinal blood glucose and HbA1c readings.
3. Observe instant detection of:
   - 🚨 **Critical Alert:** *Ciprofloxacin + Warfarin* (CYP1A2 inhibition and severe INR spike / hemorrhage hazard).
   - ⚠️ **Duplicate Therapy:** *Metformin + Glucophage* (Concurrent duplicate biguanide therapy).
   - 🚫 **Allergy Contraindication:** *Amoxicillin* prescribed despite documented *Penicillin* allergy.

For step-by-step walkthrough details, see [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).

---

## 🧪 Running Automated Tests

### Backend Unit & Integration Tests (Pytest)
```bash
cd backend
pytest -v
```

### Frontend Unit & Utility Tests (Vitest)
```bash
cd frontend
npm run test
```

---

## 📚 Technical Documentation

- 📖 **[System Architecture](./SYSTEM_ARCHITECTURE.md)**: Architectural diagrams, sequence flows, and rule engine design.
- 📡 **[REST API Documentation](./API_DOCUMENTATION.md)**: OpenAPI endpoints, schemas, and example payloads.
- 🗄️ **[Database Schema](./DATABASE_SCHEMA.md)**: Entity-relationship diagrams and table indexes.
- 🚢 **[Deployment Guide](./DEPLOYMENT.md)**: Production containerization, reverse proxy, and scaling.
- 📋 **[Demonstration Script](./DEMO_SCRIPT.md)**: Evaluator guide and clinical test cases.
- 🗂️ **[Project Structure](./PROJECT_STRUCTURE.md)**: Comprehensive codebase taxonomy.

---

## 🔒 Medical & Privacy Disclaimers

> **Clinical Decision Support Notice:**  
> This application provides AI-assisted document review and does not provide medical diagnosis, treatment, or professional medical advice. AI-generated findings may be incomplete or incorrect. Consult a qualified doctor or pharmacist before making any healthcare decision.

> **Privacy & Demonstration Notice:**  
> Designed with privacy-aware practices for demonstration purposes. Uploaded medical records may contain sensitive personal information. Use only authorized demonstration data. For high-risk or low-confidence results, professional review is strongly recommended.

---

## 📄 License
Released under the [MIT License](LICENSE).
