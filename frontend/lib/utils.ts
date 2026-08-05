import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function confidenceLabel(score: number | null | undefined): string {
  const s = score ?? 0;
  // Score may be 0.0 - 1.0 or 0 - 100
  const normalized = s <= 1.0 ? s * 100 : s;
  if (normalized >= 90) return "Very High (90%+)";
  if (normalized >= 75) return "High (75-89%)";
  if (normalized >= 55) return "Moderate (55-74%)";
  if (normalized >= 35) return "Low (35-54%)";
  return "Needs Review (<35%)";
}

export function confidenceScorePercent(score: number | null | undefined): number {
  const s = score ?? 0;
  return Math.round(s <= 1.0 ? s * 100 : s);
}

export function confidenceColor(score: number | null | undefined): string {
  const s = confidenceScorePercent(score);
  if (s >= 75) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (s >= 55) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
}

export function riskBadge(level: string | null | undefined): {
  label: string;
  className: string;
  bg: string;
  text: string;
} {
  const l = (level || "low").toLowerCase();
  switch (l) {
    case "critical":
      return {
        label: "Critical Risk",
        className: "bg-rose-600 text-white border-rose-700 shadow-sm",
        bg: "bg-rose-600",
        text: "text-white",
      };
    case "high":
      return {
        label: "High Risk",
        className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        bg: "bg-rose-500/10",
        text: "text-rose-600 dark:text-rose-400",
      };
    case "medium":
    case "moderate":
      return {
        label: "Medium Risk",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
      };
    case "low":
    default:
      return {
        label: "Low Risk",
        className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        bg: "bg-sky-500/10",
        text: "text-sky-600 dark:text-sky-400",
      };
  }
}

export function alertCategoryIconName(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("interaction")) return "Zap";
  if (c.includes("duplicate")) return "Copy";
  if (c.includes("dosage")) return "Activity";
  if (c.includes("allergy")) return "AlertOctagon";
  return "ShieldAlert";
}

export function statusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "failed":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "needs_review":
    case "needs review":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "processing":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 animate-pulse";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
}

export const MEDICAL_DISCLAIMER =
  "This application provides AI-assisted document review and does not provide medical diagnosis, treatment, or professional medical advice. AI-generated findings may be incomplete or incorrect. Consult a qualified doctor or pharmacist before making any healthcare decision.";

export const PRIVACY_NOTICE =
  "Designed with privacy-aware practices for demonstration purposes. Uploaded medical records may contain sensitive personal information. Use only authorized demonstration data. For high-risk or low-confidence results, professional review is strongly recommended.";
