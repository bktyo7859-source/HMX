import React from "react";
import { Edit3, Sliders, TrendingUp, CheckCircle2 } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Enter Property Details",
      description:
        "Input living area, bedrooms, bathrooms, stories, parking, and architectural characteristics in our valuation studio.",
      icon: Edit3,
    },
    {
      number: "02",
      title: "HMX Processes the Signals",
      description:
        "Features are standardized and encoded through our Scikit-Learn preprocessing pipeline for objective signal extraction.",
      icon: Sliders,
    },
    {
      number: "03",
      title: "Gradient Boosting Estimates Value",
      description:
        "Our trained Gradient Boosting model estimates the point valuation and computes an 80% model-based prediction interval.",
      icon: TrendingUp,
    },
    {
      number: "04",
      title: "Receive Your Valuation",
      description:
        "Review your property valuation, examine relative model feature importance, compare dataset benchmarks, and export a luxury PDF report.",
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="bg-white py-28 sm:py-36 px-6 sm:px-8 lg:px-12 border-b border-[#EAEAEA]">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span
            className="text-xs uppercase tracking-[0.24em] font-medium text-[#6B6B6B]"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            Machine Learning Pipeline
          </span>
          <h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            How HMX Works
          </h2>
          <p className="text-base text-[#6B6B6B] font-sans font-light">
            A transparent four-stage valuation architecture powered by Gradient Boosting Regression trained on authentic housing data.
          </p>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="group relative bg-[#F7F7F5] border border-[#EAEAEA] rounded-[20px] p-8 transition-all duration-300 hover:bg-white hover:shadow-[0_16px_36px_-4px_rgba(17,17,17,0.06)] hover:-translate-y-1 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-6">
                  {/* Step Number & Icon */}
                  <div className="flex items-center justify-between">
                    <span
                      className="font-serif text-3xl font-medium text-[#C5A880]"
                      style={{
                        fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                      }}
                    >
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center text-[#111111] group-hover:border-[#C5A880] transition-colors">
                      <Icon className="w-4 h-4 text-[#111111] group-hover:text-[#C5A880] transition-colors" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3
                      className="font-serif text-xl font-normal text-[#111111] group-hover:text-[#C5A880] transition-colors"
                      style={{
                        fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6B6B6B] font-sans font-light leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="h-0.5 w-full bg-[#EAEAEA] group-hover:bg-[#C5A880] transition-colors" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
