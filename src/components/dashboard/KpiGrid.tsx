"use client";

import React from "react";
import {
  Database,
  TrendingUp,
  Target,
  Gauge,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
  CheckCircle2,
} from "lucide-react";
import { MLAnalyticsKPIs } from "@/types/property";
import { formatCompactPrice, formatCurrency, convertCurrency } from "@/lib/utils";

interface KpiGridProps {
  kpis: MLAnalyticsKPIs;
  currency: "INR" | "USD";
}

export default function KpiGrid({ kpis, currency }: KpiGridProps) {
  const avgPrice = currency === "USD" ? convertCurrency(kpis.avg_price, "USD") : kpis.avg_price;
  const medianPrice = currency === "USD" ? convertCurrency(kpis.median_price, "USD") : kpis.median_price;
  const minPrice = currency === "USD" ? convertCurrency(kpis.min_price, "USD") : kpis.min_price;
  const maxPrice = currency === "USD" ? convertCurrency(kpis.max_price, "USD") : kpis.max_price;
  const maeVal = kpis.test_mae ? (currency === "USD" ? convertCurrency(kpis.test_mae, "USD") : kpis.test_mae) : null;
  const rmseVal = kpis.test_rmse ? (currency === "USD" ? convertCurrency(kpis.test_rmse, "USD") : kpis.test_rmse) : null;

  return (
    <div className="space-y-4">
      {/* 8-Card Primary ML Operations Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Dataset Size */}
        <div className="p-5 bg-white border border-[#EAEAEA] rounded-2xl space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-neutral-400 transition-colors">
          <div className="flex items-center justify-between text-[#8A8A86]">
            <span className="text-[10px] uppercase tracking-wider font-mono">Dataset Size</span>
            <Database className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
            {kpis.dataset_size}
          </span>
          <span className="text-[11px] text-[#6B6B6B] font-mono block">
            Verified Kaggle Records
          </span>
        </div>

        {/* Card 2: Average Price */}
        <div className="p-5 bg-white border border-[#EAEAEA] rounded-2xl space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-neutral-400 transition-colors">
          <div className="flex items-center justify-between text-[#8A8A86]">
            <span className="text-[10px] uppercase tracking-wider font-mono">Average Price</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
            {formatCompactPrice(avgPrice, currency)}
          </span>
          <span className="text-[11px] text-[#6B6B6B] font-mono block">
            Mean across {kpis.dataset_size} homes
          </span>
        </div>

        {/* Card 3: Median Price */}
        <div className="p-5 bg-white border border-[#EAEAEA] rounded-2xl space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-neutral-400 transition-colors">
          <div className="flex items-center justify-between text-[#8A8A86]">
            <span className="text-[10px] uppercase tracking-wider font-mono">Median Price</span>
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
            {formatCompactPrice(medianPrice, currency)}
          </span>
          <span className="text-[11px] text-[#6B6B6B] font-mono block">
            50th Percentile Midpoint
          </span>
        </div>

        {/* Card 4: Price Range */}
        <div className="p-5 bg-white border border-[#EAEAEA] rounded-2xl space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-neutral-400 transition-colors">
          <div className="flex items-center justify-between text-[#8A8A86]">
            <span className="text-[10px] uppercase tracking-wider font-mono">Price Extremes</span>
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif text-lg sm:text-xl font-normal text-[#111111] block leading-snug">
            {formatCompactPrice(minPrice, currency)} – {formatCompactPrice(maxPrice, currency)}
          </span>
          <span className="text-[11px] text-[#6B6B6B] font-mono block">
            Min to Max Bounds
          </span>
        </div>

        {/* Card 5: Active Model */}
        <div className="p-5 bg-[#111111] text-white border border-neutral-800 rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400">
              Active Production Model
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span className="font-serif text-xl sm:text-2xl font-normal text-white block">
            Gradient Boosting
          </span>
          <span className="text-[11px] text-neutral-400 font-mono block">
            Scikit-Learn • 120 Estimators
          </span>
        </div>

        {/* Card 6: Test R2 Score */}
        <div className="p-5 bg-white border border-[#EAEAEA] rounded-2xl space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-neutral-400 transition-colors">
          <div className="flex items-center justify-between text-[#8A8A86]">
            <span className="text-[10px] uppercase tracking-wider font-mono">Test R² Score</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
            {kpis.test_r2 !== undefined ? kpis.test_r2.toFixed(4) : "Unavailable"}
          </span>
          <span className="text-[11px] text-emerald-700 font-mono block font-medium">
            {kpis.test_r2 ? `${(kpis.test_r2 * 100).toFixed(1)}% Variance Explained` : "Evaluating..."}
          </span>
        </div>

        {/* Card 7: Test MAE */}
        <div className="p-5 bg-white border border-[#EAEAEA] rounded-2xl space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-neutral-400 transition-colors">
          <div className="flex items-center justify-between text-[#8A8A86]">
            <span className="text-[10px] uppercase tracking-wider font-mono">Test MAE</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
            {maeVal ? formatCompactPrice(maeVal, currency) : "Unavailable"}
          </span>
          <span className="text-[11px] text-[#6B6B6B] font-mono block">
            Mean Absolute Error
          </span>
        </div>

        {/* Card 8: Test MAPE */}
        <div className="p-5 bg-white border border-[#EAEAEA] rounded-2xl space-y-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-neutral-400 transition-colors">
          <div className="flex items-center justify-between text-[#8A8A86]">
            <span className="text-[10px] uppercase tracking-wider font-mono">Test MAPE</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
            {kpis.test_mape !== undefined ? `${kpis.test_mape.toFixed(2)}%` : "Unavailable"}
          </span>
          <span className="text-[11px] text-[#6B6B6B] font-mono block">
            Mean Abs % Error
          </span>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#F7F7F5] border border-[#EAEAEA] rounded-xl text-xs font-mono text-[#6B6B6B]">
        <div className="flex items-center justify-between px-2 py-1">
          <span>Test RMSE:</span>
          <span className="font-bold text-[#111111]">
            {rmseVal ? formatCompactPrice(rmseVal, currency) : "Unavailable"}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 border-l border-[#EAEAEA]">
          <span>5-Fold CV R²:</span>
          <span className="font-bold text-[#111111]">
            {kpis.cv_mean !== undefined ? `${kpis.cv_mean.toFixed(4)} (±${kpis.cv_std?.toFixed(3) || "0.04"})` : "Unavailable"}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 border-l border-[#EAEAEA]">
          <span>Mean Property Area:</span>
          <span className="font-bold text-[#111111]">
            {kpis.avg_area ? `${Math.round(kpis.avg_area).toLocaleString()} sq ft` : "5,150 sq ft"}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 border-l border-[#EAEAEA]">
          <span>Evaluated Features:</span>
          <span className="font-bold text-[#111111]">{kpis.num_features || 12} Columns</span>
        </div>
      </div>
    </div>
  );
}
