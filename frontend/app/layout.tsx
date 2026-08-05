import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AppShell } from "../components/layout/app-shell";

export const metadata: Metadata = {
  title: "MedGuard AI • Clinical Report & Prescription Cross-Checker",
  description:
    "AI-assisted healthcare safety platform for cross-checking medical documents, detecting drug interactions, identifying allergy conflicts, and tracking lab trends.",
  keywords: [
    "MedGuard AI",
    "Clinical Cross-Checker",
    "Drug Interactions",
    "Allergy Conflict",
    "Medical OCR",
    "Lab Trends",
    "Healthcare AI",
  ],
  authors: [{ name: "MedGuard AI Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0284c7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
