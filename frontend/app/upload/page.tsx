"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { useToast } from "../../lib/context/toast-context";
import { apiClient } from "../../lib/api-client";
import { UploadQueueItem } from "../../lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { formatBytes } from "../../lib/utils";

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".txt"];
const MAX_FILE_SIZE_MB = 20;

export default function UploadPage() {
  const router = useRouter();
  const { activePatient, refreshPatients } = usePatient();
  const { success, error, warning } = useToast();

  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported format "${ext}". Allowed: PDF, PNG, JPG, JPEG, TXT.`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_FILE_SIZE_MB}MB size limit.`;
    }
    if (file.size === 0) {
      return "Empty file detected.";
    }
    return null;
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadQueueItem[] = [];
    Array.from(files).forEach((file) => {
      const validationError = validateFile(file);
      const id = Math.random().toString(36).substring(2, 9);
      let previewUrl: string | undefined = undefined;

      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      newItems.push({
        id,
        file,
        previewUrl,
        status: validationError ? "error" : "pending",
        progress: 0,
        error: validationError || undefined,
      });
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleAddFiles(e.dataTransfer.files);
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartUpload = async () => {
    if (!activePatient) {
      warning("Select Patient", "Please select or create an active patient first.");
      return;
    }

    const pendingItems = queue.filter((i) => i.status === "pending" || i.status === "error");
    if (pendingItems.length === 0) {
      warning("No Files", "Please add valid files to the upload queue.");
      return;
    }

    setIsUploading(true);

    try {
      const filesToUpload = pendingItems.map((i) => i.file);

      // Update state to uploading
      setQueue((prev) =>
        prev.map((i) => (pendingItems.some((p) => p.id === i.id) ? { ...i, status: "uploading", progress: 20 } : i))
      );

      const res = await apiClient.uploadDocuments(activePatient.id, filesToUpload, (progress) => {
        setQueue((prev) =>
          prev.map((i) =>
            pendingItems.some((p) => p.id === i.id) ? { ...i, progress: Math.min(progress, 90) } : i
          )
        );
      });

      // Automatically trigger processing for newly uploaded documents
      const uploadedDocs = res.documents;
      setQueue((prev) =>
        prev.map((i, idx) => {
          if (pendingItems.some((p) => p.id === i.id)) {
            const doc = uploadedDocs[idx];
            return {
              ...i,
              status: "processing",
              progress: 95,
              documentId: doc?.id,
            };
          }
          return i;
        })
      );

      // Run document processing endpoint for each uploaded document
      for (const doc of uploadedDocs) {
        try {
          await apiClient.processDocument(doc.id);
        } catch (procErr) {
          console.error("Processing error for doc", doc.id, procErr);
        }
      }

      setQueue((prev) =>
        prev.map((i) =>
          pendingItems.some((p) => p.id === i.id)
            ? { ...i, status: "completed", progress: 100 }
            : i
        )
      );

      await refreshPatients();
      success(
        "Upload & Processing Complete",
        `Processed ${uploadedDocs.length} document(s). Clinical rules and timeline updated.`
      );
    } catch (err: any) {
      error("Upload Failed", err?.response?.data?.detail || err.message);
      setQueue((prev) =>
        prev.map((i) =>
          pendingItems.some((p) => p.id === i.id)
            ? { ...i, status: "error", error: "Upload failed" }
            : i
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Patient Header Banner */}
      <div className="p-4 rounded-2xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-sky-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-600 text-white shadow-sm">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Target Patient Record
            </p>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {activePatient ? activePatient.name : "No Patient Selected"}
            </h3>
          </div>
        </div>

        {!activePatient && (
          <Link href="/patients">
            <Button size="sm" variant="default">
              Select Patient First
            </Button>
          </Link>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-all duration-200 cursor-pointer text-center p-8 sm:p-12 ${
          isDragging
            ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-4 ring-sky-500/10"
            : "border-slate-300 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 bg-white dark:bg-slate-900/60"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          className="hidden"
          onChange={(e) => handleAddFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Drag & Drop Medical Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click to browse or drop Prescriptions, Discharge Summaries, Doctor Notes, or Lab Reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-semibold text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              PDF
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              PNG
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              JPG / JPEG
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              TXT
            </span>
            <span>• Max 20MB per file</span>
          </div>
        </div>
      </Card>

      {/* Upload Queue List */}
      {queue.length > 0 && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Upload Queue ({queue.length} items)
              </h4>
              <p className="text-xs text-slate-500">
                Review documents before submitting for AI OCR & clinical analysis
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueue([])}
                disabled={isUploading}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear All
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleStartUpload}
                isLoading={isUploading}
                disabled={!activePatient}
                className="gap-1.5 shadow-sm font-semibold text-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upload & Process ({queue.filter((i) => i.status === "pending").length})</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt="preview"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatBytes(item.file.size)} • {item.file.type || "Document"}
                    </p>
                    {item.error && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {item.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Status Indicator */}
                  {item.status === "completed" && (
                    <Badge variant="teal" className="gap-1 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </Badge>
                  )}
                  {item.status === "processing" && (
                    <Badge variant="sky" className="gap-1 text-[10px] animate-pulse">
                      <Sparkles className="w-3 h-3 animate-spin" /> Processing
                    </Badge>
                  )}
                  {item.status === "uploading" && (
                    <div className="w-24 space-y-1">
                      <Progress value={item.progress} className="h-1.5" />
                      <span className="text-[10px] text-slate-400 block text-right">{item.progress}%</span>
                    </div>
                  )}
                  {item.status === "error" && (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertCircle className="w-3 h-3" /> Failed
                    </Badge>
                  )}

                  {/* Remove Button */}
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => removeQueueItem(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick jump to live processing view */}
          <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
            <span>Uploaded documents will automatically extract medications and run safety rules.</span>
            <Link href="/processing" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1">
              <span>View Processing Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
