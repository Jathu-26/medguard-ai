"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart as LineChartIcon,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { usePatient } from "../../lib/context/patient-context";
import { apiClient } from "../../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { formatDate } from "../../lib/utils";

export default function LabTrendsPage() {
  const { activePatient } = usePatient();
  const [selectedTest, setSelectedTest] = useState<string>("");

  const { data: trends = [], isLoading } = useQuery({
    queryKey: ["lab-trends", activePatient?.id],
    queryFn: () => (activePatient ? apiClient.getLabTrends(activePatient.id) : []),
    enabled: !!activePatient,
  });

  const activeTrend =
    trends.find((t) => t.test_name === selectedTest) || (trends.length > 0 ? trends[0] : null);

  if (!activePatient) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
        <Activity className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Patient Selected
        </h3>
        <p className="text-xs text-slate-500">
          Select a patient to inspect longitudinal laboratory trends and abnormal biomarkers.
        </p>
        <Link href="/patients">
          <Button size="sm" variant="default">
            Select Patient
          </Button>
        </Link>
      </div>
    );
  }

  // Format data points for Recharts
  const chartData = (activeTrend?.points || []).map((pt) => ({
    date: formatDate(pt.test_date),
    rawDate: pt.test_date,
    value: pt.value,
    unit: pt.unit,
    status: pt.status,
    interpretation: pt.interpretation,
  }));

  const minNormal = activeTrend?.normal_range_min;
  const maxNormal = activeTrend?.normal_range_max;

  const abnormalCount = trends.filter((t) => t.status === "abnormal" || t.status === "high").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Laboratory Trends & Biomarker Tracking
            </h2>
            {abnormalCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {abnormalCount} Out-of-Range Tests
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Longitudinal lab analysis for {activePatient.name} across {trends.length} tracked biomarkers
          </p>
        </div>

        <Link href="/upload">
          <Button size="sm" variant="default" className="text-xs">
            + Upload Lab Report
          </Button>
        </Link>
      </div>

      {/* Tracked Test Selector Pills */}
      {trends.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {trends.map((t) => {
            const isSelected = (activeTrend?.test_name || trends[0].test_name) === t.test_name;
            const isAbnormal = t.status === "abnormal" || t.status === "high";

            return (
              <button
                key={t.test_name}
                type="button"
                onClick={() => setSelectedTest(t.test_name)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <span>{t.test_name}</span>
                {isAbnormal && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? "bg-white" : "bg-rose-500 animate-pulse"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Chart Card */}
      {isLoading ? (
        <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : activeTrend ? (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {activeTrend.test_name}
                  </h3>
                  <Badge
                    variant={activeTrend.status === "normal" ? "teal" : "warning"}
                    className="text-[10px]"
                  >
                    {(activeTrend.status || "TRACKED").toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Standard Unit: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeTrend.unit}</span>
                  {minNormal !== null && maxNormal !== null && (
                    <span>
                      {" "}• Reference Interval: {minNormal} - {maxNormal} {activeTrend.unit}
                    </span>
                  )}
                </p>
              </div>

              {/* Latest Value Badge */}
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Latest Finding</span>
                <span className="text-xl font-extrabold text-sky-600 dark:text-sky-400">
                  {chartData[chartData.length - 1]?.value} {activeTrend.unit}
                </span>
              </div>
            </div>

            {/* Recharts Line Visualization */}
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="labGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis
                    dataKey="date"
                    className="text-[11px] text-slate-500"
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis
                    className="text-[11px] text-slate-500"
                    tick={{ fill: "currentColor" }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-sm text-xs space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
                            <p className="text-sky-600 dark:text-sky-400 font-extrabold text-sm">
                              {item.value} {item.unit}
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              Status: <span className="font-semibold capitalize">{item.status}</span>
                            </p>
                            {item.interpretation && (
                              <p className="text-slate-600 dark:text-slate-300 text-[11px] italic">
                                {item.interpretation}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {minNormal !== null && minNormal !== undefined && (
                    <ReferenceLine
                      y={minNormal}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `Min: ${minNormal}`, fill: "#10b981", fontSize: 10 }}
                    />
                  )}
                  {maxNormal !== null && maxNormal !== undefined && (
                    <ReferenceLine
                      y={maxNormal}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      label={{ value: `Max: ${maxNormal}`, fill: "#f43f5e", fontSize: 10 }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#labGradient)"
                    dot={{ fill: "#0284c7", r: 4, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#0ea5e9" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Historical Data Table */}
          <Card className="p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Longitudinal Readings for {activeTrend.test_name}
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Measured Value</th>
                    <th className="py-2.5 px-3">Reference Range</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Clinical Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {chartData.map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {pt.date}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-slate-100">
                        {pt.value} {pt.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {minNormal !== null && maxNormal !== null
                          ? `${minNormal} - ${maxNormal} ${pt.unit}`
                          : "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            pt.status === "normal"
                              ? "teal"
                              : pt.status === "high" || pt.status === "abnormal"
                              ? "destructive"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {pt.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {pt.interpretation || "Routine check"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <Activity className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Lab Trends Recorded
          </p>
          <p className="text-xs text-slate-500">
            Upload blood work, metabolic panels, or urinalysis reports to automatically generate trend charts.
          </p>
        </div>
      )}
    </div>
  );
}
