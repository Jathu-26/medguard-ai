"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  RotateCw,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { useToast } from "../../lib/context/toast-context";
import { apiClient } from "../../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { formatBytes, formatDate } from "../../lib/utils";

const PIPELINE_STAGES = [
  { id: "Reading", name: "Reading Document", desc: "Parsing PDF binary and loading page buffers" },
  { id: "OCR", name: "Text OCR / PyMuPDF", desc: "Extracting optical text, layout coordinates & confidence" },
  { id: "Classification", name: "Classification", desc: "Categorizing: Prescription, Note, Lab Report, Discharge" },
  { id: "Extraction", name: "Entity Extraction", desc: "Extracting dosages, dates, medications, lab values, notes" },
  { id: "Normalization", name: "Medical Normalization", desc: "Standardizing brand names to active generic ingredients" },
  { id: "Rule Engine", name: "Clinical Rule Engine", desc: "Cross-checking drug interactions, duplicates & allergy conflicts" },
  { id: "Timeline", name: "Timeline Reconstruction", desc: "Rebuilding longitudinal patient visit trajectory" },
  { id: "Lab Analysis", name: "Lab Trend Computation", desc: "Calculating multi-visit biomarker status and normal ranges" },
  { id: "Completed", name: "Completed & Verified", desc: "All clinical models synced with electronic health record" },
];

export default function ProcessingPage() {
  const { activePatient } = usePatient();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStageName, setCurrentStageName] = useState<string>("Ready");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", activePatient?.id],
    queryFn: () => (activePatient ? apiClient.listDocuments(activePatient.id) : []),
    enabled: !!activePatient,
  });

  const handleRunPipeline = async (docId: string) => {
    setSelectedDocId(docId);
    setIsProcessing(true);
    setActiveStageIndex(0);
    setProgressPercent(10);
    setCurrentStageName("Reading document");

    try {
      const resp = await apiClient.processDocument(docId);
      const jobId = resp.job_id;

      // Poll background processing job status
      const pollInterval = setInterval(async () => {
        try {
          const job = await apiClient.getProcessingJob(jobId);
          if (job.overall_progress) {
            setProgressPercent(Math.max(progressPercent, Math.round(job.overall_progress)));
          }
          if (job.current_stage) {
            setCurrentStageName(job.current_stage);
            const stageIdx = PIPELINE_STAGES.findIndex(
              (s) => s.id.toLowerCase() === job.current_stage.toLowerCase() ||
                     s.name.toLowerCase().includes(job.current_stage.toLowerCase()) ||
                     job.current_stage.toLowerCase().includes(s.id.toLowerCase())
            );
            if (stageIdx >= 0) {
              setActiveStageIndex(stageIdx);
            }
          }

          if (job.status === "completed") {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setProgressPercent(100);
            setActiveStageIndex(PIPELINE_STAGES.length - 1);
            setCurrentStageName("Completed & Verified");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
            queryClient.invalidateQueries({ queryKey: ["timeline"] });
            queryClient.invalidateQueries({ queryKey: ["medications"] });
            queryClient.invalidateQueries({ queryKey: ["lab-trends"] });
            success("Processing Complete", "Clinical rule engine and patient analytics successfully updated.");
          } else if (job.status === "failed") {
            clearInterval(pollInterval);
            setIsProcessing(false);
            error("Processing Failed", job.error_message || "Document processing failed.");
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          error("Processing Status Error", pollErr.message);
        }
      }, 500);
    } catch (err: any) {
      setIsProcessing(false);
      error("Processing Failed", err?.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Document AI Processing Pipeline
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Live multi-stage execution of OCR, medical entity extraction, and clinical rule checks.
          </p>
        </div>

        {activePatient && (
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-slate-900 border border-sky-200/60 dark:border-sky-800 text-sky-700 dark:text-sky-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Target Patient: {activePatient.name}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Document List on Left, Live Stepper on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Documents for Active Patient */}
        <Card className="lg:col-span-1 space-y-3 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Patient Records ({documents.length})</span>
            </h3>
            <Link href="/upload" className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline">
              + Upload
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isSelected = selectedDocId === doc.id;
                const isProcessingThis = isProcessing && isSelected;

                return (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 shadow-sm"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                    onClick={() => !isProcessing && setSelectedDocId(doc.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.original_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {doc.classification || "Unclassified"} • {formatBytes(doc.size_bytes)}
                        </p>
                      </div>
                      <Badge
                        variant={doc.processing_status === "completed" ? "teal" : "warning"}
                        className="text-[10px]"
                      >
                        {doc.processing_status}
                      </Badge>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {formatDate(doc.created_at)}
                      </span>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        disabled={isProcessing}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunPipeline(doc.id);
                        }}
                        className="h-7 text-[11px] gap-1 px-2.5"
                      >
                        {isProcessingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3" />
                        )}
                        <span>{isProcessingThis ? "Running..." : "Process AI"}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <p>No documents uploaded for this patient.</p>
              <Link href="/upload">
                <Button size="sm" variant="default" className="text-xs">
                  Upload Documents
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Right Column: Live Pipeline Stepper View */}
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Live Execution Monitor</span>
              </CardTitle>
              <CardDescription>
                Real-time inspection of active AI models, normalization tables, and rule engines
              </CardDescription>
            </div>

            {selectedDocId && (
              <Button
                size="sm"
                variant="default"
                disabled={isProcessing}
                onClick={() => handleRunPipeline(selectedDocId)}
                className="gap-1.5 shadow-sm text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Execute Pipeline</span>
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">
                {isProcessing
                  ? `Stage ${activeStageIndex + 1}/${PIPELINE_STAGES.length}: ${currentStageName}`
                  : activeStageIndex === PIPELINE_STAGES.length - 1
                  ? "Pipeline Execution Complete"
                  : "Ready to run"}
              </span>
              <span className="text-sky-600 dark:text-sky-400">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2.5" />
          </div>

          {/* Stages Visual Stepper */}
          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCompleted = idx < activeStageIndex || activeStageIndex === PIPELINE_STAGES.length - 1;
              const isCurrent = idx === activeStageIndex && isProcessing;
              const isUpcoming = idx > activeStageIndex;

              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 shadow-sm"
                      : isCompleted
                      ? "border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-800 dark:text-slate-200"
                      : "border-slate-100 dark:border-slate-800/80 opacity-60"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      </div>
                    ) : isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {stage.name}
                      </p>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {isCurrent ? "In Progress" : isCompleted ? "Verified" : "Queued"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jump to results once completed */}
          {activeStageIndex === PIPELINE_STAGES.length - 1 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All documents synchronized and clinical cross-checks generated.</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/alerts">
                  <Button size="sm" variant="default" className="text-xs gap-1">
                    <span>View Safety Alerts</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="sm" variant="outline" className="text-xs">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
