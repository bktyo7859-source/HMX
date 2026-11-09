"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  Calculator,
  Scale,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Info,
} from "lucide-react";
import {
  useHomeStudioStore,
  selectActiveProject,
} from "@/store/useHomeStudioStore";
import {
  ConstructionVsMarketValuationComparison,
  evaluateProjectValuationBridge,
  extractHousing12FeaturesFromProject,
  ValuationBridgeOverrides,
} from "@/lib/home-studio/valuationBridge";
import { formatConstructionCurrency } from "@/lib/home-studio/costEngine";

interface ValuationComparisonPanelProps {
  onStatusNotice?: (msg: string) => void;
}

export default function ValuationComparisonPanel({
  onStatusNotice,
}: ValuationComparisonPanelProps) {
  const project = useHomeStudioStore(selectActiveProject);

  // User-configurable site/MEP overrides for the 12 Housing.csv features
  const [overrides, setOverrides] = useState<ValuationBridgeOverrides>({
    hotwaterheating: false,
    airconditioning: true,
    prefarea: true,
  });

  const [comparison, setComparison] =
    useState<ConstructionVsMarketValuationComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const extraction = useMemo(() => {
    if (!project) return null;
    return extractHousing12FeaturesFromProject(project, overrides);
  }, [project, overrides]);

  const handleRunValuationComparison = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const result = await evaluateProjectValuationBridge(project, overrides);
      setComparison(result);
      onStatusNotice?.(
        `Evaluated HMX Property Valuation Bridge for "${project.name}".`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!project) return;
    handleRunValuationComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, project?.version, overrides]);

  if (!project || !extraction) return null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-[24px] bg-[#F7F7F5] border border-[#E7E7E7] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-semibold block">
            Phase 10 • Optional HMX Property Valuation Bridge
          </span>
          <h2
            className="font-serif text-2xl sm:text-3xl text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            HMX Property Valuation vs. Construction Replacement Cost
          </h2>
          <p className="text-xs text-[#6B6B6B] mt-0.5 max-w-3xl">
            Compares physical construction replacement cost (Phase 8 Civil &amp;
            Architectural BOQ Engine) against estimated property market value
            from the existing HMX GradientBoostingRegressor trained on Kaggle{" "}
            <code className="font-mono">Housing.csv</code> (545 records, 12
            supported features).
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunValuationComparison}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors shrink-0 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#C5A880] ${
              loading ? "animate-spin" : ""
            }`}
          />
          <span>
            {loading ? "Evaluating ML Model..." : "Recalculate Valuation"}
          </span>
        </button>
      </div>

      {/* Missing Floor-Plan Input Warnings (if any) */}
      {extraction.missingRequiredFields.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <span className="font-semibold block">
              Incomplete Floor-Plan Room Inputs Detected for ML Valuation:
            </span>
            <ul className="list-disc pl-4 space-y-0.5">
              {extraction.missingRequiredFields.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-800">
              Draw bedroom and bathroom polygons on the 2D CAD Floor Plan or
              confirm the parameters below for accurate model alignment.
            </p>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison KPI Cards */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Construction Replacement Cost */}
          <div className="p-6 rounded-[24px] bg-white border border-[#E7E7E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B]">
                1. Construction Replacement Cost
              </span>
              <Calculator className="w-4 h-4 text-[#C5A880]" />
            </div>
            <div>
              <div
                className="font-serif text-3xl text-[#111111] font-semibold"
                style={{
                  fontFamily:
                    "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {formatConstructionCurrency(
                  comparison.constructionReplacementCostINR
                )}
              </div>
              <span className="text-xs font-mono text-[#6B6B6B] block mt-1">
                ₹{comparison.constructionCostPerSqFtINR.toLocaleString("en-IN")}{" "}
                / sq.ft • Excludes Land Value &amp; Taxes
              </span>
            </div>
            <div className="pt-2 border-t border-[#E7E7E7] text-[11px] text-[#6B6B6B]">
              Derived from {comparison.extractedFeatures.area.toLocaleString("en-IN")}{" "}
              sq.ft built-up geometry ({comparison.constructionEstimate.finishTier.toUpperCase()}{" "}
              finish tier).
            </div>
          </div>

          {/* Card 2: Existing HMX ML Market Valuation */}
          <div className="p-6 rounded-[24px] bg-[#111111] text-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880]">
                2. HMX ML Market Valuation
              </span>
              <TrendingUp className="w-4 h-4 text-[#C5A880]" />
            </div>
            <div>
              <div
                className="font-serif text-3xl text-white font-semibold"
                style={{
                  fontFamily:
                    "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {formatConstructionCurrency(comparison.marketValuationINR)}
              </div>
              <span className="text-xs font-mono text-[#C5A880] block mt-1">
                {comparison.marketValuePerSqFtINR
                  ? `₹${comparison.marketValuePerSqFtINR.toLocaleString(
                      "en-IN"
                    )} / sq.ft`
                  : "Per sq.ft N/A"}{" "}
                • 85% Interval:{" "}
                {formatConstructionCurrency(comparison.marketRangeLowerINR)} –{" "}
                {formatConstructionCurrency(comparison.marketRangeUpperINR)}
              </span>
            </div>
            <div className="pt-2 border-t border-white/15 text-[11px] text-[#D4D4D4]">
              Predicted by unmodified HMX GradientBoostingRegressor using only
              the 12 <code className="font-mono">Housing.csv</code> features.
            </div>
          </div>

          {/* Card 3: Difference Between Market Valuation & Construction Cost */}
          <div className="p-6 rounded-[24px] bg-white border border-[#E7E7E7] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B]">
                3. Valuation vs. Replacement Delta
              </span>
              <Scale className="w-4 h-4 text-[#C5A880]" />
            </div>
            <div>
              <div
                className="font-serif text-3xl text-[#111111] font-semibold"
                style={{
                  fontFamily:
                    "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {comparison.valuationMinusConstructionINR >= 0 ? "+" : ""}
                {formatConstructionCurrency(
                  comparison.valuationMinusConstructionINR
                )}
              </div>
              <span className="text-xs font-mono text-[#6B6B6B] block mt-1">
                Market Valuation − Construction Replacement Cost
              </span>
            </div>
            <div className="pt-2 border-t border-[#E7E7E7] text-[11px] text-[#6B6B6B]">
              Evaluated on{" "}
              {new Date(comparison.comparedAt).toLocaleString("en-IN")}. Land
              value is never added to construction cost.
            </div>
          </div>
        </div>
      )}

      {/* 12 Housing.csv Features Mapping & Interactive Site Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 p-6 rounded-[24px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                Strict 12-Feature Housing.csv Input Mapping
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#6B6B6B]">
              12 / 12 Supported Features
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E7E7E7] bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#111111] text-white">
                  <th className="px-3 py-2 text-[10px] font-mono uppercase">
                    Feature Name
                  </th>
                  <th className="px-3 py-2 text-[10px] font-mono uppercase">
                    Transmitted Value
                  </th>
                  <th className="px-3 py-2 text-[10px] font-mono uppercase">
                    Architectural Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {(
                  Object.keys(extraction.features) as Array<
                    keyof typeof extraction.features
                  >
                ).map((key) => (
                  <tr key={key}>
                    <td className="px-3 py-2 font-mono font-medium text-[#111111]">
                      {key}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#C5A880] font-semibold">
                      {String(extraction.features[key])}
                    </td>
                    <td className="px-3 py-2 text-[#6B6B6B]">
                      {extraction.featureDerivationNotes[key]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Site & MEP Attribute Controls + Disclaimers */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-[24px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E7E7E7] pb-3">
              <Sliders className="w-4 h-4 text-[#C5A880]" />
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                Complete Site &amp; MEP Model Inputs
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="p-3 rounded-xl bg-white border border-[#E7E7E7] flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#111111]">Main Road</span>
                <input
                  type="checkbox"
                  checked={extraction.features.mainroad}
                  onChange={(e) =>
                    setOverrides((p) => ({ ...p, mainroad: e.target.checked }))
                  }
                  className="accent-[#111111]"
                />
              </label>

              <label className="p-3 rounded-xl bg-white border border-[#E7E7E7] flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#111111]">Guest Room</span>
                <input
                  type="checkbox"
                  checked={extraction.features.guestroom}
                  onChange={(e) =>
                    setOverrides((p) => ({ ...p, guestroom: e.target.checked }))
                  }
                  className="accent-[#111111]"
                />
              </label>

              <label className="p-3 rounded-xl bg-white border border-[#E7E7E7] flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#111111]">Hot Water</span>
                <input
                  type="checkbox"
                  checked={extraction.features.hotwaterheating}
                  onChange={(e) =>
                    setOverrides((p) => ({
                      ...p,
                      hotwaterheating: e.target.checked,
                    }))
                  }
                  className="accent-[#111111]"
                />
              </label>

              <label className="p-3 rounded-xl bg-white border border-[#E7E7E7] flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#111111]">
                  Air Conditioning
                </span>
                <input
                  type="checkbox"
                  checked={extraction.features.airconditioning}
                  onChange={(e) =>
                    setOverrides((p) => ({
                      ...p,
                      airconditioning: e.target.checked,
                    }))
                  }
                  className="accent-[#111111]"
                />
              </label>

              <label className="p-3 rounded-xl bg-white border border-[#E7E7E7] flex items-center justify-between cursor-pointer">
                <span className="font-medium text-[#111111]">
                  Preferred Area
                </span>
                <input
                  type="checkbox"
                  checked={extraction.features.prefarea}
                  onChange={(e) =>
                    setOverrides((p) => ({ ...p, prefarea: e.target.checked }))
                  }
                  className="accent-[#111111]"
                />
              </label>

              <div className="p-3 rounded-xl bg-white border border-[#E7E7E7] flex items-center justify-between">
                <span className="font-medium text-[#111111]">Parking Bays</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={extraction.features.parking}
                  onChange={(e) =>
                    setOverrides((p) => ({
                      ...p,
                      parking: Math.max(0, Math.min(5, Number(e.target.value) || 0)),
                    }))
                  }
                  className="w-14 text-right font-mono text-xs text-[#111111] outline-none bg-[#F7F7F5] rounded px-1.5 py-0.5"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
                Furnishing Status (Housing.csv Feature)
              </label>
              <select
                value={extraction.features.furnishingstatus}
                onChange={(e) =>
                  setOverrides((p) => ({
                    ...p,
                    furnishingstatus: e.target.value as
                      | "furnished"
                      | "semi-furnished"
                      | "unfurnished",
                  }))
                }
                className="w-full text-xs text-[#111111] font-medium outline-none bg-transparent"
              >
                <option value="furnished">Furnished</option>
                <option value="semi-furnished">Semi-Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
          </div>

          {/* Model Limitations & Disclaimers */}
          {comparison && (
            <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2.5 text-[11px] text-[#6B6B6B]">
              <div className="flex items-center gap-1.5 text-[#111111] font-semibold uppercase tracking-wider text-[10px]">
                <Info className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Valuation Assumptions &amp; Model Limitations</span>
              </div>
              <p className="leading-relaxed">{comparison.valuationDisclaimer}</p>
              <ul className="list-disc pl-4 space-y-1">
                {comparison.modelLimitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

