import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function PredictionCTA() {
  return (
    <section className="bg-white py-28 sm:py-36 px-6 sm:px-8 lg:px-12">
      <div className="max-w-5xl mx-auto text-center space-y-8 bg-[#F7F7F5] border border-[#EAEAEA] rounded-[24px] p-10 sm:p-16 lg:p-20 shadow-[0_4px_24px_-2px_rgba(17,17,17,0.03)]">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E7E5] text-[#111111]">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
          <span
            className="text-[11px] uppercase tracking-[0.24em] font-medium"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            AI Valuation Studio
          </span>
        </div>

        <h2
          className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#111111] max-w-2xl mx-auto leading-tight"
          style={{
            fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
          }}
        >
          Discover what your property is truly worth today.
        </h2>

        <p className="text-sm sm:text-base text-[#6B6B6B] font-sans font-light max-w-xl mx-auto leading-relaxed">
          Provide your property characteristics and let HMX evaluate your spatial signals using our verified Gradient Boosting model trained on Housing.csv.
        </p>

        <div className="pt-4">
          <Link
            href="/predict"
            className="luxury-button-primary text-xs uppercase tracking-widest px-9 py-4 group"
          >
            <span>Launch Prediction Studio</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
