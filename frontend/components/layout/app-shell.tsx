"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ThemeProvider } from "../../lib/context/theme-context";
import { ToastProvider } from "../../lib/context/toast-context";
import { PatientProvider } from "../../lib/context/patient-context";
import { MEDICAL_DISCLAIMER } from "../../lib/utils";
import { ShieldCheck, Info } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <PatientProvider>
            <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
              {/* Desktop Sidebar */}
              <div className="hidden md:flex md:flex-col shrink-0 h-full">
                <Sidebar />
              </div>

              {/* Mobile Sidebar Overlay */}
              {mobileOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                  <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileOpen(false)}
                  />
                  <div className="relative z-50 flex flex-col w-72 max-w-full h-full bg-white dark:bg-slate-950 shadow-2xl animate-slide-in">
                    <Sidebar onCloseMobile={() => setMobileOpen(false)} />
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
                <Header onOpenMobile={() => setMobileOpen(true)} />

                <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                  {children}

                  {/* Medical Disclaimer Banner */}
                  <footer className="pt-8 pb-4 text-center border-t border-slate-200/80 dark:border-slate-800/80 mt-12">
                    <div className="inline-flex items-start gap-2 max-w-3xl px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 text-left leading-relaxed">
                      <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <span>{MEDICAL_DISCLAIMER}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-3 font-medium">
                      MedGuard AI • Clinical Cross-Checker • Next.js 15 & FastAPI
                    </p>
                  </footer>
                </main>
              </div>
            </div>
          </PatientProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
