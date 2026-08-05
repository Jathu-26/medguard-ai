/**
 * MedGuard AI Core TypeScript Data Models and Schema Definitions
 */

export interface Patient {
  id: string;
  name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  reference_number?: string | null;
  known_allergies?: string | null;
  document_count: number;
  created_at?: string | null;
}

export interface PatientCreate {
  name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  reference_number?: string | null;
  allergies?: string[];
}

export interface MedicalDocument {
  id: string;
  patient_id: string;
  file_name?: string;
  original_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  page_count?: number;
  classification?: string | null;
  document_date?: string | null;
  provider?: string | null;
  doctor_name?: string | null;
  overall_confidence?: number;
  ocr_confidence?: number | null;
  processing_status: string;
  error_message?: string | null;
  text_extraction_method?: string | null;
  ocr_used?: boolean;
  extracted_text?: string | null;
  created_at?: string | null;
}

export type Document = MedicalDocument;

export interface DocumentPage {
  page_number: number;
  text: string;
  method?: string | null;
  confidence: number;
}

export interface UploadResponse {
  documents: MedicalDocument[];
}

export interface ProcessingJob {
  id: string;
  patient_id: string;
  status: "processing" | "completed" | "failed" | "needs_review";
  current_stage: string;
  overall_progress: number;
  error_message?: string | null;
  stages: string[];
}

export interface ProcessResponse {
  job_id: string;
  status: string;
}

export interface Overview {
  total_documents: number;
  total_visits: number;
  current_medications: number;
  known_allergies: string[];
  abnormal_lab_results: number;
  high_risk_warnings: number;
  medium_risk_warnings: number;
  low_risk_warnings: number;
  average_confidence: number;
  documents_needing_review: number;
}

export interface Alert {
  id?: string | null;
  title: string;
  category: "Drug Interaction" | "Duplicate Medication" | "Duplicate Medicine" | "Dosage Conflict" | "Allergy Conflict" | "Prescription Conflict" | string;
  risk_level: "Critical" | "High" | "Medium" | "Low" | string;
  medications_involved?: string[];
  relevant_dates?: string[];
  explanation?: string | null;
  evidence?: string[];
  source_documents?: string[];
  page_numbers?: number[];
  confidence: number;
  recommended_action?: string | null;
  supporting_text?: string | null;
}

export interface TimelineEvent {
  id?: string | null;
  event_date?: string | null;
  event_type: string;
  document_type?: string | null;
  provider?: string | null;
  doctor_name?: string | null;
  summary?: string | null;
  diagnoses: string[];
  medications: string[];
  lab_results: string[];
  allergies: string[];
  clinical_notes: string[];
  source_document?: string | null;
  source_document_id?: string | null;
  page_numbers: number[];
  supporting_text?: string | null;
  confidence: number;
}

export interface LabTrendPoint {
  date?: string | null;
  test_date?: string | null;
  value?: number | null;
  text_value?: string | null;
  unit?: string | null;
  reference_min?: number | null;
  reference_max?: number | null;
  normal_range_min?: number | null;
  normal_range_max?: number | null;
  status?: string | null;
  interpretation?: string | null;
  source_document?: string | null;
  confidence?: number;
}

export interface LabTrend {
  test_name: string;
  normalised_test_name?: string | null;
  points: LabTrendPoint[];
  trend?: string;
  explanation?: string;
  statuses?: string[];
  unit?: string | null;
  normal_range_min?: number | null;
  normal_range_max?: number | null;
  status?: string;
}

export interface Medication {
  id?: string | null;
  name_as_written?: string;
  drug_name?: string;
  normalised_name?: string | null;
  normalized_name?: string | null;
  generic_name?: string | null;
  brand_name?: string | null;
  active_ingredient?: string | null;
  strength?: string | null;
  dose?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  instructions?: string | null;
  confidence: number;
  match_confidence?: number | null;
  source_text?: string | null;
  supporting_text?: string | null;
  created_at?: string | null;
}

export interface Allergy {
  id?: string | null;
  substance: string;
  reaction?: string | null;
  severity?: string | null;
  date_recorded?: string | null;
  confidence: number;
  source_text?: string | null;
  created_at?: string | null;
}

export interface EvidenceCitation {
  document_id?: string;
  document_name?: string;
  page?: number;
  excerpt?: string;
  text?: string;
  score?: number;
  relevance_score?: number;
}

export interface ChatAnswer {
  answer?: string;
  response?: string;
  reasoning_summary?: string | null;
  relevant_dates?: string[];
  medications?: string[];
  tests?: string[];
  evidence?: Array<EvidenceCitation | string>;
  citations?: EvidenceCitation[];
  confidence: number;
  risk_level?: string | null;
  recommendation?: string | null;
  disclaimer?: string | null;
  missing_information?: string[];
}

export type ChatResponse = ChatAnswer;

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string | null;
  parsed_answer?: ChatAnswer | null;
}

export interface ChatHistory {
  session_id: string;
  messages: ChatMessage[];
}

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl?: string;
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  documentId?: string;
}
