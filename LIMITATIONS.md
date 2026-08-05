# MedGuard AI • Clinical Limitations & System Boundaries

## 1. Scope of Deterministic Clinical Rule Engine
MedGuard AI combines high-accuracy multimodal AI information extraction with a **deterministic, explainable clinical rule engine**.

### Current In-Memory Knowledge Base:
- **50+ High-Frequency Critical Drug Interactions**:
  - NSAIDs (Ibuprofen, Naproxen, Ketorolac) + Anticoagulants/Antiplatelets (Warfarin, Apixaban, Clopidogrel, Aspirin) -> Major Bleeding Risk.
  - ACE Inhibitors (Lisinopril, Enalapril) + ARBs (Losartan) + Potassium-Sparing Diuretics / Supplements (Spironolactone, Potassium Chloride) -> Severe Hyperkalemia Risk.
  - Statins (Atorvastatin, Simvastatin) + Fibrates (Gemfibrozil) / Macrolide Antibiotics (Clarithromycin) -> Rhabdomyolysis Risk.
  - Metformin + Iodinated Radiocontrast Media -> Lactic Acidosis Risk.
  - SSRIs (Sertraline, Fluoxetine) + Tramadol / MAOIs -> Serotonin Syndrome Risk.
  - Beta-Blockers + Non-Dihydropyridine CCBs (Verapamil, Diltiazem) -> Severe Bradycardia / Heart Block.
  - Methotrexate + NSAIDs / Penicillins -> Methotrexate Toxicity.
  - Fluoroquinolones + Corticosteroids -> Tendon Rupture Risk.
- **Cross-Class Allergy Mappings**:
  - Penicillin allergy cross-reactive with all semi-synthetic Penicillins (Amoxicillin, Ampicillin, Piperacillin) and 1st-generation Cephalosporins.
  - Sulfonamide antibiotic allergy cross-reactivity flags (Sulfamethoxazole, Trimethoprim-Sulfamethoxazole).
  - Aspirin/NSAID induced respiratory exacerbation (AERD).
- **Duplicate Therapy Detection**:
  - Identifies multiple brand names for the same active ingredient (e.g., *Glucophage* + *Metformin*, *Lipitor* + *Atorvastatin*).
  - Identifies overlapping therapeutic classes prescribed by different healthcare providers across different visit dates.

### Extensibility to External Clinical Databases:
For comprehensive coverage across 10,000+ rare medications and combinations, the architecture supports pluggable external clinical API connectors:
- **RxNorm / NLM RxNav REST API** for complete active ingredient code mapping.
- **DailyMed / FDA Structured Product Labeling (SPL)**.
- **DrugBank / First Databank (FDB) / Lexicomp** integration interfaces.

---

## 2. OCR and Handwritten Document Limitations
- Scanned PDF documents with clear typed text achieve >95% character accuracy with PyMuPDF and EasyOCR preprocessing.
- Severely degraded scans, low-resolution mobile photographs (<150 DPI), and cursive handwriting may produce lower confidence extractions (<60%).
- The system flags low-confidence extractions with a prominent `"Needs Clinician Review"` badge and alerts the user rather than silently hallucinating missing fields.

---

## 3. Regulatory and Clinical Disclaimer
MedGuard AI is designed as an **AI-assisted cross-referencing and decision-support tool for healthcare professionals and patients**.
- It is **not** an autonomous diagnostic device.
- It does **not** replace the clinical judgment of a licensed physician or pharmacist.
- All high-risk alerts and dosage discrepancies must be reviewed and confirmed with a qualified clinician before altering any medical regimen.
