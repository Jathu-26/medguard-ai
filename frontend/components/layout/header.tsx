"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  UploadCloud,
  ChevronDown,
  UserCheck,
  Plus,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { Button } from "../ui/button";
import { apiClient } from "../../lib/api-client";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Clinical Overview Dashboard",
    subtitle: "Real-time safety alerts, active medications, and diagnostic trends",
  },
  "/patients": {
    title: "Patient Management",
    subtitle: "Browse, register, inspect, and update electronic health records",
  },
  "/upload": {
    title: "Upload Medical Documents",
    subtitle: "Drag & drop prescriptions, discharge summaries, and lab reports (PDF/Images)",
  },
  "/processing": {
    title: "Live Document Processing",
    subtitle: "Multi-stage pipeline: OCR, extraction, normalisation, and clinical rules",
  },
  "/timeline": {
    title: "Medical Timeline",
    subtitle: "Interactive chronological history of patient visits, prescriptions, and lab results",
  },
  "/medications": {
    title: "Medication Reconciliation",
    subtitle: "Track active prescriptions, discontinued medicines, duplicates, and dosage history",
  },
  "/alerts": {
    title: "Clinical Safety Alerts",
    subtitle: "Automated rule engine detection: drug interactions, allergies, and dosage conflicts",
  },
  "/lab-trends": {
    title: "Laboratory Trends & Biomarkers",
    subtitle: "Interactive longitudinal trend charts with clinical reference intervals",
  },
  "/chat": {
    title: "Ask MedGuard AI",
    subtitle: "Cross-document clinical reasoning with verifiable evidence citations and disclaimers",
  },
  "/documents": {
    title: "Document Explorer",
    subtitle: "Inspect uploaded medical records, text extraction outputs, and OCR verification",
  },
  "/settings": {
    title: "System Settings & Configuration",
    subtitle: "Manage backend connectivity, demo profiles, and healthcare compliance settings",
  },
};

export function Header({ onOpenMobile }: { onOpenMobile: () => void }) {
  const pathname = usePathname();
  const { patients, activePatient, selectPatientById, refreshPatients } = usePatient();
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      await apiClient.getHealth();
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const matched =
    PAGE_TITLES[pathname] || {
      title: "MedGuard AI",
      subtitle: "Medical Document Cross-Checking Platform",
    };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-3.5 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      {/* Left: Mobile Toggle & Page Info */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 focus:outline-none"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {matched.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
            {matched.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Active Patient Dropdown & Quick Actions */}
      <div className="flex items-center gap-2.5 md:gap-4">
        {/* Backend API Health Status */}
        <button
          type="button"
          onClick={() => checkHealth()}
          title="Click to check backend connectivity status"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300"
        >
          {isChecking ? (
            <>
              <Activity className="w-3.5 h-3.5 text-sky-500 animate-spin" />
              <span>Checking...</span>
            </>
          ) : apiOnline === true ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Backend Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>Backend Offline (Click to Retry)</span>
            </>
          )}
        </button>

        {/* Patient Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPatientDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="max-w-[110px] sm:max-w-[160px] truncate">
              {activePatient?.name || "Select Patient"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isPatientDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsPatientDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 p-2 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Patient ({patients.length})
                  </span>
                  <Link
                    href="/patients"
                    onClick={() => setIsPatientDropdownOpen(false)}
                    className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                  >
                    Manage
                  </Link>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        selectPatientById(p.id);
                        setIsPatientDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col transition-colors ${
                        p.id === activePatient?.id
                          ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200/50 dark:border-sky-800/50"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        DOB: {p.date_of_birth || "N/A"} • Docs: {p.document_count}
                      </span>
                    </button>
                  ))}
                  {patients.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No patients registered
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Upload Button */}
        <Link href="/upload">
          <Button size="sm" variant="default" className="gap-1.5 shadow-sm">
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Record</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
