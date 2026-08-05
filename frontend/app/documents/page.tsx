"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  UploadCloud,
  Search,
  Eye,
  Download,
  Trash2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { useToast } from "../../lib/context/toast-context";
import { apiClient } from "../../lib/api-client";
import { Document } from "../../lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import {
  formatBytes,
  formatDate,
  confidenceScorePercent,
  confidenceColor,
} from "../../lib/utils";

export default function DocumentsPage() {
  const { activePatient, refreshPatients } = usePatient();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [inspectDoc, setInspectDoc] = useState<Document | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["documents", activePatient?.id],
    queryFn: () => (activePatient ? apiClient.listDocuments(activePatient.id) : []),
    enabled: !!activePatient,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      refreshPatients();
      success("Document Deleted", "Document record and extracted items removed.");
      setDeletingDoc(null);
    },
    onError: (err: any) => {
      error("Delete Failed", err?.response?.data?.detail || err.message);
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => apiClient.processDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      success("Reprocessing Complete", "Document re-analyzed with updated clinical rules.");
    },
    onError: (err: any) => {
      error("Reprocess Failed", err?.response?.data?.detail || err.message);
    },
  });

  if (!activePatient) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
        <FileText className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Active Patient Selected
        </h3>
        <p className="text-xs text-slate-500">
          Select a patient to inspect uploaded PDF medical records and OCR text extractions.
        </p>
        <Link href="/patients">
          <Button size="sm" variant="default">
            Select Patient
          </Button>
        </Link>
      </div>
    );
  }

  const filteredDocs = documents.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.original_name.toLowerCase().includes(q) ||
      (d.classification && d.classification.toLowerCase().includes(q)) ||
      (d.extracted_text && d.extracted_text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Document & OCR Explorer
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {documents.length} clinical records archived for {activePatient.name}
          </p>
        </div>

        <Link href="/upload">
          <Button size="sm" variant="default" className="text-xs gap-1.5 shadow-sm">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload New Document</span>
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          placeholder="Search by file name, classification, or extracted text..."
          icon={<Search className="w-4 h-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Documents Table / Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const conf = doc.ocr_confidence ? confidenceScorePercent(doc.ocr_confidence) : 92;

            return (
              <Card
                key={doc.id}
                className="p-4 sm:p-5 hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Icon & Details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-sm">
                          {doc.original_name}
                        </h4>
                        <Badge variant="teal" className="text-[10px]">
                          {doc.classification || "Medical Record"}
                        </Badge>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceColor(
                            doc.ocr_confidence || 0.9
                          )}`}
                        >
                          {conf}% OCR Conf
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{formatBytes(doc.size_bytes)}</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(doc.created_at)}</span>
                        <span>•</span>
                        <span className="capitalize">{doc.processing_status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectDoc(doc)}
                      className="text-xs gap-1 h-8"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect OCR</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => reprocessMutation.mutate(doc.id)}
                      isLoading={reprocessMutation.isPending && reprocessMutation.variables === doc.id}
                      className="text-xs h-8 p-2"
                      title="Re-run OCR & Rules"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>

                    <a
                      href={apiClient.getDocumentFileUrl(doc.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Open Raw File"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setDeletingDoc(doc)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Documents Found
          </p>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No documents match "${searchQuery}".`
              : "Upload medical records to populate the document archive."}
          </p>
        </div>
      )}

      {/* Inspect OCR Extracted Text Dialog */}
      <Dialog
        open={!!inspectDoc}
        onOpenChange={(open) => {
          if (!open) setInspectDoc(null);
        }}
        className="max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <span className="truncate">{inspectDoc?.original_name}</span>
          </DialogTitle>
          <DialogDescription>
            OCR Text Extraction & Classification ({inspectDoc?.classification || "Document"})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span>Size: {formatBytes(inspectDoc?.size_bytes)}</span>
            <span>Uploaded: {formatDate(inspectDoc?.created_at)}</span>
            <span>OCR Confidence: {confidenceScorePercent(inspectDoc?.ocr_confidence || 0.9)}%</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Raw Extracted Text Stream:
            </span>
            <div className="max-h-80 overflow-y-auto p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-sky-600">
              {inspectDoc?.extracted_text || "No text could be extracted or document is pending OCR."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <a
            href={inspectDoc ? apiClient.getDocumentFileUrl(inspectDoc.id) : "#"}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Original File</span>
            </Button>
          </a>
          <Button variant="default" size="sm" onClick={() => setInspectDoc(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!deletingDoc}
        onOpenChange={(open) => {
          if (!open) setDeletingDoc(null);
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-rose-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            <span>Delete Document Record?</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {deletingDoc?.original_name}
            </span>
            ? This will remove its extracted medications, clinical timeline events, and associated safety warnings.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDeletingDoc(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onClick={() => deletingDoc && deleteMutation.mutate(deletingDoc.id)}
          >
            Delete Document
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
