import axios, { AxiosProgressEvent } from "axios";
import {
  Alert,
  Allergy,
  ChatAnswer,
  ChatHistory,
  DocumentPage,
  LabTrend,
  MedicalDocument,
  Medication,
  Overview,
  Patient,
  PatientCreate,
  ProcessingJob,
  ProcessResponse,
  TimelineEvent,
  UploadResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

export const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

export const apiClient = {
  // System Health
  async getHealth(): Promise<{ status: string }> {
    const { data } = await api.get("/health");
    return data;
  },

  // Patients
  async listPatients(): Promise<Patient[]> {
    const { data } = await api.get<Patient[]>("/api/patients");
    return data;
  },

  async getPatient(id: string): Promise<Patient> {
    const { data } = await api.get<Patient>(`/api/patients/${id}`);
    return data;
  },

  async createPatient(payload: PatientCreate): Promise<Patient> {
    const { data } = await api.post<Patient>("/api/patients", payload);
    return data;
  },

  async updatePatient(id: string, payload: PatientCreate): Promise<Patient> {
    const { data } = await api.put<Patient>(`/api/patients/${id}`, payload);
    return data;
  },

  async deletePatient(id: string): Promise<void> {
    await api.delete(`/api/patients/${id}`);
  },

  // Demo
  async loadDemoPatient(): Promise<{ id: string; message: string }> {
    const { data } = await api.post<{ id: string; message: string }>("/api/demo/patient");
    return data;
  },

  // Analytics & Patient Clinical Data
  async getOverview(patientId: string): Promise<Overview> {
    const { data } = await api.get<Overview>(`/api/patients/${patientId}/overview`);
    return data;
  },

  async getTimeline(patientId: string): Promise<TimelineEvent[]> {
    const { data } = await api.get<TimelineEvent[]>(`/api/patients/${patientId}/timeline`);
    return data;
  },

  async getMedications(patientId: string): Promise<Medication[]> {
    const { data } = await api.get<Medication[]>(`/api/patients/${patientId}/medications`);
    return data;
  },

  async getAllergies(patientId: string): Promise<Allergy[]> {
    const { data } = await api.get<Allergy[]>(`/api/patients/${patientId}/allergies`);
    return data;
  },

  async getAlerts(patientId: string): Promise<Alert[]> {
    const { data } = await api.get<Alert[]>(`/api/patients/${patientId}/alerts`);
    return data;
  },

  async getLabTrends(patientId: string): Promise<LabTrend[]> {
    const { data } = await api.get<LabTrend[]>(`/api/patients/${patientId}/lab-trends`);
    return data;
  },

  // Cross-Document Chat
  async askChat(
    patientId: string,
    question: string,
    sessionId?: string
  ): Promise<ChatAnswer> {
    const { data } = await api.post<ChatAnswer>(`/api/patients/${patientId}/chat`, {
      question,
      session_id: sessionId || null,
    });
    return data;
  },

  async chat(
    patientId: string,
    question: string,
    sessionId?: string
  ): Promise<ChatAnswer> {
    return this.askChat(patientId, question, sessionId);
  },

  async getChatHistory(
    patientId: string,
    sessionId?: string
  ): Promise<ChatHistory> {
    const { data } = await api.get<ChatHistory>(
      `/api/patients/${patientId}/chat/history`,
      { params: { session_id: sessionId } }
    );
    return data;
  },

  // Documents
  async listDocuments(patientId: string): Promise<MedicalDocument[]> {
    const { data } = await api.get<MedicalDocument[]>(
      `/api/patients/${patientId}/documents`
    );
    return data;
  },

  async getDocument(documentId: string): Promise<MedicalDocument> {
    const { data } = await api.get<MedicalDocument>(
      `/api/documents/${documentId}`
    );
    return data;
  },

  async getDocumentPages(documentId: string): Promise<DocumentPage[]> {
    const { data } = await api.get<DocumentPage[]>(
      `/api/documents/${documentId}/pages`
    );
    return data;
  },

  getDocumentFileUrl(documentId: string): string {
    return `${API_BASE_URL}/api/documents/${documentId}/file`;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/api/documents/${documentId}`);
  },

  async uploadDocuments(
    patientId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    for (const f of files) {
      formData.append("files", f);
    }
    const { data } = await api.post<UploadResponse>(
      `/api/patients/${patientId}/documents`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      }
    );
    return data;
  },

  async processDocument(documentId: string): Promise<ProcessResponse> {
    const { data } = await api.post<ProcessResponse>(
      `/api/documents/${documentId}/process`
    );
    return data;
  },

  async getProcessingJob(jobId: string): Promise<ProcessingJob> {
    const { data } = await api.get<ProcessingJob>(`/api/processing/${jobId}`);
    return data;
  },
};
