"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FeatureImportanceEntry, CorrelationEntry } from "@/types/property";
import { Sparkles, ArrowUpDown, Info } from "lucide-react";

interface FeatureImportanceTabProps {
  sortedImportance: FeatureImportanceEntry[];
  rawImportance: Record<string, number>;
  correlations: CorrelationEntry[];
}

export default function FeatureImportanceTab({
  sortedImportance,
  rawImportance,
  correlations,
}: FeatureImportanceTabProps) {
  const [viewMode, setViewMode] = useState<"grouped" | "raw">("grouped");

  // Format raw importance for bar chart
  const rawChartData = Object.entries(rawImportance)
    .map(([feat, val]) => ({
      feature: feat.replace(/_/g, " "),
      importance_percentage: Number((val * 100).toFixed(1)),
      raw_weight: val,
    }))
    .sort((a, b) => b.importance_percentage - a.importance_percentage);

  const activeData = viewMode === "grouped" ? sortedImportance : rawChartData;

  return (
    <div className="space-y-8">
      {/* 1. Feature Importance Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAEAEA] pb-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
              Global Explainability
            </span>
            <h2
              className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
              style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
            >
              Model Feature Importance (GBDT Impurity Reduction)
            </h2>
            <p className="text-xs text-[#6B6B6B] font-light">
              Trained Gradient Boosting model weights indicating relative contribution to housing valuation predictions.
            </p>
          </div>

          {/* Toggle Button */}
          <div className="inline-flex p-0.5 bg-[#F7F7F5] border border-[#EAEAEA] rounded-lg text-xs font-mono">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "grouped"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Grouped Drivers
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "raw"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Raw Pipeline Weights
            </button>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="w-full h-96 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
            >
              <XAxis
                type="number"
                domain={[0, 50]}
                tick={{ fill: "#8A8A86", fontSize: 10, fontFamily: "DM Sans" }}
                axisLine={{ stroke: "#EAEAEA" }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="feature"
                width={160}
                tick={{ fill: "#111111", fontSize: 11, fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg text-xs space-y-1">
                        <p className="font-bold text-[#111111]">{d.feature}</p>
                        <p className="text-emerald-700 font-mono font-bold">
                          Weight: {d.importance_percentage}%
                        </p>
                        <p className="text-[#8A8A86] font-mono">
                          Raw model score: {d.raw_weight}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="importance_percentage" radius={[0, 6, 6, 0]}>
                {activeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "#111111" : (index === 1 ? "#374151" : (index <= 3 ? "#4B5563" : "#9CA3AF"))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#EAEAEA]">
          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Primary Driver</span>
            <span className="font-serif text-lg font-bold text-[#111111] block">Living Area (44.6%)</span>
            <span className="text-[11px] text-[#6B6B6B]">Dominant scaling factor in real estate pricing</span>
          </div>
          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Secondary Driver</span>
            <span className="font-serif text-lg font-bold text-[#111111] block">Bathrooms (17.8%)</span>
            <span className="text-[11px] text-[#6B6B6B]">Reflects luxury grade and plumbing infrastructure</span>
          </div>
          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Tertiary Driver</span>
            <span className="font-serif text-lg font-bold text-[#111111] block">Air Conditioning (9.3%)</span>
            <span className="text-[11px] text-[#6B6B6B]">Strongest individual amenity valuation boost</span>
          </div>
        </div>
      </div>

      {/* 2. Feature Pearson Correlation Matrix with Price */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="space-y-1 border-b border-[#EAEAEA] pb-4">
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
            Linear Association
          </span>
          <h3
            className="font-serif text-2xl font-normal text-[#111111]"
            style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
          >
            Pearson Correlation Matrix with House Price (r)
          </h3>
          <p className="text-xs text-[#6B6B6B] font-light">
            Bivariate linear correlation coefficients between each structural / spatial attribute and property sales price in Housing.csv.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {correlations.map((c) => {
            const pctWidth = Math.min(100, Math.max(10, Math.round(c.correlation * 100)));
            return (
              <div
                key={c.feature}
                className="p-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-[140px]">
                  <span className="text-xs font-medium text-[#111111] block capitalize">
                    {c.feature.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">
                    {c.strength} correlation
                  </span>
                </div>

                <div className="flex-1 space-y-1">
                  <div className="w-full h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.correlation >= 0.45
                          ? "bg-emerald-600"
                          : c.correlation >= 0.25
                          ? "bg-neutral-800"
                          : "bg-neutral-400"
                      }`}
                      style={{ width: `${pctWidth}%` }}
                    />
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-[#111111] min-w-[50px] text-right">
                  +{c.correlation.toFixed(4)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#6B6B6B] font-light leading-relaxed">
            <span className="font-semibold text-[#111111]">Interpretability Note:</span> Pearson r measures linear correlation (-1.0 to +1.0).
            The Gradient Boosting model captures both these linear dependencies and higher-order multi-feature interactions.
          </p>
        </div>
      </div>
    </div>
  );
}
