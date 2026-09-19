import React from "react";
import { Database, Sliders, CheckCircle, Award } from "lucide-react";

export default function TrustStats() {
  const stats = [
    {
      value: "545",
      label: "Properties in Dataset",
      subtext: "Verified records in Housing.csv",
    },
    {
      value: "12",
      label: "Input Features",
      subtext: "Spatial & structural predictors",
    },
    {
      value: "436",
      label: "Training Samples",
      subtext: "80% partition for model fitting",
    },
    {
      value: "109",
      label: "Held-Out Test Samples",
      subtext: "20% partition for evaluation",
    },
    {
      value: "Gradient Boosting",
      label: "Model Architecture",
      subtext: "Scikit-Learn ensemble pipeline",
    },
  ];

  return (
    <section className="bg-[#F7F7F5] py-24 sm:py-32 px-6 sm:px-8 lg:px-12 border-b border-[#EAEAEA]">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span
            className="text-xs uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            Dataset Transparency
          </span>
          <h2
            className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            Built on Verifiable Real Estate Data
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="text-center sm:text-left space-y-2 border-l-0 sm:border-l sm:border-[#E5E5E2] sm:pl-6 first:border-l-0 first:pl-0"
            >
              <div
                className="font-serif text-3xl sm:text-4xl font-normal text-[#111111]"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-sans font-medium text-[#111111] tracking-wide">
                {stat.label}
              </div>
              <div className="text-[11px] font-sans text-[#8A8A86]">
                {stat.subtext}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
