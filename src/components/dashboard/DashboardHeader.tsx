"use client";

import React, { useState } from "react";
import {
  Activity,
  Cpu,
  Download,
  RefreshCw,
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Server,
  Database,
  Printer,
  Clock,
} from "lucide-react";
import { MLAnalyticsData } from "@/types/property";
import { downloadJsonFile, downloadCsvFile } from "@/lib/utils";
import { HOUSING_DATASET_RECORDS } from "@/data/housingDataset";

interface DashboardHeaderProps {
  data: MLAnalyticsData;
  currency: "INR" | "USD";
  onCurrencyChange: (c: "INR" | "USD") => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function DashboardHeader({
  data,
  currency,
  onCurrencyChange,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);

  const handleExportJson = () => {
    downloadJsonFile(data, `hmx_ml_analytics_${Date.now()}.json`);
    setExportOpen(false);
  };

  const handleExportCsv = () => {
    const headers = [
      "Model",
      "Algorithm",
      "Test R2",
      "Test MAE (INR)",
      "Test RMSE (INR)",
      "Test MAPE (%)",
      "5-Fold CV Mean",
      "5-Fold CV Std",
    ];
    const rows = (data.model_comparison || []).map((m) => [
      m.model_name,
      m.algorithm,
      m.test_r2,
      m.test_mae,
      m.test_rmse,
      m.test_mape,
      m.cv_r2_mean,
      m.cv_r2_std,
    ]);
    downloadCsvFile(headers, rows, `hmx_model_benchmarks_${Date.now()}.csv`);
    setExportOpen(false);
  };

  const handleExportDatasetCsv = () => {
    const records = data.dataset_records || HOUSING_DATASET_RECORDS;
    const headers = [
      "Price (INR)",
      "Area (sqft)",
      "Bedrooms",
      "Bathrooms",
      "Stories",
      "Mainroad",
      "Guestroom",
      "Basement",
      "Hotwaterheating",
      "Airconditioning",
      "Parking",
      "Prefarea",
      "Furnishing",
      "Price Per SqFt (INR)",
    ];
    const rows = records.map((r) => [
      r.price,
      r.area,
      r.bedrooms,
      r.bathrooms,
      r.stories,
      r.mainroad,
      r.guestroom,
      r.basement,
      r.hotwaterheating,
      r.airconditioning,
      r.parking,
      r.prefarea,
      r.furnishingstatus,
      r.price_per_sqft || Math.round(r.price / r.area),
    ]);
    downloadCsvFile(headers, rows, `hmx_housing_dataset_${Date.now()}.csv`);
    setExportOpen(false);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
      setExportOpen(false);
    }
  };

  const isOnline = data.status === "online";

  return (
    <div className="space-y-6">
      {/* Top Telemetry & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#111111] text-white rounded-2xl border border-neutral-800 shadow-sm">
        {/* Telemetry Status Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="font-medium tracking-wide">
              {isOnline ? "LIVE ML TELEMETRY" : "OFFLINE BASELINE (PRECOMPUTED)"}
            </span>
          </div>
          <span className="text-neutral-600 hidden sm:inline">•</span>
          <span className="text-neutral-300 hidden sm:inline flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
            Model: {data.model_metadata.algorithm}
          </span>
          <span className="text-neutral-600 hidden md:inline">•</span>
          <span className="text-neutral-400 hidden md:inline flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            Dataset: Housing.csv (N={data.model_metadata.dataset_rows})
          </span>
          <span className="text-neutral-600 hidden lg:inline">•</span>
          <span className="text-emerald-400 hidden lg:inline flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            Inference: ~{data.system_health.inference_latency_ms}ms
          </span>
          {data.trained_at && (
            <>
              <span className="text-neutral-600 hidden xl:inline">•</span>
              <span className="text-neutral-400 hidden xl:inline flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated: {data.trained_at}
              </span>
            </>
          )}
        </div>

        {/* Currency & Actions */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Currency Toggle */}
          <div className="inline-flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
            <button
              onClick={() => onCurrencyChange("INR")}
              className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                currency === "INR"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Base Model Currency: INR"
            >
              INR (₹)
            </button>
            <button
              onClick={() => onCurrencyChange("USD")}
              className={`px-2.5 py-1 rounded-md font-mono transition-all ${
                currency === "USD"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Indicative USD Conversion (1 USD = 83.5 INR)"
            >
              USD ($)
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:border-neutral-700 text-xs rounded-lg transition-colors font-mono"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#EAEAEA] rounded-xl shadow-xl z-30 py-1.5 animate-fadeIn text-[#111111]">
                <button
                  onClick={handleExportJson}
                  className="w-full px-3.5 py-2 text-left text-xs hover:bg-[#F7F7F5] flex items-center gap-2 text-[#111111]"
                >
                  <FileJson className="w-4 h-4 text-emerald-600" />
                  <span>Export Full JSON Payload</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full px-3.5 py-2 text-left text-xs hover:bg-[#F7F7F5] flex items-center gap-2 text-[#111111]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Export Benchmark CSV</span>
                </button>
                <button
                  onClick={handleExportDatasetCsv}
                  className="w-full px-3.5 py-2 text-left text-xs hover:bg-[#F7F7F5] flex items-center gap-2 text-[#111111]"
                >
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Export Housing.csv Dataset</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full px-3.5 py-2 text-left text-xs hover:bg-[#F7F7F5] flex items-center gap-2 text-[#111111] border-t border-[#EAEAEA]"
                >
                  <Printer className="w-4 h-4 text-neutral-600" />
                  <span>Print Dashboard Report</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            title="Refresh ML Analytics Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Page Title Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-xs uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            Machine Learning Intelligence & Model Monitoring
          </span>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified Kaggle Housing.csv (N=545)
          </span>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-neutral-100 border border-neutral-200 text-neutral-800 flex items-center gap-1">
            <Server className="w-3 h-3" />
            FastAPI 2.0 • Active Engine
          </span>
        </div>

        <h1
          className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#111111] tracking-tight"
          style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
        >
          ML Analytics Dashboard
        </h1>
        <p className="text-sm sm:text-base text-[#6B6B6B] font-sans font-light max-w-4xl leading-relaxed">
          Production telemetry, empirical model benchmark comparisons, gradient boosting feature importances,
          residual diagnostics, and spatial distributions computed strictly from the authentic housing valuation pipeline.
        </p>

        {currency === "USD" && (
          <div className="text-[11px] font-mono text-[#8A8A86] bg-[#F7F7F5] border border-[#EAEAEA] p-2.5 rounded-lg max-w-xl">
            <span className="font-semibold text-[#111111]">Note:</span> Base model is trained in INR.
            USD values are computed using a fixed benchmark rate of 1 USD = 83.50 INR for international review.
          </div>
        )}
      </div>
    </div>
  );
}
