import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function IntroSection() {
  return (
    <section
      id="intro-section"
      className="relative bg-white py-28 sm:py-36 px-6 sm:px-8 lg:px-12 border-b border-[#EAEAEA]"
    >
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Editorial Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F7F5] border border-[#E7E7E5] text-[#111111]">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
          <span
            className="text-[11px] uppercase tracking-[0.24em] font-medium"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            AI PROPERTY VALUATION
          </span>
        </div>

        {/* Primary Editorial Heading */}
        <h2
          className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-[#111111] tracking-tight leading-[1.15]"
          style={{
            fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
          }}
        >
          Know the value behind every space.
        </h2>

        {/* Supporting Copy */}
        <p className="text-base sm:text-lg md:text-xl text-[#6B6B6B] font-sans font-light max-w-2xl mx-auto leading-relaxed">
          HMX uses machine learning trained on authentic housing data to estimate property value and provide transparent valuation insights.
        </p>

        {/* CTA Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/predict"
            className="luxury-button-primary group text-xs uppercase tracking-widest px-8 py-4"
          >
            <span>Start a Valuation</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/properties"
            className="luxury-button-secondary text-xs uppercase tracking-widest px-8 py-4"
          >
            <span>Explore Demo Properties</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
