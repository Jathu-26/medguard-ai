"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Patient } from "../types";
import { apiClient } from "../api-client";
import { useToast } from "./toast-context";

interface PatientContextType {
  patients: Patient[];
  activePatient: Patient | null;
  isLoading: boolean;
  isDemoLoading: boolean;
  setActivePatient: (patient: Patient | null) => void;
  selectPatientById: (id: string) => void;
  refreshPatients: () => Promise<Patient[]>;
  loadDemoPatient: () => Promise<string | null>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatientState] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);
  const { success, error } = useToast();

  const setActivePatient = useCallback((patient: Patient | null) => {
    setActivePatientState(patient);
    if (patient) {
      localStorage.setItem("medguard_active_patient_id", patient.id);
    } else {
      localStorage.removeItem("medguard_active_patient_id");
    }
  }, []);

  const refreshPatients = useCallback(async (): Promise<Patient[]> => {
    try {
      const data = await apiClient.listPatients();
      setPatients(data);
      if (data.length > 0) {
        const savedId = localStorage.getItem("medguard_active_patient_id");
        const found = data.find((p) => p.id === savedId) || data[0];
        setActivePatientState(found);
      } else {
        setActivePatientState(null);
      }
      return data;
    } catch (err: any) {
      console.error("Failed to load patients", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectPatientById = useCallback(
    (id: string) => {
      const p = patients.find((item) => item.id === id);
      if (p) {
        setActivePatient(p);
      }
    },
    [patients, setActivePatient]
  );

  const loadDemo = useCallback(async (): Promise<string | null> => {
    setIsDemoLoading(true);
    try {
      const res = await apiClient.loadDemoPatient();
      success("Demo Patient Initialized", "Synthetic clinical records loaded with interaction & duplicate rules.");
      const updatedList = await apiClient.listPatients();
      setPatients(updatedList);
      const demo = updatedList.find((p) => p.id === res.id) || updatedList[0];
      if (demo) {
        setActivePatient(demo);
      }
      return res.id;
    } catch (err: any) {
      error("Failed to load demo patient", err?.response?.data?.detail || err.message);
      return null;
    } finally {
      setIsDemoLoading(false);
    }
  }, [success, error, setActivePatient]);

  useEffect(() => {
    let isMounted = true;
    refreshPatients().then((list) => {
      if (isMounted && list.length === 0) {
        loadDemo();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [refreshPatients, loadDemo]);

  return (
    <PatientContext.Provider
      value={{
        patients,
        activePatient,
        isLoading,
        isDemoLoading,
        setActivePatient,
        selectPatientById,
        refreshPatients,
        loadDemoPatient: loadDemo,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatient must be used within a PatientProvider");
  }
  return context;
}
