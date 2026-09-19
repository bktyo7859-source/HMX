"use client";

import React from "react";
import { FeatureImpact as FeatureImpactType } from "@/types/property";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface FeatureImpactProps {
  impacts: FeatureImpactType[];
}

export default function FeatureImpact({ impacts }: FeatureImpactProps) {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[20px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
      <div className="space-y-1">
        <span
          className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]"
          style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
        >
          Relative Model Feature Importance
        </span>
        <h4
          className="font-serif text-xl sm:text-2xl font-normal text-[#111111]"
          style={{
            fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
          }}
        >
          What the model considers important
        </h4>
        <p className="text-xs sm:text-sm text-[#6B6B6B] font-sans font-light">
          Relative importance weights extracted from the trained Gradient Boosting decision trees (Housing.csv).
        </p>
      </div>

      <div className="space-y-4 pt-2">
        {impacts.map((item, idx) => {
          const isHigh = item.impact === "High Impact";
          const isMed = item.impact === "Medium Impact";

          const badgeClasses = isHigh
            ? "bg-[#111111] text-white"
            : isMed
            ? "bg-[#F0F0EE] text-[#111111]"
            : "bg-[#F7F7F5] text-[#6B6B6B]";

          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-[#F0F0EE] hover:border-[#E0E0DC] transition-colors bg-[#FAFAFA] space-y-2.5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#111111]">
                    {item.feature}
                  </span>
                  {item.direction === "positive" && (
                    <span className="text-[11px] text-emerald-600 flex items-center">
                      <ArrowUp className="w-3 h-3" />
                      Higher
                    </span>
                  )}
                  {item.direction === "negative" && (
                    <span className="text-[11px] text-rose-600 flex items-center">
                      <ArrowDown className="w-3 h-3" />
                      Lower
                    </span>
                  )}
                  {item.direction === "neutral" && (
                    <span className="text-[11px] text-slate-500 flex items-center">
                      <Minus className="w-3 h-3" />
                      Standard
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${badgeClasses}`}
                  >
                    {item.impact}
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#111111] min-w-[32px] text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#EAEAEA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#111111] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, item.percentage * 2.2)}%` }}
                />
              </div>

              <p className="text-[11px] text-[#8A8A86] font-light">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
