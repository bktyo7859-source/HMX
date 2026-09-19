"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface PredictionLoadingProps {
  onComplete?: () => void;
}

export default function PredictionLoading({ onComplete }: PredictionLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const stages = [
    { text: "Analyzing property...", duration: 800 },
    { text: "Evaluating characteristics...", duration: 900 },
    { text: "Comparing housing signals...", duration: 900 },
    { text: "Generating estimate...", duration: 800 },
  ];

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (currentStep < stages.length - 1) {
      timeout = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, stages[currentStep].duration);
    } else if (onComplete) {
      timeout = setTimeout(() => {
        onComplete();
      }, stages[currentStep].duration);
    }

    return () => clearTimeout(timeout);
  }, [currentStep, onComplete]);

  const progressPercentage = ((currentStep + 1) / stages.length) * 100;

  return (
    <div className="min-h-[520px] flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-w-2xl mx-auto space-y-10 animate-fadeIn">
      {/* Subtle pulsing brand badge */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#F7F7F5] border border-[#E7E7E5] flex items-center justify-center text-[#111111] shadow-sm animate-pulseSubtle">
          <Sparkles className="w-8 h-8 text-[#C5A880] animate-spin-slow" />
        </div>
        <div className="absolute -inset-1 rounded-full border border-[#C5A880]/30 animate-ping opacity-30" />
      </div>

      {/* Dynamic Status Text */}
      <div className="space-y-3 min-h-[80px]">
        <span
          className="text-xs uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
          style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
        >
          Gradient Boosting Regressor • Stage {currentStep + 1} of {stages.length}
        </span>
        <h3
          className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] transition-all duration-300"
          style={{
            fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
          }}
        >
          {stages[currentStep].text}
        </h3>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md space-y-2">
        <div className="w-full h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#111111] transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-[#8A8A86] font-mono">
          <span>Processing parameters</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Sequential Step List */}
      <div className="w-full max-w-md space-y-2.5 pt-4 text-left border-t border-[#F2F2F0]">
        {stages.map((stage, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                isDone
                  ? "text-[#111111] opacity-100"
                  : isCurrent
                  ? "text-[#111111] font-medium opacity-100"
                  : "text-[#A3A3A0] opacity-40"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              ) : isCurrent ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#111111] border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-[#D4D4D0] flex-shrink-0" />
              )}
              <span>{stage.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
