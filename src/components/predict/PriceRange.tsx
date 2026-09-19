"use client";

import React from "react";
import { formatCompactPrice, formatCurrency } from "@/lib/utils";

interface PriceRangeProps {
  predictedPrice: number;
  lowerRange: number;
  upperRange: number;
  currency: "INR" | "USD";
  reliability: string;
}

export default function PriceRange({
  predictedPrice,
  lowerRange,
  upperRange,
  currency,
  reliability,
}: PriceRangeProps) {
  const totalSpread = upperRange - lowerRange;
  const currentOffset =
    totalSpread > 0
      ? Math.max(10, Math.min(90, ((predictedPrice - lowerRange) / totalSpread) * 100))
      : 50;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[20px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <span
            className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            80% MODEL-BASED PREDICTION INTERVAL
          </span>
          <h4
            className="font-serif text-xl sm:text-2xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            {formatCurrency(lowerRange, currency)} — {formatCurrency(upperRange, currency)}
          </h4>
        </div>

        <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1 rounded-full bg-[#F7F7F5] border border-[#EAEAEA] text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              reliability === "High"
                ? "bg-emerald-500"
                : reliability === "Medium"
                ? "bg-amber-500"
                : "bg-slate-400"
            }`}
          />
          <span className="text-[#111111] font-medium font-sans">
            Quantile Bound (α=0.10 – 0.90)
          </span>
        </div>
      </div>

      {/* Visual Range Indicator Bar */}
      <div className="space-y-4 pt-4 pb-2">
        <div className="relative w-full h-3 bg-[#F0F0EE] rounded-full">
          {/* Active Range Gradient */}
          <div className="absolute inset-y-0 left-0 right-0 bg-[#E5E5E0] rounded-full" />

          {/* Point Estimate Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
            style={{ left: `${currentOffset}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-[#111111] border-2 border-white shadow-md transition-transform group-hover:scale-125" />

            {/* Hover Tooltip / Label */}
            <div className="absolute -top-9 px-2.5 py-1 rounded-md bg-[#111111] text-white text-[11px] font-sans font-medium whitespace-nowrap shadow-md pointer-events-none">
              {formatCompactPrice(predictedPrice, currency)} Point Estimate
            </div>
          </div>
        </div>

        {/* Range Labels */}
        <div className="flex justify-between items-center text-xs font-sans text-[#6B6B6B]">
          <div className="space-y-0.5">
            <span className="block text-[10px] text-[#A3A3A0] uppercase tracking-wider">
              10th Percentile Bound
            </span>
            <span className="font-medium text-[#111111]">
              {formatCompactPrice(lowerRange, currency)}
            </span>
          </div>

          <div className="text-center space-y-0.5">
            <span className="block text-[10px] text-[#A3A3A0] uppercase tracking-wider">
              Model Target
            </span>
            <span className="font-semibold text-[#111111]">
              {formatCompactPrice(predictedPrice, currency)}
            </span>
          </div>

          <div className="text-right space-y-0.5">
            <span className="block text-[10px] text-[#A3A3A0] uppercase tracking-wider">
              90th Percentile Bound
            </span>
            <span className="font-medium text-[#111111]">
              {formatCompactPrice(upperRange, currency)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#8A8A86] font-light leading-relaxed border-t border-[#F2F2F0] pt-4">
        This represents an 80% model-based prediction interval generated via lower (α=0.10) and upper (α=0.90) quantile Gradient Boosting estimators trained on Housing.csv.
      </p>
    </div>
  );
}
