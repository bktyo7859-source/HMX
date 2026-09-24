"use client";

import React from "react";
import {
  Database,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sliders,
  BarChart2,
} from "lucide-react";
import { MLAnalyticsData, NumericDriftBound } from "@/types/property";

interface DatasetDriftTabProps {
  data: MLAnalyticsData;
}

export default function DatasetDriftTab({ data }: DatasetDriftTabProps) {
  const insights = data.dataset_insights;
  const summary = insights?.summary || data.kpis;
  const driftBounds = data.drift_bounds || {};

  const numFeatures = ["area", "bedrooms", "bathrooms", "stories", "parking"];

  return (
    <div className="space-y-8">
      {/* 1. Dataset Integrity & Summary Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="space-y-1 border-b border-[#EAEAEA] pb-4">
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
            Data Quality & Integrity
          </span>
          <h2
            className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
            style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
          >
            Kaggle Housing Dataset Profiling (Housing.csv)
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6B6B] font-light">
            Empirical baseline boundaries used for detecting out-of-distribution input queries and tracking feature drift.
          </p>
        </div>

        {/* Quick Integrity Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Total Rows</span>
            <span className="font-serif text-2xl font-normal text-[#111111] block">
              {summary.total_properties || 545}
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">100% Complete</span>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Missing Values</span>
            <span className="font-serif text-2xl font-normal text-emerald-700 block">
              0 Nulls
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">Zero Missing Data</span>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Feature Columns</span>
            <span className="font-serif text-2xl font-normal text-[#111111] block">
              12 Features
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">5 Num + 7 Cat</span>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Target Variable</span>
            <span className="font-serif text-2xl font-normal text-[#111111] block">
              price (INR)
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">Continuous Target</span>
          </div>
        </div>
      </div>

      {/* 2. Numerical Feature Distribution Boundaries */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="space-y-1 border-b border-[#EAEAEA] pb-4">
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
            Feature Boundaries
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#111111]">
            Numerical Distribution Statistics & In-Bounds Ranges
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-[#8A8A86] border-b border-[#EAEAEA]">
                <th className="pb-3 font-medium">Feature</th>
                <th className="pb-3 font-medium">Minimum</th>
                <th className="pb-3 font-medium">25th %ile</th>
                <th className="pb-3 font-medium">Mean (Std)</th>
                <th className="pb-3 font-medium">75th %ile</th>
                <th className="pb-3 font-medium">Maximum</th>
                <th className="pb-3 font-medium text-right">OOD Safety Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F0]">
              {numFeatures.map((feat) => {
                const b = (driftBounds[feat] as NumericDriftBound) || {
                  min: 0,
                  max: 0,
                  mean: 0,
                  std: 0,
                  p25: 0,
                  p75: 0,
                };
                return (
                  <tr key={feat} className="hover:bg-[#FAFAFA]">
                    <td className="py-3 font-bold text-[#111111] capitalize">{feat}</td>
                    <td className="py-3 text-[#6B6B6B]">{b.min}</td>
                    <td className="py-3 text-[#6B6B6B]">{b.p25}</td>
                    <td className="py-3 text-[#111111] font-medium">
                      {b.mean} (±{b.std})
                    </td>
                    <td className="py-3 text-[#6B6B6B]">{b.p75}</td>
                    <td className="py-3 text-[#6B6B6B]">{b.max}</td>
                    <td className="py-3 text-right text-emerald-700 font-bold">
                      [{b.min} — {b.max}]
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Categorical Proportions Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Furnishing Status */}
        <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A8A86] block">
            Furnishing Distribution
          </span>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#F2F2F0]">
              <span>Semi-Furnished:</span>
              <span className="font-bold text-[#111111]">227 (41.7%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F2F2F0]">
              <span>Unfurnished:</span>
              <span className="font-bold text-[#111111]">178 (32.7%)</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Furnished:</span>
              <span className="font-bold text-[#111111]">140 (25.7%)</span>
            </div>
          </div>
        </div>

        {/* Air Conditioning */}
        <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A8A86] block">
            Air Conditioning Ratio
          </span>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#F2F2F0]">
              <span>With AC:</span>
              <span className="font-bold text-emerald-700">172 (31.6%)</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Without AC:</span>
              <span className="font-bold text-[#111111]">373 (68.4%)</span>
            </div>
          </div>
        </div>

        {/* Preferred Area */}
        <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A8A86] block">
            Preferred Area Ratio
          </span>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#F2F2F0]">
              <span>Preferred Zone:</span>
              <span className="font-bold text-emerald-700">128 (23.5%)</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Standard Zone:</span>
              <span className="font-bold text-[#111111]">417 (76.5%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
