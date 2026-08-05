"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Zap,
  Copy,
  Activity,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Printer,
  Sparkles,
  Info,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { apiClient } from "../../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  riskBadge,
  confidenceScorePercent,
  confidenceColor,
  alertCategoryIconName,
} from "../../lib/utils";

export default function SafetyAlertsPage() {
  const { activePatient } = usePatient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["alerts", activePatient?.id],
    queryFn: () => (activePatient ? apiClient.getAlerts(activePatient.id) : []),
    enabled: !!activePatient,
  });

  if (!activePatient) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
        <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Patient Selected
        </h3>
        <p className="text-xs text-slate-500">
          Select an active patient to inspect drug interactions and clinical safety warnings.
        </p>
        <Link href="/patients">
          <Button size="sm" variant="default">
            Select Patient
          </Button>
        </Link>
      </div>
    );
  }

  const criticalCount = alerts.filter(
    (a) => a.risk_level?.toLowerCase() === "critical" || a.risk_level?.toLowerCase() === "high"
  ).length;

  const filteredAlerts = alerts.filter((alert) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      alert.title.toLowerCase().includes(q) ||
      (alert.explanation && alert.explanation.toLowerCase().includes(q)) ||
      (alert.recommended_action && alert.recommended_action.toLowerCase().includes(q)) ||
      (alert.category && alert.category.toLowerCase().includes(q));

    const matchesRisk =
      selectedRisk === "all" ||
      alert.risk_level?.toLowerCase() === selectedRisk.toLowerCase();

    const matchesCategory =
      selectedCategory === "all" ||
      alert.category?.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesRisk && matchesCategory;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Clinical Safety & Conflict Alerts
            </h2>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalCount} High Priority
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Automated multi-document cross-checking for {activePatient.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="text-xs gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </Button>
          <Link href="/upload">
            <Button size="sm" variant="default" className="text-xs">
              + Upload More Records
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Critical & High
          </p>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {criticalCount}
          </p>
          <p className="text-[11px] text-slate-500">Require immediate physician review</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Medium & Moderate
          </p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {alerts.filter((a) => ["medium", "moderate"].includes(a.risk_level?.toLowerCase() || "")).length}
          </p>
          <p className="text-[11px] text-slate-500">Dosage monitoring advised</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Allergy Conflicts
          </p>
          <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">
            {alerts.filter((a) => a.category?.toLowerCase().includes("allergy")).length}
          </p>
          <p className="text-[11px] text-slate-500">Cross-referenced against allergy profile</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-teal-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Warnings
          </p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {alerts.length}
          </p>
          <p className="text-[11px] text-slate-500">Rule-engine generated</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search alerts by medication name, explanation, category..."
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Risk Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["all", "high", "medium", "low"].map((risk) => (
            <button
              key={risk}
              type="button"
              onClick={() => setSelectedRisk(risk)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                selectedRisk === risk
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {risk === "all" ? "All Risks" : `${risk} Risk`}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Stream List */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-36 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-36 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      ) : filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map((alert, idx) => {
            const badge = riskBadge(alert.risk_level);
            const conf = confidenceScorePercent(alert.confidence);

            return (
              <Card
                key={alert.id || idx}
                className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-sm"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {alert.category || "Clinical Alert"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceColor(
                            alert.confidence
                          )}`}
                        >
                          {conf}% confidence
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {alert.title}
                      </CardTitle>
                    </div>

                    <Link href={`/chat?q=${encodeURIComponent("Explain this safety alert: " + alert.title)}`}>
                      <Button size="sm" variant="subtle" className="text-xs gap-1 h-8 shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask AI About This</span>
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  {/* Detailed Clinical Explanation */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      Clinical Finding & Rationale:
                    </span>
                    <p>{alert.explanation}</p>
                  </div>

                  {/* Recommended Action */}
                  {alert.recommended_action && (
                    <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Recommended Clinical Action:</span>
                      </div>
                      <p className="leading-relaxed pl-5.5">{alert.recommended_action}</p>
                    </div>
                  )}

                  {/* Supporting Evidence Text */}
                  {alert.supporting_text && (
                    <div className="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400 block mb-0.5">Verifiable Document Excerpt:</span>
                      &ldquo;{alert.supporting_text}&rdquo;
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Safety Conflicts Found
          </h3>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No alerts match "${searchQuery}".`
              : "The medical rule engine has verified all documents without finding drug-drug or allergen conflicts."}
          </p>
        </div>
      )}
    </div>
  );
}
