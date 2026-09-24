"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Cpu,
  BarChart3,
  Sliders,
  Activity,
  Database,
  Terminal,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  PieChart,
  Table,
  ShieldCheck,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KpiGrid from "@/components/dashboard/KpiGrid";
import OverviewTab from "@/components/dashboard/OverviewTab";
import ComparisonTab from "@/components/dashboard/ComparisonTab";
import FeatureImportanceTab from "@/components/dashboard/FeatureImportanceTab";
import ResidualsTab from "@/components/dashboard/ResidualsTab";
import DistributionsTab from "@/components/dashboard/DistributionsTab";
import WhatIfSimulatorTab from "@/components/dashboard/WhatIfSimulatorTab";
import DatasetExplorerTab from "@/components/dashboard/DatasetExplorerTab";
import DatasetDriftTab from "@/components/dashboard/DatasetDriftTab";
import SystemHealthTab from "@/components/dashboard/SystemHealthTab";
import { fetchMLAnalytics } from "@/services/analyticsService";
import { MLAnalyticsData } from "@/types/property";

type DashboardTab =
  | "overview"
  | "comparison"
  | "features"
  | "residuals"
  | "distributions"
  | "simulator"
  | "explorer"
  | "drift"
  | "health";

export default function MLDashboardPage() {
  const [data, setData] = useState<MLAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const analytics = await fetchMLAnalytics();
      setData(analytics);
    } catch (err) {
      console.error("Failed to load ML Analytics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { id: "overview", label: "Model Overview", icon: Cpu },
    { id: "comparison", label: "Model Comparison", icon: BarChart3 },
    { id: "features", label: "Feature Importance", icon: Layers },
    { id: "residuals", label: "Residuals & Scatter", icon: Activity },
    { id: "distributions", label: "Distributions & Location", icon: PieChart },
    { id: "simulator", label: "What-If Simulator", icon: Sliders },
    { id: "explorer", label: "Dataset Explorer", icon: Table },
    { id: "drift", label: "Data Quality & Drift", icon: Database },
    { id: "health", label: "System Telemetry", icon: Terminal },
  ];

  if (loading || !data) {
    return (
      <div className="bg-white min-h-screen pt-36 pb-24 px-6 sm:px-8 lg:px-12 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-10 h-10 border-2 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-xl text-[#111111]">Loading ML Analytics Telemetry...</p>
          <p className="text-xs text-[#8A8A86] font-mono">
            Evaluating Kaggle Housing.csv benchmarks and gradient boosting metrics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-28 sm:pt-32 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* 1. Header & Live Telemetry Bar */}
        <DashboardHeader
          data={data}
          currency={currency}
          onCurrencyChange={setCurrency}
          onRefresh={() => loadData(true)}
          isRefreshing={refreshing}
        />

        {/* 2. Top Summary KPI Cards */}
        <KpiGrid kpis={data.kpis} currency={currency} />

        {/* 3. Tab Navigation Bar */}
        <div className="border-b border-[#EAEAEA] overflow-x-auto">
          <nav className="flex items-center gap-1 sm:gap-2 min-w-max pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-sans font-medium rounded-t-xl transition-all border-b-2 -mb-[2px] ${
                    isActive
                      ? "border-[#111111] text-[#111111] bg-[#FAFAFA] font-semibold"
                      : "border-transparent text-[#6B6B6B] hover:text-[#111111] hover:bg-[#FAFAFA]/50"
                  }`}
                  style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#111111]" : "text-[#8A8A86]"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 4. Active Tab Content Section */}
        <div className="pt-2 animate-fadeIn">
          {activeTab === "overview" && (
            <OverviewTab data={data} currency={currency} />
          )}

          {activeTab === "comparison" && (
            <ComparisonTab benchmarks={data.model_comparison} currency={currency} />
          )}

          {activeTab === "features" && (
            <FeatureImportanceTab
              sortedImportance={data.feature_importance.sorted}
              rawImportance={data.feature_importance.raw}
              correlations={data.correlations}
            />
          )}

          {activeTab === "residuals" && (
            <ResidualsTab
              distribution={data.residual_analysis.distribution}
              actualVsPredicted={data.residual_analysis.actual_vs_predicted}
              toleranceBands={data.residual_analysis.tolerance_bands}
              errorDiagnostics={data.residual_analysis.error_diagnostics}
              currency={currency}
            />
          )}

          {activeTab === "distributions" && (
            <DistributionsTab
              insights={data.dataset_insights}
              kpis={data.kpis}
              currency={currency}
            />
          )}

          {activeTab === "simulator" && (
            <WhatIfSimulatorTab currency={currency} />
          )}

          {activeTab === "explorer" && (
            <DatasetExplorerTab
              currency={currency}
              initialRecords={data.dataset_records}
            />
          )}

          {activeTab === "drift" && (
            <DatasetDriftTab data={data} />
          )}

          {activeTab === "health" && (
            <SystemHealthTab data={data} />
          )}
        </div>

        {/* 5. Bottom Navigation / Valuation Studio CTA */}
        <div className="p-8 sm:p-12 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[28px] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3
              className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
              style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
            >
              Ready to Run Full Property Valuations?
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] font-light">
              Experience the client-facing HMX Valuation Studio with instant report generation and market comparables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/insights"
              className="px-5 py-3 rounded-full border border-[#EAEAEA] text-xs font-mono font-medium text-[#111111] hover:bg-white transition-colors"
            >
              Market Insights →
            </Link>
            <Link
              href="/predict"
              className="px-6 py-3 rounded-full bg-[#111111] text-white text-xs font-mono font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              <span>Launch Valuation Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
