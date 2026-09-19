"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  Check,
  Building,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { PredictionResult as PredictionResultType } from "@/types/property";
import { formatCurrency, formatCompactPrice } from "@/lib/utils";
import PriceRange from "@/components/predict/PriceRange";
import FeatureImpact from "@/components/predict/FeatureImpact";
import MarketComparison from "@/components/predict/MarketComparison";
import PriceTrend from "@/components/predict/PriceTrend";
import ValuationReportPdf from "@/components/predict/ValuationReportPdf";

interface PredictionResultProps {
  result: PredictionResultType;
  onReset?: () => void;
}

export default function PredictionResult({
  result,
  onReset,
}: PredictionResultProps) {
  const [copied, setCopied] = useState(false);
  const currency = result.currency;
  const input = result.input_summary;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `HMX Valuation: ${input.area_sqft} sq ft Property`,
        text: `AI Estimated Valuation: ${formatCurrency(result.predicted_price, currency)} for ${input.area_sqft} sq ft (${input.bedrooms} Beds, ${input.bathrooms} Baths)`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Top Header / Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAEAEA]">
        <div className="flex items-center gap-3">
          {onReset ? (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Predict Another Property</span>
            </button>
          ) : (
            <Link
              href="/predict"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>New Valuation</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Model Mode Badge */}
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium border flex items-center gap-1.5 ${
              result.is_demo_model
                ? "bg-[#F7F7F5] border-[#E5E5E0] text-[#6B6B6B]"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{result.is_demo_model ? "DEMO MODEL ENGINE" : "LIVE GRADIENT BOOSTING ML"}</span>
          </span>

          <span className="text-xs text-[#8A8A86] font-mono hidden md:inline">
            {result.prediction_timestamp}
          </span>
        </div>
      </div>

      {/* Main Hero Result Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-8 sm:p-12 lg:p-16 shadow-[0_4px_30px_rgba(0,0,0,0.03)] relative overflow-hidden space-y-8">
        {/* Subtle Luxury Corner Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#F5EFE6]/40 via-transparent to-transparent pointer-events-none" />

        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C5A880]" />
            <span
              className="text-xs uppercase tracking-[0.24em] font-medium text-[#6B6B6B]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              PROPERTY VALUATION
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-6">
            <h1
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium text-[#111111] tracking-tight leading-none"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {formatCurrency(result.predicted_price, currency)}
            </h1>

            <div className="sm:border-l sm:border-[#E5E5E2] sm:pl-6 space-y-1">
              <span className="text-xs text-[#8A8A86] block font-sans">
                Price per sq ft
              </span>
              <span className="text-xl sm:text-2xl font-serif font-normal text-[#111111]">
                {currency === "INR"
                  ? `₹${result.price_per_sqft.toLocaleString()}`
                  : `$${result.price_per_sqft.toLocaleString()}`}
                <span className="text-xs text-[#6B6B6B] font-sans"> / sq ft</span>
              </span>
            </div>
          </div>

          <p className="text-sm text-[#6B6B6B] font-sans font-light pt-2">
            Estimated valuation for a <span className="text-[#111111] font-medium">{Number(input.area_sqft).toLocaleString()} sq ft</span> property with <span className="text-[#111111] font-medium">{input.bedrooms} Beds, {input.bathrooms} Baths, {input.stories || input.floors || 1} Stories</span>.
          </p>
        </div>

        {/* Action Bar */}
        <div className="pt-6 border-t border-[#F2F2F0] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* View on Maps */}
            <a
              href={result.location_data.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="luxury-button-secondary text-xs uppercase tracking-wider px-5 py-3.5 group"
            >
              <span>View Location on Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#6B6B6B] group-hover:text-[#111111] transition-colors" />
            </a>

            {/* Download PDF Valuation Report */}
            <ValuationReportPdf result={result} />

            {/* Share */}
            <button
              onClick={handleShare}
              className="luxury-button-secondary text-xs uppercase tracking-wider px-5 py-3.5 group"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                  <span>Share Estimate</span>
                </>
              )}
            </button>
          </div>

          <div className="text-xs font-sans text-[#8A8A86]">
            Algorithm: <span className="font-mono text-[#111111]">{result.model_name}</span>
          </div>
        </div>
      </div>

      {/* Property Summary Specs Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-[20px] p-6 sm:p-8 space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <span
          className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86] block"
          style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
        >
          Evaluated Property Profile (Housing.csv Features)
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-sans">
          <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#EAEAEA] space-y-1">
            <span className="text-[#8A8A86] block text-[10px] uppercase tracking-wider">
              Living Area
            </span>
            <span className="font-medium text-[#111111] block">
              {Number(input.area_sqft).toLocaleString()} sq ft
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#EAEAEA] space-y-1">
            <span className="text-[#8A8A86] block text-[10px] uppercase tracking-wider">
              Rooms Layout
            </span>
            <span className="font-medium text-[#111111] block">
              {input.bedrooms} Beds • {input.bathrooms} Baths
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#EAEAEA] space-y-1">
            <span className="text-[#8A8A86] block text-[10px] uppercase tracking-wider">
              Floors & Parking
            </span>
            <span className="font-medium text-[#111111] block">
              {input.stories || input.floors || 1} Stories • {input.parking} P
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#EAEAEA] space-y-1">
            <span className="text-[#8A8A86] block text-[10px] uppercase tracking-wider">
              Road & Sector
            </span>
            <span className="font-medium text-[#111111] block">
              {input.mainroad ? "Main Road" : "Side Road"} • {input.prefarea ? "Prime" : "Standard"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#EAEAEA] space-y-1">
            <span className="text-[#8A8A86] block text-[10px] uppercase tracking-wider">
              Climate & Base
            </span>
            <span className="font-medium text-[#111111] block">
              {input.airconditioning ? "AC Fitted" : "No AC"} • {input.basement ? "Basement" : "No Base"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#EAEAEA] space-y-1">
            <span className="text-[#8A8A86] block text-[10px] uppercase tracking-wider">
              Furnishing
            </span>
            <span className="font-medium text-[#111111] block capitalize">
              {input.furnishingstatus || input.furnishing}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Range Indicator & Feature Impacts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PriceRange
          predictedPrice={result.predicted_price}
          lowerRange={result.lower_range}
          upperRange={result.upper_range}
          currency={currency}
          reliability={result.reliability}
        />

        <FeatureImpact impacts={result.feature_impacts} />
      </div>

      {/* Market Comparison & Price Trend Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MarketComparison
          comparisonPoints={result.market_comparison.comparison_points}
          currency={currency}
          isDemo={result.is_demo_model}
        />

        {result.price_trend && (
          <PriceTrend
            trendData={result.price_trend}
            currency={currency}
            city={result.location_data.city}
          />
        )}
      </div>

      {/* Bottom Floating CTA / Predict Another */}
      <div className="pt-8 text-center space-y-4">
        {onReset && (
          <button
            onClick={onReset}
            className="luxury-button-primary text-sm uppercase tracking-wider px-9 py-4"
          >
            <span>Predict Another Property Value</span>
          </button>
        )}
      </div>
    </div>
  );
}
