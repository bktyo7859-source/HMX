"use client";

import React, { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PredictionResult } from "@/types/property";
import { formatCurrency, formatCompactPrice } from "@/lib/utils";

interface ValuationReportPdfProps {
  result: PredictionResult;
}

export default function ValuationReportPdf({ result }: ValuationReportPdfProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const generatePdf = async () => {
    try {
      setIsGenerating(true);

      const reportElement = document.getElementById("hmx-pdf-report-content");
      if (!reportElement) {
        window.print();
        setIsGenerating(false);
        return;
      }

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#FFFFFF",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`HMX_Valuation_Report_${Date.now()}.pdf`);

      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to browser print
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  const currency = result.currency;
  const input = result.input_summary;

  return (
    <>
      {/* Download Button */}
      <button
        onClick={generatePdf}
        disabled={isGenerating}
        className="luxury-button-secondary text-xs uppercase tracking-wider px-6 py-3.5 group"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Compiling Report...</span>
          </>
        ) : isDownloaded ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Report Downloaded</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
            <span>Download PDF Report</span>
          </>
        )}
      </button>

      {/* Hidden printable/canvas element formatted specifically for A4 Luxury PDF */}
      <div className="hidden">
        <div
          id="hmx-pdf-report-content"
          className="w-[800px] p-12 bg-white text-[#111111] space-y-8"
          style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#111111] pb-6">
            <div>
              <h1
                className="font-serif text-4xl font-medium tracking-[0.18em] uppercase"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                HMX
              </h1>
              <p className="text-xs uppercase tracking-widest text-[#6B6B6B] mt-1 font-semibold">
                PROPERTY VALUATION REPORT
              </p>
            </div>
            <div className="text-right text-xs text-[#6B6B6B] space-y-1">
              <p className="font-mono">{result.prediction_timestamp}</p>
              <p className="font-mono text-[#111111] font-semibold">
                Model: Gradient Boosting Regressor | Dataset: Housing.csv
              </p>
            </div>
          </div>

          {/* Main Valuation Summary Card */}
          <div className="p-8 bg-[#F7F7F5] rounded-2xl border border-[#EAEAEA] space-y-4">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#6B6B6B]">
              PROPERTY VALUATION
            </span>
            <div className="flex items-baseline justify-between">
              <h2
                className="font-serif text-5xl font-medium text-[#111111]"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {formatCurrency(result.predicted_price, currency)}
              </h2>
              <div className="text-right">
                <span className="text-xs text-[#6B6B6B] block">Rate per sq ft</span>
                <span className="text-lg font-serif font-bold text-[#111111]">
                  {formatCurrency(result.price_per_sqft, currency)}/sqft
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E5E5E2] text-xs">
              <div>
                <span className="text-[#8A8A86] block">80% MODEL-BASED PREDICTION INTERVAL</span>
                <span className="font-medium text-[#111111]">
                  {formatCompactPrice(result.lower_range, currency)} — {formatCompactPrice(result.upper_range, currency)}
                </span>
              </div>
              <div>
                <span className="text-[#8A8A86] block">Model Reliability</span>
                <span className="font-medium text-[#111111]">{result.reliability}</span>
              </div>
              <div>
                <span className="text-[#8A8A86] block">Active ML Pipeline</span>
                <span className="font-medium text-[#111111]">{result.model_name}</span>
              </div>
            </div>
          </div>

          {/* Property Specifications */}
          <div className="space-y-3">
            <h3
              className="font-serif text-xl font-normal border-b border-[#EAEAEA] pb-2 text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Property Inputs (Housing.csv Schema)
            </h3>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Living Area</span>
                <span className="font-medium text-[#111111]">
                  {Number(input.area_sqft).toLocaleString()} sq ft
                </span>
              </div>
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Layout</span>
                <span className="font-medium text-[#111111]">
                  {input.bedrooms} Beds • {input.bathrooms} Baths
                </span>
              </div>
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Floors / Stories</span>
                <span className="font-medium text-[#111111]">
                  {input.stories || input.floors || 1} Stories
                </span>
              </div>
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Parking</span>
                <span className="font-medium text-[#111111]">
                  {input.parking} Dedicated Spots
                </span>
              </div>
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Main Road</span>
                <span className="font-medium text-[#111111]">
                  {input.mainroad ? "Direct Access" : "Secondary Road"}
                </span>
              </div>
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Preferred Area</span>
                <span className="font-medium text-[#111111]">
                  {input.prefarea ? "Prime Zone" : "Standard Zone"}
                </span>
              </div>
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Air Conditioning</span>
                <span className="font-medium text-[#111111]">
                  {input.airconditioning ? "Installed" : "None"}
                </span>
              </div>
              <div className="p-3 bg-[#FAFAFA] rounded-lg border border-[#F0F0EE]">
                <span className="text-[#8A8A86] block">Furnishing</span>
                <span className="font-medium text-[#111111] capitalize">
                  {input.furnishingstatus || input.furnishing}
                </span>
              </div>
            </div>
          </div>

          {/* Feature Impacts */}
          <div className="space-y-3">
            <h3
              className="font-serif text-xl font-normal border-b border-[#EAEAEA] pb-2 text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Relative Model Feature Importance
            </h3>
            <div className="space-y-2 text-xs">
              {result.feature_impacts.slice(0, 4).map((imp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded bg-[#FAFAFA] border border-[#F0F0EE]"
                >
                  <span className="font-medium text-[#111111]">{imp.feature}</span>
                  <span className="text-[#6B6B6B]">{imp.description}</span>
                  <span className="font-mono font-semibold text-[#111111]">
                    {imp.percentage}% ({imp.impact})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Housing Dataset Benchmark */}
          <div className="space-y-3">
            <h3
              className="font-serif text-xl font-normal border-b border-[#EAEAEA] pb-2 text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Housing Dataset Benchmark
            </h3>
            <div className="grid grid-cols-4 gap-3 text-xs">
              {result.market_comparison.comparison_points.map((pt, idx) => (
                <div key={idx} className="p-2.5 bg-[#FAFAFA] rounded border border-[#F0F0EE]">
                  <span className="text-[#8A8A86] block text-[10px]">{pt.label}</span>
                  <span className="font-medium text-[#111111]">{formatCompactPrice(pt.price, currency)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer & Verification Seal */}
          <div className="pt-6 border-t border-[#EAEAEA] flex items-center justify-between text-[10px] text-[#8A8A86]">
            <div>
              <p>Model: Gradient Boosting Regressor | Dataset: Housing.csv (N=545)</p>
              <p>Generated by HMX AI Property Valuation Platform.</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-sm text-[#111111] tracking-widest uppercase">
                HMX VALUATION VERIFIED
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
