"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Calendar,
  Building2,
  User,
  Pill,
  Activity,
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { apiClient } from "../../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { formatDate, confidenceScorePercent, confidenceColor } from "../../lib/utils";

export default function TimelinePage() {
  const { activePatient } = usePatient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});

  const { data: timeline = [], isLoading, refetch } = useQuery({
    queryKey: ["timeline", activePatient?.id],
    queryFn: () => (activePatient ? apiClient.getTimeline(activePatient.id) : []),
    enabled: !!activePatient,
  });

  const toggleExpand = (idx: number) => {
    setExpandedEvents((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredTimeline = timeline.filter((event) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (event.summary && event.summary.toLowerCase().includes(q)) ||
      (event.doctor_name && event.doctor_name.toLowerCase().includes(q)) ||
      (event.provider && event.provider.toLowerCase().includes(q)) ||
      event.medications.some((m) => m.toLowerCase().includes(q)) ||
      event.diagnoses.some((d) => d.toLowerCase().includes(q)) ||
      event.lab_results.some((l) => l.toLowerCase().includes(q));

    const matchesType =
      selectedType === "all" ||
      (event.document_type && event.document_type.toLowerCase().includes(selectedType.toLowerCase())) ||
      (event.event_type && event.event_type.toLowerCase().includes(selectedType.toLowerCase()));

    return matchesSearch && matchesType;
  });

  if (!activePatient) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
        <Clock className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Active Patient Selected
        </h3>
        <p className="text-xs text-slate-500">
          Select a patient to inspect their chronological medical journey.
        </p>
        <Link href="/patients">
          <Button size="sm" variant="default">
            Select Patient
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Medical Timeline & Encounter Trajectory
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Longitudinal synthesis for {activePatient.name} across {timeline.length} clinical events
          </p>
        </div>

        <Link href="/upload">
          <Button size="sm" variant="default" className="text-xs">
            + Upload Next Encounter
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search timeline by medicine, provider, doctor, or diagnosis..."
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "prescription", "note", "lab", "discharge"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                selectedType === type
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {type === "all" ? "All Events" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      ) : filteredTimeline.length > 0 ? (
        <div className="relative border-l-2 border-sky-300 dark:border-sky-800 ml-4 md:ml-6 space-y-6 pt-2 pb-6">
          {filteredTimeline.map((event, idx) => {
            const isExpanded = !!expandedEvents[idx];
            const conf = confidenceScorePercent(event.confidence);

            return (
              <div key={idx} className="relative pl-6 md:pl-8 group animate-fade-in">
                {/* Timeline Dot with pulsing ring */}
                <div className="absolute -left-[11px] top-4 w-5 h-5 rounded-full bg-white dark:bg-slate-950 border-4 border-sky-600 group-hover:scale-110 transition-transform shadow-sm" />

                <Card className="hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-sm">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-600 text-white flex items-center gap-1.5 shadow-sm">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(event.event_date)}
                        </span>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {event.document_type || event.event_type || "Clinical Record"}
                        </Badge>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${confidenceColor(
                            event.confidence
                          )}`}
                        >
                          {conf}% Confidence
                        </span>
                      </div>

                      {/* Provider & Doctor */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {event.provider && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {event.provider}
                          </span>
                        )}
                        {event.doctor_name && (
                          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {event.doctor_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {event.summary || `${event.document_type || "Medical"} Encounter`}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4">
                    {/* Diagnoses Mentioned */}
                    {event.diagnoses.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Diagnoses Recorded
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {event.diagnoses.map((d, dIdx) => (
                            <span
                              key={dIdx}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60"
                            >
                              🩺 {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescribed Medications */}
                    {event.medications.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Medications Prescribed / Changed
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {event.medications.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60"
                            >
                              💊 {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Results / Values */}
                    {event.lab_results.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Laboratory Findings
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {event.lab_results.map((l, lIdx) => (
                            <span
                              key={lIdx}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                            >
                              🔬 {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verifiable Supporting Evidence / Excerpt */}
                    {event.supporting_text && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => toggleExpand(idx)}
                          className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                        >
                          <span>{isExpanded ? "Hide Evidence Excerpt" : "Show Verifiable Source Text"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed animate-fade-in">
                            {event.supporting_text}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Timeline Events Found
          </p>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No events match "${searchQuery}".`
              : "Upload medical records or discharge summaries to automatically reconstruct the timeline."}
          </p>
        </div>
      )}
    </div>
  );
}
