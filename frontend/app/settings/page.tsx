"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Server,
  Sparkles,
  Shield,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Database,
  Lock,
  Info,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { useToast } from "../../lib/context/toast-context";
import { apiClient } from "../../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { MEDICAL_DISCLAIMER, PRIVACY_NOTICE } from "../../lib/utils";

export default function SettingsPage() {
  const { loadDemoPatient, isDemoLoading } = usePatient();
  const { success, error, info } = useToast();

  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  );
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const data = await apiClient.getHealth();
      setHealthStatus(data);
      success("Backend Online", "FastAPI server responded successfully with status: OK.");
    } catch (err: any) {
      setHealthStatus({ status: "offline", error: err.message });
      error("Backend Offline", "Could not reach the FastAPI server at " + apiUrl);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          System Configuration & Settings
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          Manage backend endpoints, AI engine parameters, and compliance configuration
        </p>
      </div>

      {/* Backend API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-600" />
              <CardTitle className="text-base">FastAPI Backend Connection</CardTitle>
            </div>
            <Badge
              variant={healthStatus?.status === "healthy" || healthStatus?.status === "ok" ? "teal" : "warning"}
            >
              {healthStatus?.status === "healthy" || healthStatus?.status === "ok" ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <CardDescription>
            Configure the API gateway URL and test health check endpoint
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              API Base Endpoint URL
            </label>
            <div className="flex gap-2">
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={checkHealth}
                isLoading={isCheckingHealth}
                className="gap-1.5 shrink-0 text-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Test Probe</span>
              </Button>
            </div>
          </div>

          {healthStatus && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-mono space-y-1">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Server Health Payload:
              </p>
              <pre className="text-slate-600 dark:text-slate-400 overflow-x-auto text-[11px]">
                {JSON.stringify(healthStatus, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Patient Profile Loader */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600" />
            <CardTitle className="text-base">Clinical Demo Data Initializer</CardTitle>
          </div>
          <CardDescription>
            Reset or populate synthetic EHR records with pre-configured drug interactions (e.g. Ciprofloxacin + Warfarin), duplicate therapy (Metformin), and longitudinal glucose labs.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Loading the demo patient recreates the clinical evaluation scenario with 3 linked encounters (Prescription, Discharge Summary, and Blood Chemistry Lab).
          </p>

          <Button
            variant="teal"
            onClick={() => loadDemoPatient()}
            isLoading={isDemoLoading}
            className="gap-2 text-xs shadow-sm font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            <span>Re-Seed Demo Patient Profile</span>
          </Button>
        </CardContent>
      </Card>

      {/* Healthcare Compliance & HIPAA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base">Compliance & Privacy Guidelines</CardTitle>
          </div>
          <CardDescription>
            Data governance, anonymization policies, and clinical safety guardrails
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Demonstration Privacy & Data Governance Notice</span>
            </div>
            <p>{PRIVACY_NOTICE}</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Medical AI Disclaimer</span>
            </div>
            <p>{MEDICAL_DISCLAIMER}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
