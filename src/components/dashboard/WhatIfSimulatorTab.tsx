"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { predictProperty } from "@/services/predictionService";
import { PredictionInput, PredictionResult } from "@/types/property";
import { formatCurrency, formatCompactPrice } from "@/lib/utils";

interface WhatIfSimulatorTabProps {
  currency: "INR" | "USD";
}

export default function WhatIfSimulatorTab({ currency }: WhatIfSimulatorTabProps) {
  const [inputs, setInputs] = useState<PredictionInput>({
    area_sqft: 4500,
    bedrooms: 3,
    bathrooms: 2,
    stories: 2,
    parking: 1,
    mainroad: true,
    guestroom: false,
    basement: false,
    hotwaterheating: false,
    airconditioning: true,
    prefarea: true,
    furnishingstatus: "semi-furnished",
    currency: currency,
  });

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runPrediction = useCallback(async (currentInputs: PredictionInput) => {
    setLoading(true);
    try {
      const res = await predictProperty({
        ...currentInputs,
        currency,
      });
      setResult(res);
    } catch (e) {
      console.error("Simulation prediction failed", e);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  // Initial and currency change run
  useEffect(() => {
    runPrediction(inputs);
  }, [currency, runPrediction]);

  const handleChange = (field: keyof PredictionInput, value: any) => {
    const updated = { ...inputs, [field]: value };
    setInputs(updated);
    runPrediction(updated);
  };

  return (
    <div className="space-y-8">
      {/* Header Description */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
            Interactive Scenario Sandbox
          </span>
          <h2
            className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
            style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
          >
            What-If Model Simulator & Explainability Inspector
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6B6B] font-light leading-relaxed">
            Adjust spatial and structural features to observe real-time inference executed by the production Gradient Boosting valuation pipeline.
            All estimates compute 80% model-based quantile prediction ranges (10th to 90th percentile bounds).
          </p>
        </div>
      </div>

      {/* 2-Column Simulator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-[#111111]">
              Property Parameters
            </span>
            <span className="text-[11px] text-[#8A8A86] font-mono">
              Live Pipeline Input
            </span>
          </div>

          {/* Sliders */}
          <div className="space-y-5">
            {/* Area Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#111111] font-medium">Living Area:</span>
                <span className="font-bold text-[#111111]">{inputs.area_sqft.toLocaleString()} sq ft</span>
              </div>
              <input
                type="range"
                min={1200}
                max={12000}
                step={100}
                value={inputs.area_sqft}
                onChange={(e) => handleChange("area_sqft", Number(e.target.value))}
                className="w-full h-2 bg-[#EAEAEA] rounded-lg appearance-none cursor-pointer accent-[#111111]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8A86]">
                <span>1,200 sq ft</span>
                <span>Dataset Avg: 5,150 sq ft</span>
                <span>12,000 sq ft</span>
              </div>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-[#111111] block">
                  Bedrooms: {inputs.bedrooms}
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={inputs.bedrooms}
                  onChange={(e) => handleChange("bedrooms", Number(e.target.value))}
                  className="w-full h-2 bg-[#EAEAEA] rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8A86]">
                  <span>1 Bed</span>
                  <span>6 Beds</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-[#111111] block">
                  Bathrooms: {inputs.bathrooms}
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={inputs.bathrooms}
                  onChange={(e) => handleChange("bathrooms", Number(e.target.value))}
                  className="w-full h-2 bg-[#EAEAEA] rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8A86]">
                  <span>1 Bath</span>
                  <span>4 Baths</span>
                </div>
              </div>
            </div>

            {/* Stories & Parking */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-[#111111] block">
                  Stories: {inputs.stories}
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={inputs.stories}
                  onChange={(e) => handleChange("stories", Number(e.target.value))}
                  className="w-full h-2 bg-[#EAEAEA] rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8A86]">
                  <span>1 Story</span>
                  <span>4 Stories</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-[#111111] block">
                  Parking Spaces: {inputs.parking}
                </label>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={1}
                  value={inputs.parking}
                  onChange={(e) => handleChange("parking", Number(e.target.value))}
                  className="w-full h-2 bg-[#EAEAEA] rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8A86]">
                  <span>0 Spots</span>
                  <span>3 Spots</span>
                </div>
              </div>
            </div>

            {/* Furnishing Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-[#111111] block">
                Furnishing Grade:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["unfurnished", "semi-furnished", "furnished"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleChange("furnishingstatus", status)}
                    className={`py-2 px-3 text-xs font-mono rounded-xl border transition-all ${
                      inputs.furnishingstatus === status
                        ? "bg-[#111111] text-white border-[#111111] font-bold shadow-sm"
                        : "bg-[#FAFAFA] text-[#6B6B6B] border-[#EAEAEA] hover:border-neutral-400"
                    }`}
                  >
                    {status === "semi-furnished"
                      ? "Semi-Furnished"
                      : status === "unfurnished"
                      ? "Unfurnished"
                      : "Fully Furnished"}
                  </button>
                ))}
              </div>
            </div>

            {/* Binary Amenity Toggles */}
            <div className="space-y-2 pt-2 border-t border-[#EAEAEA]">
              <label className="text-xs font-mono font-medium text-[#111111] block">
                Amenities & Structural Attributes:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: "airconditioning", label: "Air Conditioning" },
                  { key: "prefarea", label: "Preferred Area" },
                  { key: "mainroad", label: "Main Road Access" },
                  { key: "basement", label: "Basement" },
                  { key: "guestroom", label: "Guest Room" },
                  { key: "hotwaterheating", label: "Hot Water Heating" },
                ].map((toggle) => {
                  const val = Boolean(inputs[toggle.key as keyof PredictionInput]);
                  return (
                    <button
                      key={toggle.key}
                      type="button"
                      onClick={() => handleChange(toggle.key as keyof PredictionInput, !val)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between ${
                        val
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                          : "bg-[#FAFAFA] border-[#EAEAEA] text-[#8A8A86]"
                      }`}
                    >
                      <span className="text-[11px]">{toggle.label}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          val ? "bg-emerald-500" : "bg-neutral-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Prediction Output (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111111] text-white rounded-[24px] p-6 sm:p-8 space-y-6 shadow-xl border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800 pb-3">
              <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                Live Model Valuation
              </span>
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
            </div>

            {/* Point Prediction */}
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-mono text-neutral-400 block">
                Estimated Value
              </span>
              <span className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-white block">
                {result ? formatCurrency(result.predicted_price, currency) : "Computing..."}
              </span>
              <span className="text-xs text-neutral-400 font-mono block pt-1">
                {result ? `${formatCompactPrice(result.price_per_sqft, currency)} / sq ft` : "—"}
              </span>
            </div>

            {/* 80% Quantile Prediction Range */}
            <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-300">Estimated 80% Prediction Range:</span>
                <span className="text-emerald-400 font-bold">10th – 90th %ile</span>
              </div>
              <p className="font-serif text-lg text-white font-medium">
                {result
                  ? `${formatCompactPrice(result.lower_range, currency)} — ${formatCompactPrice(
                      result.upper_range,
                      currency
                    )}`
                  : "—"}
              </p>
              <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
                Empirical quantile prediction bounds calculated directly by the upper and lower Quantile Gradient Boosting regressors.
              </p>
            </div>

            {/* Top Feature Drivers for this Prediction */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-400 block">
                Primary Valuation Drivers:
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                {result?.feature_impacts?.slice(0, 4).map((f) => (
                  <div key={f.feature} className="flex items-center justify-between text-neutral-300 py-1 border-b border-neutral-800/60">
                    <span className="truncate pr-2">{f.feature}</span>
                    <span className="text-emerald-400 font-bold shrink-0">+{f.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
