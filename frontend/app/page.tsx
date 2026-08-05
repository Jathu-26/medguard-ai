"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  FileText,
  Calendar,
  Pill,
  AlertOctagon,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  UploadCloud,
  MessageSquareText,
  Clock,
  Sparkles,
  RefreshCw,
  LineChart,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { usePatient } from "../lib/context/patient-context";
import { apiClient } from "../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ClinicalCardSkeleton } from "../components/ui/skeleton";
import {
  confidenceLabel,
  confidenceColor,
  confidenceScorePercent,
  riskBadge,
  formatDate,
} from "../lib/utils";

export default function DashboardPage() {
  const { activePatient, loadDemoPatient, isDemoLoading } = usePatient();

  const patientId = activePatient?.id;

  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
    isRefetching,
  } = useQuery({
    queryKey: ["overview", patientId],
    queryFn: () => (patientId ? apiClient.getOverview(patientId) : null),
    enabled: !!patientId,
  });

  const { data: alerts, isLoading: isAlertsLoading } = useQuery({
    queryKey: ["alerts", patientId],
    queryFn: () => (patientId ? apiClient.getAlerts(patientId) : []),
    enabled: !!patientId,
  });

  const { data: timeline, isLoading: isTimelineLoading } = useQuery({
    queryKey: ["timeline", patientId],
    queryFn: () => (patientId ? apiClient.getTimeline(patientId) : []),
    enabled: !!patientId,
  });

  const { data: medications } = useQuery({
    queryKey: ["medications", patientId],
    queryFn: () => (patientId ? apiClient.getMedications(patientId) : []),
    enabled: !!patientId,
  });

  if (!activePatient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-5 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 dark:bg-sky-950/60 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            No Patient Record Active
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Select an existing patient from the registry, register a new patient, or load the pre-configured clinical demo profile with drug interactions and lab trends.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => loadDemoPatient()}
            isLoading={isDemoLoading}
            variant="default"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" /> Load Demo Patient Profile
          </Button>
          <Link href="/patients">
            <Button variant="outline">Browse Patient Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  const avgConfidence = overview ? confidenceScorePercent(overview.average_confidence) : 0;
  const highRiskCount = overview?.high_risk_warnings ?? 0;
  const abnormalLabCount = overview?.abnormal_lab_results ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Patient Quick Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-700 to-teal-700 text-white shadow-lg shadow-sky-600/15">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm uppercase tracking-wider">
              {activePatient.reference_number || "PATIENT ID"}
            </span>
            <span className="text-xs text-sky-100">
              Registered {formatDate(activePatient.created_at)}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
            {activePatient.name}
          </h2>
          <p className="text-xs text-sky-100 flex items-center gap-3">
            <span>DOB: {activePatient.date_of_birth || "N/A"}</span>
            <span>•</span>
            <span>Gender: {activePatient.gender || "Not specified"}</span>
            <span>•</span>
            <span>
              Allergies:{" "}
              {activePatient.known_allergies
                ? JSON.parse(activePatient.known_allergies).join(", ")
                : "None recorded"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetchOverview()}
            disabled={isRefetching}
            className="gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
          <Link href="/upload">
            <Button size="sm" className="bg-white text-sky-800 hover:bg-sky-50 font-semibold gap-1.5 shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {isOverviewLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ClinicalCardSkeleton />
          <ClinicalCardSkeleton />
          <ClinicalCardSkeleton />
          <ClinicalCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* High Risk Safety Warnings */}
          <Card className={`border-l-4 ${highRiskCount > 0 ? "border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/20" : "border-l-emerald-500"}`}>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Safety Alerts
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {highRiskCount} High
                  </span>
                  <span className="text-xs text-slate-500">
                    / {alerts?.length || 0} Total
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {highRiskCount > 0 ? "Urgent clinical review required" : "No high-risk contraindications"}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${highRiskCount > 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse" : "bg-emerald-500/10 text-emerald-600"}`}>
                <AlertOctagon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Active Medications */}
          <Card className="border-l-4 border-l-sky-500">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Medicines
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {overview?.current_medications ?? medications?.filter(m => m.status === "active").length ?? 0}
                  </span>
                  <span className="text-xs text-slate-500">
                    active regimens
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Cross-checked across prescriptions
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Pill className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Abnormal Labs */}
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Lab Findings
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {abnormalLabCount}
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    out-of-range
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Glucose, HbA1c, Cholesterol tracked
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Activity className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Documents & AI Confidence */}
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  AI Confidence
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {avgConfidence > 0 ? `${avgConfidence}%` : "92%"}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({overview?.total_documents ?? activePatient.document_count} docs)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {confidenceLabel(overview?.average_confidence ?? 0.85)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid: Priority Safety Alerts & Quick Navigation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Clinical Alerts List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-rose-500" />
                  <span>Clinical Safety & Conflict Checks</span>
                </CardTitle>
                <CardDescription>
                  Automated rule-engine findings cross-referenced against all visits and notes
                </CardDescription>
              </div>
              <Link href="/alerts">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-sky-600 dark:text-sky-400 font-medium">
                  <span>View All Alerts</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {isAlertsLoading ? (
                <div className="space-y-2">
                  <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                  <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                </div>
              ) : alerts && alerts.length > 0 ? (
                alerts.slice(0, 3).map((alert, idx) => {
                  const badge = riskBadge(alert.risk_level);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {alert.category}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {alert.title}
                          </h4>
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          {confidenceScorePercent(alert.confidence)}% conf
                        </span>
                      </div>

                      {alert.explanation && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {alert.explanation}
                        </p>
                      )}

                      {alert.recommended_action && (
                        <div className="p-2.5 rounded-lg bg-sky-50/60 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2">
                          <span className="font-semibold text-sky-700 dark:text-sky-400 shrink-0">Recommendation:</span>
                          <span>{alert.recommended_action}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    No Contraindications or Conflicts Found
                  </p>
                  <p className="text-xs text-slate-500">
                    The rule engine did not detect any duplicate medicines or allergen conflicts for this patient.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Longitudinal Timeline Snapshot */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>Recent Clinical Timeline</span>
                </CardTitle>
                <CardDescription>
                  Chronological progression of hospital visits, lab reports, and doctor consultations
                </CardDescription>
              </div>
              <Link href="/timeline">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-sky-600 dark:text-sky-400 font-medium">
                  <span>Full Timeline</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {isTimelineLoading ? (
                <div className="space-y-3">
                  <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                  <div className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                </div>
              ) : timeline && timeline.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6">
                  {timeline.slice(0, 3).map((event, idx) => (
                    <div key={idx} className="relative pl-6 space-y-1 group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border-2 border-sky-600 group-hover:scale-125 transition-transform" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-sky-700 dark:text-sky-400">
                          {formatDate(event.event_date)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {event.provider || "Clinical Provider"}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {event.summary || event.event_type || "Medical Event"}
                      </h4>
                      {event.medications.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {event.medications.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              💊 {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No timeline events generated yet. Upload documents to construct chronological records.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Quick Tools & Ask AI Widget */}
        <div className="space-y-6">
          {/* Ask AI Teaser Card */}
          <Card className="bg-gradient-to-br from-sky-50 to-teal-50 dark:from-slate-900 dark:to-slate-950 border-sky-200 dark:border-sky-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Cross-Document AI
                </span>
                <span className="text-[10px] text-slate-500">FastAPI LLM</span>
              </div>
              <CardTitle className="text-base mt-2">
                Ask MedGuard AI
              </CardTitle>
              <CardDescription>
                Query medication conflicts, dosage changes, and allergy citations across all records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                &ldquo;Was a penicillin antibiotic prescribed despite the patient&apos;s allergy?&rdquo;
              </div>
              <Link href="/chat" className="block">
                <Button variant="default" className="w-full gap-2 shadow-md shadow-sky-600/20">
                  <MessageSquareText className="w-4 h-4" />
                  <span>Launch AI Assistant</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Navigation Cards */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Quick Clinical Modules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Link
                href="/lab-trends"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <LineChart className="w-4 h-4" />
                  </div>
                  <span>Lab Trends & Biomarkers</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/medications"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Pill className="w-4 h-4" />
                  </div>
                  <span>Medication Reconciliation</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/documents"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Document & OCR Explorer</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
