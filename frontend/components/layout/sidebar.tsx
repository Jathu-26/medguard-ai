"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  UploadCloud,
  Clock,
  Pill,
  AlertTriangle,
  LineChart,
  MessageSquareText,
  Files,
  Settings,
  Sparkles,
  Sun,
  Moon,
  Database,
  Activity,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { useTheme } from "../../lib/context/theme-context";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Upload Documents", href: "/upload", icon: UploadCloud },
  { name: "Medical Timeline", href: "/timeline", icon: Clock },
  { name: "Medications", href: "/medications", icon: Pill },
  { name: "Safety Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Lab Trends", href: "/lab-trends", icon: LineChart },
  { name: "Ask AI", href: "/chat", icon: MessageSquareText },
  { name: "Documents", href: "/documents", icon: Files },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { activePatient, loadDemoPatient, isDemoLoading } = usePatient();
  const { isDark, setTheme, theme } = useTheme();

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/80 w-64 md:w-72 shrink-0 transition-colors duration-200 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80">
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                MedGuard
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Clinical Safety & Cross-Check
            </p>
          </div>
        </Link>
      </div>

      {/* Active Patient Quick Card */}
      <div className="p-3 mx-3 my-2.5 rounded-xl bg-sky-50/70 dark:bg-slate-900/80 border border-sky-100 dark:border-sky-950/60">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-sky-700 dark:text-sky-400 flex items-center gap-1">
            <Activity className="w-3 h-3 animate-pulse" /> Active Patient
          </span>
          <Link
            href="/patients"
            onClick={onCloseMobile}
            className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
          >
            Change
          </Link>
        </div>
        {activePatient ? (
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {activePatient.name}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{activePatient.gender || "Patient"}</span>
              <span>•</span>
              <span>{activePatient.date_of_birth || "DOB N/A"}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400 italic">
            No patient selected
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-sky-600 text-white shadow-sm shadow-sky-600/20 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
        {/* Seed Demo Button */}
        <button
          type="button"
          onClick={() => loadDemoPatient()}
          disabled={isDemoLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-600/10 to-sky-600/10 dark:from-teal-950/50 dark:to-sky-950/50 text-teal-700 dark:text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-all disabled:opacity-50"
        >
          {isDemoLoading ? (
            <Activity className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Database className="w-3.5 h-3.5" />
          )}
          <span>{isDemoLoading ? "Loading Demo..." : "Load Demo Patient"}</span>
        </button>

        {/* Theme Toggle & Status */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              System Online
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
