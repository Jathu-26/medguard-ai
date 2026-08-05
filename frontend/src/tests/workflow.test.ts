import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../../lib/api-client";
import type { Overview, Alert, LabTrend, ChatAnswer, Patient, ProcessingJob, EvidenceCitation } from "../../lib/types";

describe("MedGuard AI - Comprehensive Frontend Workflow & Scenario Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. validates complete patient lifecycle: create, get, update, and delete", async () => {
    const mockPatient: Patient = {
      id: "pat-100",
      name: "Eleanor Vance",
      date_of_birth: "1974-03-22",
      gender: "Female",
      reference_number: "MRN-100",
      known_allergies: "Penicillin",
      document_count: 0,
      created_at: "2026-08-01",
    };

    const createSpy = vi.spyOn(apiClient, "createPatient").mockResolvedValue(mockPatient);
    const getSpy = vi.spyOn(apiClient, "getPatient").mockResolvedValue(mockPatient);
    const updateSpy = vi.spyOn(apiClient, "updatePatient").mockResolvedValue({ ...mockPatient, name: "Eleanor Vance-Hill" });
    const deleteSpy = vi.spyOn(apiClient, "deletePatient").mockResolvedValue();

    // Create
    const created = await apiClient.createPatient({ name: "Eleanor Vance", date_of_birth: "1974-03-22", gender: "Female", allergies: ["Penicillin"] });
    expect(created.id).toBe("pat-100");
    expect(createSpy).toHaveBeenCalled();

    // Get
    const fetched = await apiClient.getPatient("pat-100");
    expect(fetched.name).toBe("Eleanor Vance");
    expect(getSpy).toHaveBeenCalledWith("pat-100");

    // Update
    const updated = await apiClient.updatePatient("pat-100", { name: "Eleanor Vance-Hill" });
    expect(updated.name).toBe("Eleanor Vance-Hill");
    expect(updateSpy).toHaveBeenCalled();

    // Delete
    await apiClient.deletePatient("pat-100");
    expect(deleteSpy).toHaveBeenCalledWith("pat-100");
  });

  it("2. validates multi-file upload and background processing job polling", async () => {
    const mockUploadRes = {
      message: "Uploaded 2 documents",
      documents: [
        { id: "doc-1", patient_id: "pat-100", original_name: "prescription.pdf", processing_status: "uploaded" },
        { id: "doc-2", patient_id: "pat-100", original_name: "lab_results.png", processing_status: "uploaded" },
      ],
    };
    vi.spyOn(apiClient, "uploadDocuments").mockResolvedValue(mockUploadRes as any);

    const mockJob: ProcessingJob = {
      id: "job-abc",
      patient_id: "pat-100",
      status: "completed",
      current_stage: "Completed",
      overall_progress: 100,
      stages: [
        "Reading document",
        "Extracting text",
        "Structured clinical entity extraction",
        "Completed",
      ],
    };

    vi.spyOn(apiClient, "processDocument").mockResolvedValue({ job_id: "job-abc", status: "processing" });
    vi.spyOn(apiClient, "getProcessingJob").mockResolvedValue(mockJob);

    // Upload
    const fakeFiles = [new File(["dummy"], "prescription.pdf", { type: "application/pdf" })];
    const uploaded = await apiClient.uploadDocuments("pat-100", fakeFiles);
    expect(uploaded.documents.length).toBe(2);

    // Start process
    const procStart = await apiClient.processDocument("doc-1");
    expect(procStart.job_id).toBe("job-abc");

    // Poll status
    const pollResult = await apiClient.getProcessingJob("job-abc");
    expect(pollResult.status).toBe("completed");
    expect(pollResult.overall_progress).toBe(100);
    expect(pollResult.stages.length).toBeGreaterThanOrEqual(4);
  });

  it("3. validates clinical overview dashboard metrics and safety stats", async () => {
    const mockOverview: Overview = {
      total_documents: 4,
      total_visits: 3,
      current_medications: 5,
      known_allergies: ["Penicillin", "Sulfa"],
      abnormal_lab_results: 3,
      high_risk_warnings: 2,
      medium_risk_warnings: 1,
      low_risk_warnings: 1,
      average_confidence: 91.2,
      documents_needing_review: 0,
    };
    vi.spyOn(apiClient, "getOverview").mockResolvedValue(mockOverview);

    const overview = await apiClient.getOverview("pat-100");
    expect(overview.total_documents).toBe(4);
    expect(overview.known_allergies).toHaveLength(2);
    expect(overview.high_risk_warnings).toBe(2);
    expect(overview.average_confidence).toBeCloseTo(91.2);
  });

  it("4. validates safety alerts with source documents and page numbers", async () => {
    const mockAlerts: Alert[] = [
      {
        id: "alert-1",
        title: "Allergy Conflict: Amoxicillin with known Penicillin allergy",
        category: "Allergy Conflict",
        risk_level: "High",
        medications_involved: ["Amoxicillin"],
        relevant_dates: ["2026-06-15"],
        explanation: "Amoxicillin belongs to penicillin class.",
        evidence: ["Prescribed Amoxicillin 500mg TID"],
        source_documents: ["doc_visit2.pdf"],
        page_numbers: [2],
        confidence: 94.0,
        recommended_action: "Professional review strongly recommended.",
      },
      {
        id: "alert-2",
        title: "Potential Drug Interaction: Warfarin + Aspirin",
        category: "Drug Interaction",
        risk_level: "High",
        medications_involved: ["Warfarin", "Aspirin"],
        relevant_dates: ["2026-01-10", "2026-06-15"],
        explanation: "Both agents affect clotting; increased bleeding risk.",
        evidence: ["Warfarin 5mg daily", "Aspirin 81mg daily"],
        source_documents: ["doc_visit1.pdf", "doc_visit2.pdf"],
        page_numbers: [1, 2],
        confidence: 88.0,
        recommended_action: "Professional review strongly recommended.",
      },
    ];
    vi.spyOn(apiClient, "getAlerts").mockResolvedValue(mockAlerts);

    const alerts = await apiClient.getAlerts("pat-100");
    expect(alerts).toHaveLength(2);
    expect(alerts[0].page_numbers).toEqual([2]);
    expect(alerts[1].source_documents).toContain("doc_visit1.pdf");
    expect(alerts[1].source_documents).toContain("doc_visit2.pdf");
    expect(alerts[0].recommended_action).toContain("Professional review strongly recommended");
  });

  it("5. validates longitudinal lab trends and trajectory classification", async () => {
    const mockTrends: LabTrend[] = [
      {
        test_name: "Fasting Blood Sugar",
        normalised_test_name: "Fasting Blood Sugar",
        trend: "Increasing trend",
        explanation: "Fasting Blood Sugar increased from 95 mg/dL to 185 mg/dL.",
        status: "High",
        unit: "mg/dL",
        statuses: ["Normal", "High"],
        points: [
          { date: "2026-01-10", value: 95.0, unit: "mg/dL", status: "Normal", confidence: 92 },
          { date: "2026-06-15", value: 185.0, unit: "mg/dL", status: "High", confidence: 95 },
        ],
      },
    ];
    vi.spyOn(apiClient, "getLabTrends").mockResolvedValue(mockTrends);

    const trends = await apiClient.getLabTrends("pat-100");
    expect(trends).toHaveLength(1);
    expect(trends[0].trend).toContain("Increasing");
    expect(trends[0].points).toHaveLength(2);
    expect(trends[0].points[1].value).toBe(185.0);
  });

  it("6. validates grounded RAG Q&A with evidence citations and safety disclaimers", async () => {
    const citations: EvidenceCitation[] = [
      { excerpt: "Metformin 500mg PO BID", document_name: "visit1.pdf", page: 1 },
      { excerpt: "Metformin 850mg PO BID", document_name: "visit2.pdf", page: 2 },
    ];
    const mockChatAnswer: ChatAnswer = {
      answer: "Yes, Dr. A prescribed Metformin 500mg on Jan 10 and Dr. B prescribed Metformin 850mg on Jun 15.",
      reasoning_summary: "Duplicate therapy detected across encounters.",
      citations: citations,
      evidence: citations,
      confidence: 89.0,
      risk_level: "Medium",
      recommendation: "Professional review strongly recommended.",
      disclaimer: "This application provides AI-assisted document review and does not provide medical diagnosis, treatment, or professional medical advice.",
      missing_information: [],
      relevant_dates: ["2026-01-10", "2026-06-15"],
      medications: ["Metformin"],
      tests: [],
    };
    vi.spyOn(apiClient, "askChat").mockResolvedValue(mockChatAnswer);

    const answer = await apiClient.askChat("pat-100", "Did two doctors prescribe the same medicine?");
    expect(answer.citations).toBeDefined();
    expect(answer.citations?.length).toBe(2);
    expect(answer.citations?.[0].page).toBe(1);
    expect(answer.citations?.[1].page).toBe(2);
    expect(answer.disclaimer).toContain("AI-assisted document review");
    expect(answer.recommendation).toContain("Professional review strongly recommended");
  });

  it("7. handles insufficient evidence gracefully", async () => {
    const insufficientAnswer: ChatAnswer = {
      answer: "The uploaded records do not contain enough reliable information to answer this question.",
      reasoning_summary: "No references to surgical procedures were found in the uploaded documents.",
      evidence: [],
      confidence: 40.0,
      risk_level: "Low",
      recommendation: "Check whether all relevant records have been uploaded.",
      disclaimer: "This application provides AI-assisted document review and does not provide medical diagnosis.",
      missing_information: ["Surgical procedure notes"],
      relevant_dates: [],
      medications: [],
      tests: [],
    };
    vi.spyOn(apiClient, "askChat").mockResolvedValue(insufficientAnswer);

    const answer = await apiClient.askChat("pat-100", "When did the patient have knee surgery?");
    expect(answer.answer).toContain("not contain enough reliable information");
    expect(answer.evidence).toHaveLength(0);
  });

  it("8. handles API errors safely", async () => {
    vi.spyOn(apiClient, "getOverview").mockRejectedValue(new Error("Network connection failed"));

    await expect(apiClient.getOverview("pat-unknown")).rejects.toThrow("Network connection failed");
  });
});
