"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Pill,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  Search,
  Filter,
  Copy,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { apiClient } from "../../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { formatDate, confidenceScorePercent, confidenceColor } from "../../lib/utils";

export default function MedicationsPage() {
  const { activePatient } = usePatient();
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("all");

  const { data: medications = [], isLoading, refetch } = useQuery({
    queryKey: ["medications", activePatient?.id],
    queryFn: () => (activePatient ? apiClient.getMedications(activePatient.id) : []),
    enabled: !!activePatient,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts", activePatient?.id],
    queryFn: () => (activePatient ? apiClient.getAlerts(activePatient.id) : []),
    enabled: !!activePatient,
  });

  const duplicateAlerts = alerts.filter(
    (a) => a.category?.toLowerCase().includes("duplicate") || a.title?.toLowerCase().includes("duplicate")
  );

  const filteredMeds = medications.filter((m) => {
    const q = searchQuery.toLowerCase();
    const drugName = (m.drug_name || m.name_as_written || "").toLowerCase();
    const normalizedName = (m.normalized_name || m.normalised_name || "").toLowerCase();
    const dose = (m.dosage || m.dose || m.strength || "").toLowerCase();
    const freq = (m.frequency || "").toLowerCase();

    const matchesSearch =
      drugName.includes(q) ||
      normalizedName.includes(q) ||
      dose.includes(q) ||
      freq.includes(q);

    const matchesTab =
      tab === "all" ||
      (tab === "active" && m.status === "active") ||
      (tab === "discontinued" && m.status === "discontinued");

    return matchesSearch && matchesTab;
  });

  if (!activePatient) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
        <Pill className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Patient Selected
        </h3>
        <p className="text-xs text-slate-500">
          Select a patient to reconcile active prescriptions and detect duplicate medicines.
        </p>
        <Link href="/patients">
          <Button size="sm" variant="default">
            Select Patient
          </Button>
        </Link>
      </div>
    );
  }

  const activeCount = medications.filter((m) => m.status === "active").length;
  const discontinuedCount = medications.filter((m) => m.status === "discontinued").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Medication Reconciliation & Cross-Check
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Comprehensive drug history extracted from {activePatient.name}&apos;s prescriptions and discharge notes
          </p>
        </div>

        <Link href="/upload">
          <Button size="sm" variant="default" className="text-xs">
            + Upload Prescription
          </Button>
        </Link>
      </div>

      {/* Duplicate Therapy Warning Banner */}
      {duplicateAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
            <Copy className="w-4 h-4 text-amber-600" />
            <span>Duplicate Therapy or Same-Class Medicine Alert Detected</span>
          </div>
          {duplicateAlerts.map((dup, i) => (
            <div key={i} className="text-xs text-amber-800/90 dark:text-amber-200/90 ml-6 space-y-1">
              <p className="font-semibold">• {dup.title}</p>
              <p className="text-[11px] opacity-90">{dup.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stats row & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{medications.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600">
            <Pill className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Regimens</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discontinued / Replaced</p>
            <p className="text-2xl font-bold text-slate-500">{discontinuedCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <Input
            placeholder="Search by drug name, active ingredient, dosage..."
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} defaultValue="all" className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All ({medications.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="discontinued">Discontinued ({discontinuedCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Medication List Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredMeds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map((med) => {
            const conf = confidenceScorePercent(med.confidence);
            const isActive = med.status === "active";

            return (
              <Card
                key={med.id}
                className={`transition-all ${
                  isActive
                    ? "border-sky-200 dark:border-sky-900/50 hover:shadow-md"
                    : "opacity-80 border-slate-200 dark:border-slate-800"
                }`}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isActive ? "teal" : "secondary"}
                          className="text-[10px] font-bold uppercase tracking-wider"
                        >
                          {med.status || "active"}
                        </Badge>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceColor(
                            med.confidence
                          )}`}
                        >
                          {conf}% confidence
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>{med.drug_name || med.name_as_written}</span>
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  {/* Normalized Generic Name */}
                  {(med.normalized_name || med.normalised_name) && (
                    <div className="text-xs">
                      <span className="text-slate-400">Generic / Active: </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {med.normalized_name || med.normalised_name}
                      </span>
                    </div>
                  )}

                  {/* Dosage & Frequency */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Dosage
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {med.dosage || med.dose || med.strength || "Not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Frequency
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {med.frequency || "Daily / As directed"}
                      </span>
                    </div>
                  </div>

                  {/* Route & Dates */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Route: {med.route || "Oral"}</span>
                    {med.start_date && <span>Started: {formatDate(med.start_date)}</span>}
                    {med.end_date && <span>Ended: {formatDate(med.end_date)}</span>}
                  </div>

                  {/* Evidence Text */}
                  {med.supporting_text && (
                    <div className="p-2.5 rounded-lg bg-sky-50/50 dark:bg-slate-950 border border-sky-100 dark:border-sky-950 text-[11px] font-mono text-slate-600 dark:text-slate-400 line-clamp-2">
                      &ldquo;{med.supporting_text}&rdquo;
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Medications Found
          </p>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No medications match "${searchQuery}".`
              : "Upload medical records to extract prescribed and OTC medications."}
          </p>
        </div>
      )}
    </div>
  );
}
