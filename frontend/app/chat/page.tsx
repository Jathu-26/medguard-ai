"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquareText,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RotateCcw,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { usePatient } from "../../lib/context/patient-context";
import { useToast } from "../../lib/context/toast-context";
import { apiClient } from "../../lib/api-client";
import { ChatResponse, EvidenceCitation } from "../../lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  confidenceScorePercent,
  confidenceColor,
  MEDICAL_DISCLAIMER,
} from "../../lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  citations?: EvidenceCitation[];
  confidence?: number;
  disclaimer?: string;
}

const SUGGESTED_QUERIES = [
  "Are there any duplicate antibiotics or NSAIDs prescribed?",
  "Does the patient have documented allergies to penicillin or amoxicillin?",
  "Summarize the patient's blood glucose and HbA1c trajectory.",
  "What medications were modified during the latest hospital visit?",
];

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const { activePatient } = usePatient();
  const { error } = useToast();

  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePatient) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Hello, I am MedGuard AI. I have analyzed ${activePatient.name}'s medical records. You can ask me any clinical questions regarding prescribed medications, drug-drug interactions, allergy contraindications, or longitudinal lab trends.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          confidence: 0.95,
        },
      ]);
    }
  }, [activePatient]);

  useEffect(() => {
    if (initialQuery && activePatient && messages.length === 1) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery, activePatient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    if (!activePatient) {
      error("No Active Patient", "Please select a patient before starting the clinical consultation.");
      return;
    }

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const res: ChatResponse = await apiClient.chat(activePatient.id, text);

      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: "ai",
        text: res.response || res.answer || "Clinical response generated.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: (res.citations || (Array.isArray(res.evidence) ? (res.evidence as any[]) : [])) as any[],
        confidence: res.confidence,
        disclaimer: res.disclaimer || undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: "ai",
        text: "I encountered an error connecting to the clinical reasoning engine. Please ensure the backend server is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleCitation = (msgId: string) => {
    setExpandedCitations((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleResetChat = () => {
    if (activePatient) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Conversation reset. I am ready to answer new questions regarding ${activePatient.name}'s medical records.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          confidence: 0.95,
        },
      ]);
    }
  };

  if (!activePatient) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
        <MessageSquareText className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Active Patient Selected
        </h3>
        <p className="text-xs text-slate-500">
          Select an active patient to query their medical documents with cross-document AI.
        </p>
        <Link href="/patients">
          <Button size="sm" variant="default">
            Select Patient
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 mb-3 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Ask MedGuard AI</span>
              <Badge variant="teal" className="text-[10px] py-0">
                Live Evidence Citations
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-500">
              Querying {activePatient.name}&apos;s medical records & prescriptions
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleResetChat}
          className="text-xs gap-1.5 h-8"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Chat</span>
        </Button>
      </div>

      {/* Chat Stream Box */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/40 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => {
            const isAI = msg.sender === "ai";
            const citationsOpen = !!expandedCitations[msg.id];
            const conf = msg.confidence ? confidenceScorePercent(msg.confidence) : null;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${isAI ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isAI
                      ? "bg-gradient-to-tr from-sky-600 to-teal-500 text-white"
                      : "bg-slate-800 dark:bg-slate-700 text-white"
                  }`}
                >
                  {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-2 max-w-[85%] sm:max-w-[90%]">
                  <div
                    className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                      isAI
                        ? "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        : "bg-sky-600 text-white font-medium"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Metadata & Timestamp */}
                    <div
                      className={`flex items-center justify-between gap-2 mt-2 pt-2 border-t text-[10px] ${
                        isAI
                          ? "border-slate-100 dark:border-slate-800 text-slate-400"
                          : "border-sky-500/50 text-sky-100"
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {conf && isAI && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {conf}% confidence
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Evidence Citations Dropdown */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="space-y-1.5 animate-fade-in">
                      <button
                        type="button"
                        onClick={() => toggleCitation(msg.id)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline px-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>
                          {citationsOpen
                            ? "Hide Document Citations"
                            : `View ${msg.citations.length} Verifiable Citations`}
                        </span>
                        {citationsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {citationsOpen && (
                        <div className="space-y-2 p-3 rounded-xl bg-sky-50/70 dark:bg-slate-900 border border-sky-200/60 dark:border-sky-900/60 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
                          {msg.citations.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>{c.document_name || "Document Citation"}</span>
                                <span>{c.relevance_score ? `${Math.round(c.relevance_score * 100)}% match` : ""}</span>
                              </div>
                              <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 italic">
                                &ldquo;{c.excerpt}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3 max-w-2xl mr-auto animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs flex items-center gap-2 text-slate-500 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                <span>Cross-checking records & synthesizing evidence...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Pills */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Suggestions:
          </span>
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => handleSendMessage(q)}
              className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950 dark:hover:text-sky-300 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap border border-slate-200/60 dark:border-slate-700 transition-colors shrink-0 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 md:p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask a question about prescriptions, interactions, or test results..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 text-xs md:text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-sky-500 focus:outline-none transition-colors"
          />
          <Button
            type="submit"
            variant="default"
            disabled={!inputMessage.trim() || isSending}
            isLoading={isSending}
            className="gap-1.5 shadow-sm h-10 px-4"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
          <p className="text-xs">Initializing MedGuard AI Chat...</p>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
