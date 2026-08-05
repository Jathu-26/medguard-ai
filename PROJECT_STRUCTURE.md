# MedGuard AI • Project Structure & Codebase Taxonomy

Below is the directory map and architectural breakdown of the MedGuard AI workspace.

```
YGC/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point & CORS configuration
│   │   ├── database.py             # SQLAlchemy engine, session maker & Base
│   │   ├── models/                 # SQLAlchemy DB Models
│   │   │   ├── __init__.py
│   │   │   ├── patient.py          # Patient model
│   │   │   ├── document.py         # Document & DocumentPage models
│   │   │   ├── medication.py       # Medication model
│   │   │   ├── alert.py            # SafetyAlert model
│   │   │   ├── timeline.py         # TimelineEvent model
│   │   │   └── lab_result.py       # LabResult model
│   │   ├── schemas/                # Pydantic Request/Response Schemas
│   │   │   ├── __init__.py
│   │   │   ├── patient.py
│   │   │   ├── document.py
│   │   │   ├── medication.py
│   │   │   ├── alert.py
│   │   │   ├── timeline.py
│   │   │   ├── lab.py
│   │   │   └── chat.py
│   │   ├── routers/                # FastAPI Route Handlers
│   │   │   ├── __init__.py
│   │   │   ├── patients.py         # Patient CRUD & Demo Seeding
│   │   │   ├── documents.py        # Upload, File Serving & Ingestion
│   │   │   ├── alerts.py           # Safety Alerts & Conflicts
│   │   │   ├── timeline.py         # Timeline Events
│   │   │   ├── medications.py      # Medication Reconciliation
│   │   │   ├── lab_trends.py       # Longitudinal Lab Trends
│   │   │   ├── chat.py             # Cross-Document AI Chat
│   │   │   └── health.py           # Health Check
│   │   └── services/               # Core Analytical & Clinical Engines
│   │       ├── __init__.py
│   │       ├── ai_provider.py      # Gemini LLM & Deterministic Fallback Engine
│   │       ├── ocr_service.py      # PyMuPDF / OCR Document Parsing
│   │       ├── normalizer.py       # Brand-to-Generic Normalization
│   │       ├── rule_engine.py      # Clinical Safety & Interaction Engine
│   │       ├── timeline_service.py # Longitudinal Trajectory Builder
│   │       ├── lab_service.py      # Lab Trends & Normal Range Evaluator
│   │       ├── chat_service.py     # Semantic QA with Citations
│   │       └── demo_service.py     # Demo Profile Seed Data (Eleanor Vance)
│   ├── tests/                      # Pytest Testing Suite
│   │   ├── conftest.py             # SQLite in-memory DB & TestClient fixtures
│   │   ├── test_patients.py        # Patient CRUD & validation tests
│   │   ├── test_rules_engine.py    # Clinical rules, interactions & duplicate tests
│   │   └── test_demo_and_pipeline.py # End-to-end pipeline & chat tests
│   ├── requirements.txt            # Python dependencies
│   ├── Dockerfile                  # Python 3.11-slim container spec
│   └── run.py                      # Uvicorn startup script
│
├── frontend/                       # Next.js 15 + React 18 + Tailwind CSS
│   ├── app/                        # Next.js App Router Pages
│   │   ├── layout.tsx              # Root HTML, Fonts, Theme & Context Wrappers
│   │   ├── globals.css             # Healthcare Design Tokens & Animations
│   │   ├── page.tsx                # Clinical Safety KPI Dashboard
│   │   ├── patients/page.tsx       # Patient Registry & Management
│   │   ├── upload/page.tsx         # Drag & Drop Document Ingestion
│   │   ├── processing/page.tsx     # Live Stepper Pipeline Execution
│   │   ├── timeline/page.tsx       # Longitudinal Medical Trajectory
│   │   ├── medications/page.tsx    # Medication Reconciliation & Generic Mapping
│   │   ├── alerts/page.tsx         # Clinical Safety Warnings & Actions
│   │   ├── lab-trends/page.tsx     # Recharts Interactive Biomarker Tracking
│   │   ├── chat/page.tsx           # Ask MedGuard AI with Evidence Citations
│   │   ├── documents/page.tsx      # Document & OCR Raw Text Explorer
│   │   └── settings/page.tsx       # Backend Probe, Demo Reset & HIPAA Notices
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Responsive layout container with top banner
│   │   │   ├── Sidebar.tsx         # Primary clinical navigation sidebar
│   │   │   └── Header.tsx          # Patient selector, dark mode toggle & actions
│   │   └── ui/                     # Reusable Atomic UI Component Suite
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       ├── skeleton.tsx
│   │       ├── tabs.tsx
│   │       └── progress.tsx
│   ├── lib/
│   │   ├── types.ts                # TypeScript Interfaces & Models
│   │   ├── utils.ts                # Healthcare formatters & helpers
│   │   ├── api-client.ts           # Axios HTTP Gateway Client
│   │   └── context/
│   │       ├── patient-context.tsx # Global Active Patient & Demo State
│   │       ├── toast-context.tsx   # Healthcare Floating Alert Toasts
│   │       └── theme-context.tsx   # Light/Dark Theme Switcher
│   ├── src/tests/
│   │   └── utils.test.ts           # Vitest unit test suite
│   ├── vitest.config.ts            # Vitest testing configuration
│   ├── tailwind.config.ts          # Tailwind clinical theme configuration
│   ├── package.json                # Dependencies & Scripts
│   ├── tsconfig.json               # TypeScript Compiler Configuration
│   └── Dockerfile                  # Multi-stage production container spec
│
├── docker-compose.yml              # Multi-container orchestration
├── README.md                       # Master project overview & quick start
├── DEPLOYMENT.md                   # Production deployment & infrastructure guide
├── API_DOCUMENTATION.md            # OpenAPI / REST API specification
├── SYSTEM_ARCHITECTURE.md          # Architectural and sequence diagrams
├── DATABASE_SCHEMA.md              # Relational database schema & ER diagram
└── DEMO_SCRIPT.md                  # Evaluator walkthrough guide
```
