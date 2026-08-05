# MedGuard AI • Comprehensive Fix & Quality Audit

This document details the audit, root-cause analysis, implementation plan, and verification strategy for all 10 confirmed issues in the **MedGuard AI** platform.

---

## 📋 Comprehensive Issues & Fix Matrix

| # | Issue Description | Current Behavior | Root Cause | Files Involved | Fix Plan | Verification Method | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **1** | **Lab Trend API Name Mismatch** | Tests and scripts call `calculate_lab_trends`, whereas `analytics_service.py` defines `get_lab_trends`. | Divergence during initial service scaffolding between analytics endpoints and helper utilities. | `backend/app/services/analytics_service.py`, `backend/tests/`, `backend/process_official_dataset.py`, `backend/app/api/analytics.py` | Unify on `get_lab_trends` and provide an explicit compatibility alias `calculate_lab_trends = get_lab_trends`. | Pytest unit tests, `verify_backend.py`, dataset runner. | **IN PROGRESS** |
| **2** | **Processing Progress is Synchronous & Pre-Looped** | The processing endpoint looped through stages before `process_document()` executed, blocking synchronously. | Synchronous mock loop in `/api/documents/{id}/process` without asynchronous state tracking. | `backend/app/api/documents.py`, `backend/app/services/processing_service.py`, `frontend/app/processing/page.tsx` | Implement asynchronous execution with `BackgroundTasks`, updating `ProcessingJob` at every actual pipeline milestone. | Real job polling via `/api/processing/{job_id}` with frontend progress bar. | **IN PROGRESS** |
| **3** | **Chat Retrieval is Keyword-Only with Weak Synthesis** | Chat relied only on exact word intersection (TF overlap), failing on semantic synonyms and complex temporal queries. | Simple term set intersection in `_retrieve_chunks` without document-metadata weighting, recency, or structured entity injection. | `backend/app/services/chat_service.py`, `backend/app/ai/provider.py` | Implement hybrid retrieval combining keyword matching, entity/medication boosting, recency weighting, and cross-document context synthesis. | Ask AI evaluation queries (*"Did two doctors prescribe the same medicine?"*). | **IN PROGRESS** |
| **4** | **Structured Extraction Lacks Repair Retry** | Invalid or slightly malformed JSON from LLM caused pipeline to fail immediately. | Single-pass parsing in `OpenAIProvider.extract_structured` with immediate `ValueError`. | `backend/app/ai/provider.py`, `backend/app/services/processing_service.py` | Add a repair prompt retry sending validation error back to LLM, with fallback to partial extraction and safe field salvage. | Unit tests simulating invalid JSON and repair prompt recovery. | **IN PROGRESS** |
| **5** | **Evidence Page Numbers Unreliable** | Medications, allergies, and lab results lacked exact page storage, often defaulting to page 1. | Missing `page_number` column in models and hardcoded `page_numbers=[1]` in persistence logic. | `backend/app/models/medical.py`, `backend/app/services/processing_service.py`, `backend/app/services/analytics_service.py` | Add `page_number` to `Medication`, `LabResult`, `Allergy`, `DiagnosisMention`; index entity locations by page text. | Document & timeline inspections verifying multi-page citations. | **IN PROGRESS** |
| **6** | **Timeline Events Medically Inaccurate** | Every visit event queried all patient labs and allergies across all time. | `build_timeline_events` filtered `LabResult` and `Allergy` by `patient_id` rather than `document_id` / `visit_id`. | `backend/app/services/analytics_service.py` | Scope lab results, allergies, and medications strictly to the current visit's `document_id`. | Timeline verification test ensuring visit-specific entity isolation. | **IN PROGRESS** |
| **7** | **Official Dataset Evaluation Script Broken** | Batch runner had import mismatches and lacked structured evaluation assertions. | Outdated imports and missing CLI execution assertions. | `backend/process_official_dataset.py`, `OFFICIAL_DATASET_EVALUATION.md` | Fix API calls, add full batch execution verification, and produce structured pass/fail reports. | Run `python process_official_dataset.py` on demo dataset with automated validation. | **IN PROGRESS** |
| **8** | **Frontend Tests Too Shallow** | Only utility functions were covered in Vitest; no full workflow tests existed. | Missing component and multi-step UI workflow tests. | `frontend/src/tests/workflow.test.ts`, `frontend/src/tests/utils.test.ts` | Add full frontend user workflow and component integration tests with mock API client. | Run `npm run test` (Vitest) validating full user workflow. | **IN PROGRESS** |
| **9** | **OCR Test Coverage Insufficient** | Edge cases (scanned PDFs, image formats, EXIF rotation, empty/corrupted PDFs, OCR failures) lacked automated tests. | Sparse OCR unit testing in `backend/tests/`. | `backend/tests/test_ocr_and_docs.py`, `backend/app/document_processing/extractor.py` | Add comprehensive test suite covering scanned PDFs, images, rotation, contrast, corrupt files, and OCR error recovery. | Run `pytest tests/test_ocr_and_docs.py -v`. | **IN PROGRESS** |
| **10** | **Drug Interaction Coverage Transparency** | Clinical boundaries and rule engine scope required honest documentation. | Lack of explicit disclosure regarding local rule set scope (50+ core interactions). | `LIMITATIONS.md`, `README.md`, `SYSTEM_ARCHITECTURE.md`, `backend/app/medical_rules/knowledge.py` | Explicitly state local dataset scope and document external pharmacopoeia API extensibility. | Documentation audit confirming honest disclosures. | **IN PROGRESS** |

---

## 🎯 Implementation Roadmap

1. **Phase 2:** Unify Lab Trend API (`get_lab_trends` and `calculate_lab_trends`).
2. **Phase 3:** Update Database Models with `page_number` and fix timeline scoping in `analytics_service.py`.
3. **Phase 4:** Fix `processing_service.py` page-level entity indexing and add LLM structured repair retry in `provider.py`.
4. **Phase 5:** Implement real asynchronous processing jobs with stage updates in `backend/app/api/documents.py`.
5. **Phase 6:** Upgrade Chat Service to Hybrid RAG with cross-document reasoning.
6. **Phase 7:** Fix `process_official_dataset.py` batch runner.
7. **Phase 8:** Add comprehensive OCR test suite (`test_ocr_and_docs.py`) and extended frontend workflow tests.
8. **Phase 9:** Execute full verification across backend and frontend.
