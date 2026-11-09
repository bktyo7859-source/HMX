"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  Layers,
  MapPin,
  RotateCcw,
  Sliders,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FinishQuality } from "@/types/homeStudio";
import {
  useHomeStudioStore,
  selectActiveProject,
  selectDisplayUnit,
} from "@/store/useHomeStudioStore";
import {
  calculateConstructionEstimate,
  formatConstructionCurrency,
  simulateWhatIfScenario,
} from "@/lib/home-studio/costEngine";
import { INDIAN_CONSTRUCTION_LOCATIONS } from "@/lib/home-studio/materialRateCatalog";
import {
  DEFAULT_ESTIMATION_ASSUMPTIONS,
  EstimationAssumptions,
} from "@/lib/home-studio/quantityTakeoff";
import { formatArchitecturalArea } from "@/lib/home-studio/units";

export default function ConstructionCostDashboard({
  onStatusNotice,
}: {
  onStatusNotice?: (msg: string | null) => void;
}) {
  const project = useHomeStudioStore(selectActiveProject);
  const displayUnit = useHomeStudioStore(selectDisplayUnit);
  const updateSettings = useHomeStudioStore((s) => s.updateSettings);

  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "materials" | "labour" | "takeoff" | "whatif" | "assumptions"
  >("overview");

  // Configurable Engineering Assumptions & Local Rate Overrides
  const [assumptions, setAssumptions] = useState<EstimationAssumptions>(
    DEFAULT_ESTIMATION_ASSUMPTIONS
  );
  const [customLabourRates, setCustomLabourRates] = useState<
    Record<string, number>
  >({});
  const [taxPercentage, setTaxPercentage] = useState<number>(12.0);
  const [showTaxesInHeadline, setShowTaxesInHeadline] =
    useState<boolean>(false);

  // What-If Scenario Simulator State (Non-destructive)
  const [simFinishTier, setSimFinishTier] = useState<FinishQuality>("premium");
  const [simLocation, setSimLocation] = useState<string>("Mumbai, Maharashtra");
  const [simFlooringMode, setSimFlooringMode] = useState<
    "project_default" | "all_tiles" | "all_marble" | "all_wood"
  >("all_marble");
  const [simExtraRooms, setSimExtraRooms] = useState<number>(0);
  const [simExtraFloors, setSimExtraFloors] = useState<number>(0);
  const [simPaintMult, setSimPaintMult] = useState<number>(1.0);
  const [simWindowMult, setSimWindowMult] = useState<number>(1.0);

  const cfg = project.settings.costConfig;
  const currency = cfg.currency || "INR";

  const estimate = useMemo(
    () =>
      calculateConstructionEstimate(project, {
        assumptions,
        customLabourRates,
        overheadPercentage: cfg.architecturalFeePercentage,
        contingencyPercentage: cfg.contingencyPercentage,
        taxPercentage,
      }),
    [
      project,
      assumptions,
      customLabourRates,
      cfg.architecturalFeePercentage,
      cfg.contingencyPercentage,
      taxPercentage,
    ]
  );

  const scenarioComparison = useMemo(
    () =>
      simulateWhatIfScenario(
        project,
        {
          scenarioName: "What-If Scenario Comparison",
          finishTier: simFinishTier,
          location: simLocation,
          flooringMode: simFlooringMode,
          additionalRoomsCount: simExtraRooms,
          additionalFloorsCount: simExtraFloors,
          paintMultiplier: simPaintMult,
          windowMultiplier: simWindowMult,
        },
        {
          assumptions,
          customLabourRates,
          overheadPercentage: cfg.architecturalFeePercentage,
          contingencyPercentage: cfg.contingencyPercentage,
          taxPercentage,
        }
      ),
    [
      project,
      simFinishTier,
      simLocation,
      simFlooringMode,
      simExtraRooms,
      simExtraFloors,
      simPaintMult,
      simWindowMult,
      assumptions,
      customLabourRates,
      cfg.architecturalFeePercentage,
      cfg.contingencyPercentage,
      taxPercentage,
    ]
  );

  const totalRoomsCount = project.floors.reduce(
    (s, f) => s + f.rooms.length,
    0
  );

  const chartData = estimate.categoryBreakdowns.map((c) => ({
    name: c.categoryName.split(" ")[0],
    fullName: c.categoryName,
    Material: Math.round(c.materialCostINR / 1000),
    Labour: Math.round(c.labourCostINR / 1000),
    TotalINR: c.totalCategoryCostINR,
  }));

  const updateCostConfig = (
    updates: Partial<typeof project.settings.costConfig>
  ) => {
    updateSettings({
      costConfig: {
        ...project.settings.costConfig,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. ENGINEERING SAFEGUARDS & DERIVATION TRANSPARENCY BANNER */}
      <div className="p-4 rounded-[20px] bg-[#F7F7F5] border border-[#C5A880]/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#C5A880] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                Preliminary Architectural & Civil Quantity Takeoff
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white border border-[#E7E7E7] text-[10px] font-mono text-[#111111]">
                Confidence: {estimate.estimationConfidence}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-4xl">
              {estimate.disclaimer}
            </p>
          </div>
        </div>

        {/* Quantity Derivation Breakdown Pills */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
            Geometry-Derived: {estimate.takeoff.geometryDerivedPercentage}%
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
            Assumed Structural/MEP: {estimate.takeoff.assumptionBasedPercentage}%
          </span>
          {estimate.takeoff.userSpecifiedPercentage > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
              User-Specified: {estimate.takeoff.userSpecifiedPercentage}%
            </span>
          )}
        </div>
      </div>

      {/* 2. PROJECT & FINANCIAL EXECUTIVE SUMMARY STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Financial Summary Card */}
        <div className="lg:col-span-7 p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E7E7E7] pb-3.5">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-semibold block">
                Estimated Construction Budget ({estimate.finishTier.toUpperCase()})
              </span>
              <h2
                className="font-serif text-3xl sm:text-4xl text-[#111111] mt-0.5"
                style={{
                  fontFamily:
                    "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {formatConstructionCurrency(
                  showTaxesInHeadline
                    ? estimate.totalWithTaxesINR
                    : estimate.finalEstimatedCostINR,
                  currency
                )}
              </h2>
              <span className="text-[11px] text-[#6B6B6B] font-mono">
                {formatConstructionCurrency(estimate.costPerSqFtINR, currency)}{" "}
                / sq.ft built-up •{" "}
                {showTaxesInHeadline
                  ? `Includes ${estimate.taxPercentage}% GST`
                  : "Excludes Taxes (Base + Overheads + Contingency)"}
              </span>
            </div>

            {/* Currency & Tax Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center p-1 rounded-full bg-white border border-[#E7E7E7] text-xs">
                <button
                  type="button"
                  onClick={() => updateCostConfig({ currency: "INR" })}
                  className={`px-2.5 py-1 rounded-full font-mono text-[11px] ${
                    currency === "INR"
                      ? "bg-[#111111] text-white"
                      : "text-[#6B6B6B]"
                  }`}
                >
                  INR (₹)
                </button>
                <button
                  type="button"
                  onClick={() => updateCostConfig({ currency: "USD" })}
                  className={`px-2.5 py-1 rounded-full font-mono text-[11px] ${
                    currency === "USD"
                      ? "bg-[#111111] text-white"
                      : "text-[#6B6B6B]"
                  }`}
                >
                  USD ($)
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E7E7] text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTaxesInHeadline}
                  onChange={(e) => setShowTaxesInHeadline(e.target.checked)}
                  className="accent-[#111111]"
                />
                <span>Include {taxPercentage}% Tax</span>
              </label>
            </div>
          </div>

          {/* Exact Phase 8 Section 7 Formula Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[10px] uppercase text-[#6B6B6B] block">
                1. Material Cost
              </span>
              <span className="font-mono font-semibold text-sm text-[#111111]">
                {formatConstructionCurrency(estimate.materialCostINR, currency)}
              </span>
              <span className="text-[10px] text-[#6B6B6B] block">
                Civil + ₹
                {(estimate.interiorFurnishingsCostINR / 100000).toFixed(1)}L
                Interiors
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[10px] uppercase text-[#6B6B6B] block">
                2. Labour Cost
              </span>
              <span className="font-mono font-semibold text-sm text-[#111111]">
                {formatConstructionCurrency(estimate.labourCostINR, currency)}
              </span>
              <span className="text-[10px] text-[#6B6B6B] block">
                10 Trade Schedules ({estimate.location})
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[10px] uppercase text-[#6B6B6B] block">
                3. Subtotal (Mat + Lab + Eq)
              </span>
              <span className="font-mono font-semibold text-sm text-[#111111]">
                {formatConstructionCurrency(estimate.subtotalINR, currency)}
              </span>
              <span className="text-[10px] text-[#6B6B6B] block">
                Includes{" "}
                {formatConstructionCurrency(
                  estimate.equipmentCostINR,
                  currency
                )}{" "}
                Equipment
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[10px] uppercase text-[#6B6B6B] block">
                4. Overheads ({estimate.overheadPercentage}%)
              </span>
              <span className="font-mono font-semibold text-sm text-[#111111]">
                {formatConstructionCurrency(estimate.overheadsINR, currency)}
              </span>
              <span className="text-[10px] text-[#6B6B6B] block">
                Supervision & architectural fees
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[10px] uppercase text-[#6B6B6B] block">
                5. Contingency ({estimate.contingencyPercentage}%)
              </span>
              <span className="font-mono font-semibold text-sm text-[#111111]">
                {formatConstructionCurrency(estimate.contingencyINR, currency)}
              </span>
              <span className="text-[10px] text-[#6B6B6B] block">
                Unforeseen site buffer
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[10px] uppercase text-[#6B6B6B] block">
                6. Separate Taxes ({estimate.taxPercentage}%)
              </span>
              <span className="font-mono font-semibold text-sm text-[#C5A880]">
                {formatConstructionCurrency(
                  estimate.applicableTaxesINR,
                  currency
                )}
              </span>
              <span className="text-[10px] text-[#6B6B6B] block">
                Shown separately from base
              </span>
            </div>
          </div>
        </div>

        {/* Project Summary & Location / Finish Tier Controls Card */}
        <div className="lg:col-span-5 p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-2.5">
            <span className="text-xs uppercase tracking-wider font-medium text-[#111111]">
              Project & Location Parameters
            </span>
            <Building2 className="w-4 h-4 text-[#C5A880]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[#6B6B6B] block text-[10px]">Plot Area</span>
              <strong className="text-[#111111]">
                {formatArchitecturalArea(
                  estimate.takeoff.plotAreaSqFt,
                  displayUnit
                )}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[#6B6B6B] block text-[10px]">
                Total Built-Up Area
              </span>
              <strong className="text-[#C5A880]">
                {formatArchitecturalArea(
                  estimate.takeoff.totalBuiltUpAreaSqFt,
                  displayUnit
                )}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[#6B6B6B] block text-[10px]">
                Floors & Rooms
              </span>
              <strong className="text-[#111111]">
                {project.floors.length} Flr • {totalRoomsCount} Rooms
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
              <span className="text-[#6B6B6B] block text-[10px]">
                Doors & Windows
              </span>
              <strong className="text-[#111111]">
                {estimate.takeoff.totalDoorCount} Drs •{" "}
                {estimate.takeoff.totalWindowCount} Wins
              </strong>
            </div>
          </div>

          {/* Location & Finish Quality Selectors */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
                Construction City / State
              </label>
              <select
                value={cfg.location}
                onChange={(e) => {
                  const nextLoc = e.target.value;
                  const match = INDIAN_CONSTRUCTION_LOCATIONS.find(
                    (l) => `${l.city}, ${l.state}` === nextLoc
                  );
                  updateCostConfig({
                    location: nextLoc,
                    cityTier: match?.cityTier || "Tier 1 (Metro)",
                  });
                  onStatusNotice?.(
                    `Updated construction location to ${nextLoc}.`
                  );
                }}
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
              >
                {INDIAN_CONSTRUCTION_LOCATIONS.map((loc) => (
                  <option
                    key={loc.id}
                    value={`${loc.city}, ${loc.state}`}
                  >
                    {loc.city}, {loc.state} ({loc.cityTier.split(" ")[0]}{" "}
                    {loc.cityTier.split(" ")[1]})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
                Construction Quality Tier
              </label>
              <select
                value={cfg.finishQuality}
                onChange={(e) => {
                  const nextTier = e.target.value as FinishQuality;
                  updateCostConfig({
                    finishQuality: nextTier,
                    materialQualityMultiplier:
                      nextTier === "premium"
                        ? 1.38
                        : nextTier === "economy"
                        ? 0.82
                        : 1.0,
                  });
                  onStatusNotice?.(
                    `Switched construction quality tier to ${nextTier.toUpperCase()}.`
                  );
                }}
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
              >
                <option value="economy">ECONOMY (0.82x Finish Index)</option>
                <option value="standard">STANDARD (1.00x Finish Index)</option>
                <option value="premium">PREMIUM (1.38x Finish Index)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase text-[#6B6B6B] block">
                Overheads %
              </label>
              <input
                type="number"
                min={0}
                max={25}
                step={0.5}
                value={cfg.architecturalFeePercentage}
                onChange={(e) =>
                  updateCostConfig({
                    architecturalFeePercentage: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[#6B6B6B] block">
                Contingency %
              </label>
              <input
                type="number"
                min={0}
                max={25}
                step={0.5}
                value={cfg.contingencyPercentage}
                onChange={(e) =>
                  updateCostConfig({
                    contingencyPercentage: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[#6B6B6B] block">
                Tax (GST) %
              </label>
              <input
                type="number"
                min={0}
                max={28}
                step={1}
                value={taxPercentage}
                onChange={(e) =>
                  setTaxPercentage(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS FOR SCHEDULES & SIMULATOR */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7]">
        {(
          [
            {
              id: "overview",
              label: "Category & Floor Breakdown",
              icon: BarChart3,
            },
            {
              id: "takeoff",
              label: `Quantity Takeoff Schedule (${estimate.takeoff.lineItems.length})`,
              icon: Calculator,
            },
            {
              id: "materials",
              label: `Material Rate Database (${estimate.materialSchedule.length})`,
              icon: Layers,
            },
            {
              id: "labour",
              label: `Labour Cost Engine (${estimate.labourSchedule.length})`,
              icon: Wrench,
            },
            {
              id: "whatif",
              label: "What-If Scenario Simulator",
              icon: Sparkles,
            },
            {
              id: "assumptions",
              label: "Structural Assumptions & Safeguards",
              icon: Sliders,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                active
                  ? "bg-[#111111] text-white"
                  : "bg-white text-[#6B6B6B] border border-[#E7E7E7] hover:text-[#111111]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CATEGORY & FLOOR BREAKDOWN */}
      {activeSubTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Category Cost Chart & Table */}
          <div className="lg:col-span-8 p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#111111]">
                Category-Wise Material vs. Labour Cost Distribution (₹ Thousands)
              </h3>
              <span className="text-[11px] font-mono text-[#6B6B6B]">
                11 Engineering Categories
              </span>
            </div>

            <div className="w-full h-[260px] bg-white p-3 rounded-2xl border border-[#E7E7E7]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E7" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6B6B6B" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6B6B6B" }} />
                  <Tooltip />
                  <Bar dataKey="Material" stackId="a" fill="#111111" />
                  <Bar dataKey="Labour" stackId="a" fill="#C5A880" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl border border-[#E7E7E7]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E7E7E7] bg-[#F7F7F5] text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                    <th className="py-2.5 px-3">Engineering Category</th>
                    <th className="py-2.5 px-3">Basis</th>
                    <th className="py-2.5 px-3 text-right">Material</th>
                    <th className="py-2.5 px-3 text-right">Labour</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {estimate.categoryBreakdowns.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-[#F7F7F5]/60">
                      <td className="py-2.5 px-3 font-medium text-[#111111]">
                        {cat.categoryName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-[#6B6B6B]">
                        {cat.derivationSummary.replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatConstructionCurrency(
                          cat.materialCostINR,
                          currency
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatConstructionCurrency(
                          cat.labourCostINR,
                          currency
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#111111]">
                        {formatConstructionCurrency(
                          cat.totalCategoryCostINR,
                          currency
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#C5A880]">
                        {cat.percentageOfSubtotal}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floor-by-Floor Cost & Key Material Quantities */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3">
              <h3 className="font-serif text-xl text-[#111111]">
                Floor-Wise Cost Breakdown
              </h3>
              <div className="space-y-2.5">
                {estimate.floorBreakdowns.map((fb) => (
                  <div
                    key={fb.floorId}
                    className="p-3 rounded-xl bg-white border border-[#E7E7E7] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111111]">
                        {fb.floorName}
                      </span>
                      <span className="font-mono font-semibold text-[#C5A880]">
                        {formatConstructionCurrency(
                          fb.totalFloorCostINR,
                          currency
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#6B6B6B]">
                      <span>
                        Built-Up:{" "}
                        {formatArchitecturalArea(
                          fb.builtUpAreaSqFt,
                          displayUnit
                        )}
                      </span>
                      <span>
                        Mat:{" "}
                        {formatConstructionCurrency(
                          fb.materialCostINR,
                          currency
                        )}{" "}
                        • Lab:{" "}
                        {formatConstructionCurrency(fb.labourCostINR, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2.5 text-xs">
              <h3 className="font-serif text-xl text-[#111111]">
                Key Civil Material Totals
              </h3>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[#6B6B6B] block text-[10px]">
                    Cement (50kg)
                  </span>
                  <strong className="text-[#111111]">
                    {estimate.takeoff.totalCementBags50Kg.toLocaleString()} bags
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[#6B6B6B] block text-[10px]">
                    Steel (Fe550D)
                  </span>
                  <strong className="text-[#111111]">
                    {estimate.takeoff.totalReinforcementSteelKg.toLocaleString()}{" "}
                    kg
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[#6B6B6B] block text-[10px]">
                    Modular Bricks
                  </span>
                  <strong className="text-[#111111]">
                    {estimate.takeoff.totalBricksPieces.toLocaleString()} pcs
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[#6B6B6B] block text-[10px]">
                    Total Concrete
                  </span>
                  <strong className="text-[#111111]">
                    {estimate.takeoff.totalConcreteCuM} m³
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[#6B6B6B] block text-[10px]">
                    M-Sand / Sand
                  </span>
                  <strong className="text-[#111111]">
                    {estimate.takeoff.totalSandCuFt.toLocaleString()} cu.ft
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[#6B6B6B] block text-[10px]">
                    Aggregate
                  </span>
                  <strong className="text-[#111111]">
                    {estimate.takeoff.totalAggregateCuFt.toLocaleString()} cu.ft
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUANTITY TAKEOFF SCHEDULE (A–J) */}
      {activeSubTab === "takeoff" && (
        <div className="p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-2xl text-[#111111]">
                Quantity Takeoff Schedule (Categories A–J)
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Every quantity exposes its unit, derivation basis
                (Geometry-Derived vs Assumed), and engineering formula.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-2xl border border-[#E7E7E7]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E7E7E7] bg-[#F7F7F5] text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">Derivation Basis</th>
                  <th className="py-2.5 px-3">Formula & Engineering Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {estimate.takeoff.lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F7F7F5]/60">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#6B6B6B]">
                      {item.categoryLabel}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#111111]">
                      {item.itemName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#111111]">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#6B6B6B]">
                      {item.unit}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          item.derivationType === "geometry_derived"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : item.derivationType === "user_specified"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {item.derivationType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[#6B6B6B]">
                      <div className="font-mono text-[#111111]">
                        {item.formulaUsed}
                      </div>
                      <div className="text-[10px] text-[#8A8A86]">
                        {item.engineeringNote}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MATERIAL RATE DATABASE & SUPPLIER OVERRIDES */}
      {activeSubTab === "materials" && (
        <div className="p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-2xl text-[#111111]">
                Indian Construction Material Rate Schedule ({estimate.location},{" "}
                {estimate.state})
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Default rates are illustrative development benchmarks. Enter
                verified local supplier rates in the override column to
                calibrate your estimate.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                updateCostConfig({ customRates: {} });
                onStatusNotice?.(
                  "Reset all material supplier rate overrides to default benchmarks."
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E7E7E7] text-xs text-[#111111] hover:border-[#111111]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Material Rates</span>
            </button>
          </div>

          <div className="overflow-x-auto bg-white rounded-2xl border border-[#E7E7E7]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E7E7E7] bg-[#F7F7F5] text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">
                    Supplier Rate (INR)
                  </th>
                  <th className="py-2.5 px-3">Rate Source & Date</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {estimate.materialSchedule.map((mat) => (
                  <tr key={mat.materialId} className="hover:bg-[#F7F7F5]/60">
                    <td className="py-2.5 px-3 font-medium text-[#111111]">
                      {mat.materialName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#6B6B6B]">
                      {mat.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {mat.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={mat.unitRateINR}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          updateCostConfig({
                            customRates: {
                              ...(cfg.customRates || {}),
                              [mat.materialId]: val,
                            },
                          });
                        }}
                        className="w-24 bg-[#F7F7F5] border border-[#E7E7E7] rounded-lg px-2 py-1 text-right font-mono text-xs text-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-[10px] font-mono text-[#6B6B6B]">
                      <div>{mat.rateSource.sourceType}</div>
                      <div className="text-[#949494]">
                        Updated: {mat.rateSource.lastUpdatedDate}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#111111]">
                      {formatConstructionCurrency(mat.totalCostINR, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LABOUR COST ENGINE (10 TRADES) */}
      {activeSubTab === "labour" && (
        <div className="p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-serif text-2xl text-[#111111]">
                10-Trade Labour Cost Schedule ({estimate.location},{" "}
                {estimate.state})
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Labour costs are calculated strictly separately from material
                rates to prevent double-counting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomLabourRates({});
                onStatusNotice?.("Reset contractor labour rates to defaults.");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E7E7E7] text-xs text-[#111111]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Labour Rates</span>
            </button>
          </div>

          <div className="overflow-x-auto bg-white rounded-2xl border border-[#E7E7E7]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E7E7E7] bg-[#F7F7F5] text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                  <th className="py-2.5 px-3">Trade Category</th>
                  <th className="py-2.5 px-3">Scope Formula</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Labour Rate (INR)</th>
                  <th className="py-2.5 px-3 text-right">Total Labour Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {estimate.labourSchedule.map((lab) => (
                  <tr key={lab.tradeId} className="hover:bg-[#F7F7F5]/60">
                    <td className="py-2.5 px-3 font-medium text-[#111111]">
                      {lab.trade}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#6B6B6B]">
                      {lab.formulaUsed}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {lab.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#6B6B6B]">
                      {lab.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={lab.unitRateINR}
                        onChange={(e) =>
                          setCustomLabourRates((prev) => ({
                            ...prev,
                            [lab.tradeId]: Math.max(
                              1,
                              Number(e.target.value) || 1
                            ),
                          }))
                        }
                        className="w-24 bg-[#F7F7F5] border border-[#E7E7E7] rounded-lg px-2 py-1 text-right font-mono text-xs text-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#111111]">
                      {formatConstructionCurrency(lab.totalCostINR, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: WHAT-IF SCENARIO SIMULATOR */}
      {activeSubTab === "whatif" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Scenario Controls */}
          <div className="lg:col-span-4 p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3.5 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-semibold block">
                Non-Destructive Sandbox
              </span>
              <h3 className="font-serif text-xl text-[#111111]">
                What-If Scenario Parameters
              </h3>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                Preview cost impacts of finish upgrades, flooring swaps, extra
                rooms/floors, or city relocation without overwriting your
                project.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#6B6B6B] block">
                Simulated Finish Tier
              </label>
              <select
                value={simFinishTier}
                onChange={(e) =>
                  setSimFinishTier(e.target.value as FinishQuality)
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
              >
                <option value="economy">ECONOMY Tier</option>
                <option value="standard">STANDARD Tier</option>
                <option value="premium">PREMIUM Tier</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#6B6B6B] block">
                Simulated Construction Location
              </label>
              <select
                value={simLocation}
                onChange={(e) => setSimLocation(e.target.value)}
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
              >
                {INDIAN_CONSTRUCTION_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={`${loc.city}, ${loc.state}`}>
                    {loc.city}, {loc.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#6B6B6B] block">
                Whole-House Flooring Comparison
              </label>
              <select
                value={simFlooringMode}
                onChange={(e) =>
                  setSimFlooringMode(
                    e.target.value as typeof simFlooringMode
                  )
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
              >
                <option value="project_default">
                  Keep Current Room Flooring
                </option>
                <option value="all_tiles">
                  All Rooms → Vitrified Porcelain Tiles
                </option>
                <option value="all_marble">
                  All Rooms → Italian Statuario Marble
                </option>
                <option value="all_wood">
                  All Rooms → Smoked Oak Timber Flooring
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] uppercase text-[#6B6B6B] block">
                  + Additional Rooms
                </label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={simExtraRooms}
                  onChange={(e) =>
                    setSimExtraRooms(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-[#6B6B6B] block">
                  + Additional Floors
                </label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={simExtraFloors}
                  onChange={(e) =>
                    setSimExtraFloors(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] uppercase text-[#6B6B6B] block">
                  Paint Finish Factor ({simPaintMult}x)
                </label>
                <input
                  type="range"
                  min={0.7}
                  max={1.8}
                  step={0.1}
                  value={simPaintMult}
                  onChange={(e) => setSimPaintMult(Number(e.target.value))}
                  className="w-full accent-[#111111]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-[#6B6B6B] block">
                  Window Spec Factor ({simWindowMult}x)
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={2.0}
                  step={0.1}
                  value={simWindowMult}
                  onChange={(e) => setSimWindowMult(Number(e.target.value))}
                  className="w-full accent-[#111111]"
                />
              </div>
            </div>
          </div>

          {/* Scenario Comparison Results */}
          <div className="lg:col-span-8 p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7]">
                <span className="text-[10px] uppercase text-[#6B6B6B] block">
                  Baseline Project Estimate
                </span>
                <span className="font-serif text-2xl text-[#111111] block mt-0.5">
                  {formatConstructionCurrency(
                    scenarioComparison.baselineEstimate.finalEstimatedCostINR,
                    currency
                  )}
                </span>
                <span className="text-[10px] font-mono text-[#6B6B6B]">
                  {scenarioComparison.baselineEstimate.finishTier.toUpperCase()}{" "}
                  • {scenarioComparison.baselineEstimate.location}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#111111]">
                <span className="text-[10px] uppercase text-[#C5A880] font-semibold block">
                  Simulated What-If Estimate
                </span>
                <span className="font-serif text-2xl text-[#111111] block mt-0.5">
                  {formatConstructionCurrency(
                    scenarioComparison.scenarioEstimate.finalEstimatedCostINR,
                    currency
                  )}
                </span>
                <span className="text-[10px] font-mono text-[#6B6B6B]">
                  {scenarioComparison.scenarioEstimate.finishTier.toUpperCase()}{" "}
                  • {scenarioComparison.scenarioEstimate.location}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7]">
                <span className="text-[10px] uppercase text-[#6B6B6B] block">
                  Net Budget Variance
                </span>
                <span
                  className={`font-serif text-2xl block mt-0.5 ${
                    scenarioComparison.costDifferenceINR > 0
                      ? "text-amber-700"
                      : scenarioComparison.costDifferenceINR < 0
                      ? "text-emerald-700"
                      : "text-[#111111]"
                  }`}
                >
                  {scenarioComparison.costDifferenceINR > 0 ? "+" : ""}
                  {formatConstructionCurrency(
                    scenarioComparison.costDifferenceINR,
                    currency
                  )}
                </span>
                <span className="text-[10px] font-mono text-[#6B6B6B]">
                  {scenarioComparison.percentageDelta > 0 ? "+" : ""}
                  {scenarioComparison.percentageDelta}% vs Baseline
                </span>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-2xl border border-[#E7E7E7]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E7E7E7] bg-[#F7F7F5] text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Baseline</th>
                    <th className="py-2.5 px-3 text-right">Scenario</th>
                    <th className="py-2.5 px-3 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {scenarioComparison.categoryDeltas.map((cd) => (
                    <tr key={cd.categoryId}>
                      <td className="py-2 px-3 font-medium text-[#111111]">
                        {cd.categoryName}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatConstructionCurrency(cd.baselineINR, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatConstructionCurrency(cd.scenarioINR, currency)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-semibold ${
                          cd.deltaINR > 0
                            ? "text-amber-700"
                            : cd.deltaINR < 0
                            ? "text-emerald-700"
                            : "text-[#6B6B6B]"
                        }`}
                      >
                        {cd.deltaINR > 0 ? "+" : ""}
                        {formatConstructionCurrency(cd.deltaINR, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CONFIGURABLE STRUCTURAL & MEP ASSUMPTIONS */}
      {activeSubTab === "assumptions" && (
        <div className="p-5 rounded-[22px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl text-[#111111]">
                Preliminary Structural & MEP Engineering Assumptions
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Because a floor plan alone does not define soil strata or
                structural member schedules, these parameters govern
                assumption-based quantities.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAssumptions(DEFAULT_ESTIMATION_ASSUMPTIONS)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E7E7E7] text-xs text-[#111111]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Assumptions</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] space-y-2.5">
              <span className="text-[10px] uppercase tracking-wider text-[#C5A880] font-semibold block">
                Substructure & Soil
              </span>
              <div>
                <label className="text-[11px] text-[#6B6B6B] block">
                  Foundation Depth (ft)
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={3}
                  max={15}
                  value={assumptions.foundationDepthFt}
                  onChange={(e) =>
                    setAssumptions((a) => ({
                      ...a,
                      foundationDepthFt: Math.max(
                        3,
                        Number(e.target.value) || 5
                      ),
                    }))
                  }
                  className="w-full bg-[#F7F7F5] border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6B6B6B] block">
                  Soil Classification
                </label>
                <select
                  value={assumptions.soilType}
                  onChange={(e) =>
                    setAssumptions((a) => ({
                      ...a,
                      soilType: e.target.value as EstimationAssumptions["soilType"],
                    }))
                  }
                  className="w-full bg-[#F7F7F5] border border-[#E7E7E7] rounded-xl px-2.5 py-1.5"
                >
                  <option value="medium_clay_sand">Medium Clay / Sand</option>
                  <option value="hard_murrum">Hard Murrum</option>
                  <option value="black_cotton">Black Cotton Soil (1.25x)</option>
                  <option value="rocky">Rocky Strata (0.85x)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] space-y-2.5">
              <span className="text-[10px] uppercase tracking-wider text-[#C5A880] font-semibold block">
                Preliminary Steel Ratios (kg/m³)
              </span>
              <div>
                <label className="text-[11px] text-[#6B6B6B] block">
                  Columns & Beams Steel (kg/m³)
                </label>
                <input
                  type="number"
                  step={5}
                  min={80}
                  max={250}
                  value={assumptions.columnBeamSteelKgPerCuM}
                  onChange={(e) =>
                    setAssumptions((a) => ({
                      ...a,
                      columnBeamSteelKgPerCuM: Math.max(
                        80,
                        Number(e.target.value) || 145
                      ),
                    }))
                  }
                  className="w-full bg-[#F7F7F5] border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6B6B6B] block">
                  Floor Slabs & Stairs Steel (kg/m³)
                </label>
                <input
                  type="number"
                  step={5}
                  min={60}
                  max={180}
                  value={assumptions.slabStairSteelKgPerCuM}
                  onChange={(e) =>
                    setAssumptions((a) => ({
                      ...a,
                      slabStairSteelKgPerCuM: Math.max(
                        60,
                        Number(e.target.value) || 90
                      ),
                    }))
                  }
                  className="w-full bg-[#F7F7F5] border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] space-y-2.5">
              <span className="text-[10px] uppercase tracking-wider text-[#C5A880] font-semibold block">
                Wastage & MEP Allowances
              </span>
              <div>
                <label className="text-[11px] text-[#6B6B6B] block">
                  Flooring Cutting Wastage (%)
                </label>
                <input
                  type="number"
                  step={1}
                  min={0}
                  max={20}
                  value={assumptions.flooringWastagePercent}
                  onChange={(e) =>
                    setAssumptions((a) => ({
                      ...a,
                      flooringWastagePercent: Math.max(
                        0,
                        Number(e.target.value) || 7
                      ),
                    }))
                  }
                  className="w-full bg-[#F7F7F5] border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#6B6B6B] block">
                  Electrical Points per 100 sq.ft
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={2}
                  max={12}
                  value={assumptions.electricalPointsPer100SqFt}
                  onChange={(e) =>
                    setAssumptions((a) => ({
                      ...a,
                      electricalPointsPer100SqFt: Math.max(
                        2,
                        Number(e.target.value) || 4.5
                      ),
                    }))
                  }
                  className="w-full bg-[#F7F7F5] border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-800 font-semibold block">
              Mandatory Engineering Limitations Notice
            </span>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-[#6B6B6B]">
              {estimate.takeoff.missingStructuralInformationWarnings.map(
                (w, idx) => (
                  <li key={idx}>{w}</li>
                )
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

