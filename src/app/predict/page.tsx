"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import PredictionForm from "@/components/predict/PredictionForm";
import PredictionLoading from "@/components/predict/PredictionLoading";
import PredictionResult from "@/components/predict/PredictionResult";
import { PredictionInput, PredictionResult as PredictionResultType } from "@/types/property";
import { predictProperty } from "@/services/predictionService";
import { Sparkles, ShieldCheck } from "lucide-react";

export default function PredictPage() {
  const [loadingState, setLoadingState] = useState(false);
  const [result, setResult] = useState<PredictionResultType | null>(null);
  const [pendingResult, setPendingResult] = useState<PredictionResultType | null>(null);

  const handleSubmit = async (data: PredictionInput) => {
    setLoadingState(true);
    setResult(null);

    // Trigger API prediction in background while cinematic loading animation runs
    const predictionPromise = predictProperty(data);

    try {
      const response = await predictionPromise;
      setPendingResult(response);
    } catch (err) {
      console.error("Prediction error:", err);
    }
  };

  const handleLoadingComplete = () => {
    if (pendingResult) {
      setResult(pendingResult);
      setLoadingState(false);
      setPendingResult(null);

      // Trigger subtle celebration confetti
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#C5A880", "#111111", "#EAEAEA"],
        });
      } catch (e) {}

      // Smooth scroll to top of result
      window.scrollTo({ top: 100, behavior: "smooth" });
    } else {
      // If API took slightly longer, keep waiting brief interval
      setTimeout(() => {
        if (pendingResult) {
          setResult(pendingResult);
          setLoadingState(false);
          setPendingResult(null);
        }
      }, 500);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPendingResult(null);
    setLoadingState(false);
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  return (
    <div className="bg-white min-h-screen pt-32 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Page Header (Hidden when showing results for cleaner focus) */}
        {!result && !loadingState && (
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F7F5] border border-[#EAEAEA] text-[#111111]">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <span
                className="text-[11px] uppercase tracking-[0.24em] font-medium"
                style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
              >
                AI Property Valuation Studio
              </span>
            </div>

            <h1
              className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-[#111111] leading-tight"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              PROPERTY VALUATION STUDIO
            </h1>

            <p className="text-base text-[#6B6B6B] font-sans font-light max-w-xl mx-auto">
              Estimate the value of a property using the HMX machine learning
              engine trained on authentic Housing.csv data.
            </p>
          </div>
        )}

        {/* State 1: Input Form Wizard */}
        {!loadingState && !result && (
          <PredictionForm onSubmit={handleSubmit} isSubmitting={loadingState} />
        )}

        {/* State 2: Cinematic 4-Stage Loading Experience */}
        {loadingState && (
          <div className="py-12">
            <PredictionLoading onComplete={handleLoadingComplete} />
          </div>
        )}

        {/* State 3: Valuation Result Dashboard */}
        {result && (
          <PredictionResult result={result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
