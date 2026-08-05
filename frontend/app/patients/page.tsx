"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  UserCheck,
  Calendar,
  FileText,
  AlertTriangle,
  Shield,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { useToast } from "../../lib/context/toast-context";
import { apiClient } from "../../lib/api-client";
import { Patient, PatientCreate } from "../../lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { formatDate } from "../../lib/utils";

export default function PatientsPage() {
  const { activePatient, setActivePatient, loadDemoPatient, isDemoLoading } = usePatient();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formGender, setFormGender] = useState("Female");
  const [formRefNum, setFormRefNum] = useState("");
  const [formAllergies, setFormAllergies] = useState("");

  const { data: patients = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["patients"],
    queryFn: () => apiClient.listPatients(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: PatientCreate) => apiClient.createPatient(payload),
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setActivePatient(newPatient);
      success("Patient Registered", `${newPatient.name} has been added to the registry.`);
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      error("Registration Failed", err?.response?.data?.detail || err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatientCreate }) =>
      apiClient.updatePatient(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (activePatient?.id === updated.id) {
        setActivePatient(updated);
      }
      success("Patient Updated", `${updated.name}'s profile has been updated.`);
      setEditingPatient(null);
      resetForm();
    },
    onError: (err: any) => {
      error("Update Failed", err?.response?.data?.detail || err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePatient(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (activePatient?.id === deletedId) {
        const remaining = patients.filter((p) => p.id !== deletedId);
        setActivePatient(remaining.length > 0 ? remaining[0] : null);
      }
      success("Patient Removed", "Patient and associated records deleted.");
      setDeletingPatient(null);
    },
    onError: (err: any) => {
      error("Delete Failed", err?.response?.data?.detail || err.message);
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormDob("");
    setFormGender("Female");
    setFormRefNum("");
    setFormAllergies("");
  };

  const handleOpenEdit = (p: Patient) => {
    setEditingPatient(p);
    setFormName(p.name);
    setFormDob(p.date_of_birth || "");
    setFormGender(p.gender || "Female");
    setFormRefNum(p.reference_number || "");
    try {
      const parsed = p.known_allergies ? JSON.parse(p.known_allergies) : [];
      setFormAllergies(Array.isArray(parsed) ? parsed.join(", ") : "");
    } catch {
      setFormAllergies(p.known_allergies || "");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      error("Validation Error", "Patient name is required.");
      return;
    }
    const allergiesList = formAllergies
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const payload: PatientCreate = {
      name: formName.trim(),
      date_of_birth: formDob.trim() || null,
      gender: formGender,
      reference_number: formRefNum.trim() || null,
      allergies: allergiesList,
    };

    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(q)) ||
      (p.date_of_birth && p.date_of_birth.includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Patient Registry
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Total of {patients.length} registered patient profiles
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="teal"
            size="sm"
            onClick={() => loadDemoPatient()}
            isLoading={isDemoLoading}
            className="gap-1.5 text-xs shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Patient</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="gap-1.5 text-xs shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Patient</span>
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          placeholder="Search by patient name, MRN, or DOB..."
          icon={<Search className="w-4 h-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Patients Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((p) => {
            const isActive = activePatient?.id === p.id;
            let parsedAllergies: string[] = [];
            try {
              parsedAllergies = p.known_allergies ? JSON.parse(p.known_allergies) : [];
            } catch {
              parsedAllergies = p.known_allergies ? [p.known_allergies] : [];
            }

            return (
              <Card
                key={p.id}
                className={`transition-all duration-200 hover:shadow-md ${
                  isActive
                    ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20 dark:bg-sky-950/20"
                    : "hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {p.reference_number || "MRN-N/A"}
                        </span>
                        {isActive && (
                          <Badge variant="teal" className="text-[10px] py-0">
                            Active Patient
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base truncate font-bold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Patient"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPatient(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                        title="Delete Patient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>DOB: {p.date_of_birth || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.document_count} Documents</span>
                    </div>
                  </div>

                  {/* Allergies tag list */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Known Allergies
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {parsedAllergies.length > 0 ? (
                        parsedAllergies.map((allergy, aIdx) => (
                          <span
                            key={aIdx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50"
                          >
                            ⚠️ {allergy}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No allergies documented</span>
                      )}
                    </div>
                  </div>

                  {/* Set Active Button */}
                  <div className="pt-2">
                    <Button
                      variant={isActive ? "secondary" : "default"}
                      size="sm"
                      onClick={() => setActivePatient(p)}
                      className="w-full gap-1.5 text-xs font-semibold"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isActive ? "Currently Active" : "Select Patient"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Patients Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No patient records match "${searchQuery}".`
              : "There are no registered patients yet. Create a new patient or load the demo records."}
          </p>
          <div className="pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
            >
              Add New Patient
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Patient Dialog */}
      <Dialog
        open={isCreateOpen || !!editingPatient}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingPatient(null);
            resetForm();
          }
        }}
      >
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>
              {editingPatient ? "Edit Patient Record" : "Register New Patient"}
            </DialogTitle>
            <DialogDescription>
              {editingPatient
                ? "Update clinical details, medical record number, and documented allergies."
                : "Create an electronic medical profile to attach prescriptions, notes, and lab reports."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name *
              </label>
              <Input
                placeholder="e.g. Eleanor Vance"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gender
                </label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reference / MRN Number
              </label>
              <Input
                placeholder="e.g. YGC-001 or MRN-9842"
                value={formRefNum}
                onChange={(e) => setFormRefNum(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Documented Allergies (comma-separated)
              </label>
              <Input
                placeholder="e.g. Penicillin, Aspirin, Sulfa drugs"
                value={formAllergies}
                onChange={(e) => setFormAllergies(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                Used by the rule engine to identify antibiotic and medication conflicts.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingPatient(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingPatient ? "Save Changes" : "Create Patient"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!deletingPatient}
        onOpenChange={(open) => {
          if (!open) setDeletingPatient(null);
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-rose-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Delete Patient Record?</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {deletingPatient?.name}
            </span>
            ? All uploaded documents, extracted medications, and safety analysis will be permanently erased.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeletingPatient(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            isLoading={deleteMutation.isPending}
            onClick={() => deletingPatient && deleteMutation.mutate(deletingPatient.id)}
          >
            Yes, Delete Patient
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
