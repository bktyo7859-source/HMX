"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Layers,
  MapPin,
  Maximize2,
  Ruler,
  CheckCircle2,
  Building2,
} from "lucide-react";
import {
  CardinalDirection,
  FloorType,
  RoadSide,
  UnitSystem,
} from "@/types/homeStudio";
import {
  createNewHomeStudioProject,
  formatArea,
  formatDimension,
} from "@/data/homeStudioProjects";

const AVAILABLE_FLOORS: { type: FloorType; label: string; desc: string }[] = [
  {
    type: "basement",
    label: "Basement Level",
    desc: "Subterranean parking, utility & lounge",
  },
  {
    type: "ground",
    label: "Ground Floor",
    desc: "Primary plinth living, kitchen & entry",
  },
  {
    type: "first",
    label: "First Floor",
    desc: "Upper private bedrooms & family lounge",
  },
  {
    type: "second",
    label: "Second Floor",
    desc: "Additional suites & study gallery",
  },
  {
    type: "third",
    label: "Third Floor",
    desc: "Penthouse level & sky pavilion",
  },
  {
    type: "rooftop",
    label: "Rooftop Terrace",
    desc: "Parapet deck, solar & stair headroom",
  },
];

export default function NewHomeStudioProjectPage() {
  const router = useRouter();

  const [name, setName] = useState("The Kensington Courtyard Villa");
  const [location, setLocation] = useState("Indiranagar, Bangalore");
  const [description, setDescription] = useState(
    "Custom residential design with Vastu-aligned setbacks and multi-floor spatial planning."
  );

  const [displayUnit, setDisplayUnit] = useState<UnitSystem>("ft");
  const [plotShape, setPlotShape] = useState<"rectangular" | "polygon">(
    "rectangular"
  );
  const [plotWidthFt, setPlotWidthFt] = useState<number>(50);
  const [plotLengthFt, setPlotLengthFt] = useState<number>(80);

  const [northDirection, setNorthDirection] = useState<CardinalDirection>("N");
  const [roadFacing, setRoadFacing] = useState<RoadSide>("north");

  const [frontSetbackFt, setFrontSetbackFt] = useState<number>(8);
  const [backSetbackFt, setBackSetbackFt] = useState<number>(6);
  const [leftSetbackFt, setLeftSetbackFt] = useState<number>(5);
  const [rightSetbackFt, setRightSetbackFt] = useState<number>(5);

  const [selectedFloors, setSelectedFloors] = useState<FloorType[]>([
    "ground",
    "first",
  ]);
  const [ceilingHeightFt, setCeilingHeightFt] = useState<number>(10.5);
  const [templateId, setTemplateId] = useState<
    | "blank"
    | "modern_villa_3bhk"
    | "compact_courtyard_2bhk"
    | "executive_duplex_4bhk"
  >("modern_villa_3bhk");

  const toggleFloor = (floor: FloorType) => {
    if (selectedFloors.includes(floor)) {
      if (selectedFloors.length === 1) return; // Require at least 1 floor
      setSelectedFloors(selectedFloors.filter((f) => f !== floor));
    } else {
      setSelectedFloors([...selectedFloors, floor]);
    }
  };

  const plotAreaSqFt = Math.round(plotWidthFt * plotLengthFt);
  const buildableWidthFt = Math.max(
    10,
    plotWidthFt - leftSetbackFt - rightSetbackFt
  );
  const buildableLengthFt = Math.max(
    10,
    plotLengthFt - frontSetbackFt - backSetbackFt
  );
  const singleFloorFootprintSqFt = Math.round(
    buildableWidthFt * buildableLengthFt
  );
  const totalBuiltUpAreaSqFt =
    singleFloorFootprintSqFt * selectedFloors.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const project = createNewHomeStudioProject({
      name,
      description,
      location,
      plotShape,
      plotWidthFt,
      plotLengthFt,
      displayUnit,
      northDirection,
      roadFacing,
      frontSetbackFt,
      backSetbackFt,
      leftSetbackFt,
      rightSetbackFt,
      initialFloors: selectedFloors,
      ceilingHeightFt,
      templateId,
    });
    router.push(`/home-studio/${project.id}`);
  };

  return (
    <div className="bg-white min-h-screen pt-32 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-6">
          <Link
            href="/home-studio"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home Studio</span>
          </Link>

          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F7F7F5] border border-[#E7E7E7]">
            <button
              type="button"
              onClick={() => setDisplayUnit("ft")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                displayUnit === "ft"
                  ? "bg-[#111111] text-white"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Imperial (ft / in)
            </button>
            <button
              type="button"
              onClick={() => setDisplayUnit("m")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                displayUnit === "m"
                  ? "bg-[#111111] text-white"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Metric (m)
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-3 max-w-3xl">
          <span className="text-[11px] uppercase tracking-[0.22em] text-[#C5A880] font-medium">
            Step 1 • Architectural Site & Envelope Setup
          </span>
          <h1
            className="font-serif text-4xl sm:text-5xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            Initialize New Home Project
          </h1>
          <p className="text-sm sm:text-base text-[#6B6B6B] font-light">
            Define your plot geometry, municipal setbacks, cardinal orientation,
            and multi-story structure before launching the studio workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
        >
          {/* Left Configuration Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Project Identity */}
            <div className="p-7 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
              <h2
                className="font-serif text-2xl text-[#111111]"
                style={{
                  fontFamily:
                    "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                1. Project Identity & Location
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="luxury-input py-2.5 text-sm"
                    placeholder="e.g. The Aurelia Courtyard Residence"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Site Location / City
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="luxury-input py-2.5 text-sm"
                    placeholder="e.g. Indiranagar, Bangalore"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                  Architectural Brief
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="luxury-input py-2.5 text-sm resize-none"
                  placeholder="Describe architectural style, family requirements, or site notes..."
                />
              </div>
            </div>

            {/* 2. Plot Dimensions & Setbacks */}
            <div className="p-7 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-6">
              <div className="flex items-center justify-between">
                <h2
                  className="font-serif text-2xl text-[#111111]"
                  style={{
                    fontFamily:
                      "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  2. Plot Geometry, Orientation & Setbacks
                </h2>
                <span className="text-xs font-mono text-[#6B6B6B]">
                  {formatDimension(plotWidthFt, displayUnit)} ×{" "}
                  {formatDimension(plotLengthFt, displayUnit)}
                </span>
              </div>

              {/* Plot Shape & Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: "30' × 40' (1,200 sqft)", w: 30, l: 40 },
                  { label: "40' × 60' (2,400 sqft)", w: 40, l: 60 },
                  { label: "50' × 80' (4,000 sqft)", w: 50, l: 80 },
                  { label: "60' × 90' (5,400 sqft)", w: 60, l: 90 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPlotWidthFt(preset.w);
                      setPlotLengthFt(preset.l);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      plotWidthFt === preset.w && plotLengthFt === preset.l
                        ? "bg-[#111111] text-white border-[#111111]"
                        : "bg-white text-[#111111] border-[#E7E7E7] hover:border-[#111111]"
                    }`}
                  >
                    <span className="text-xs font-medium block">
                      {preset.label.split(" ")[0]} {preset.label.split(" ")[1]}{" "}
                      {preset.label.split(" ")[2]}
                    </span>
                    <span className="text-[10px] opacity-75">
                      {preset.w * preset.l} sq ft
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Plot Shape
                  </label>
                  <select
                    value={plotShape}
                    onChange={(e) =>
                      setPlotShape(e.target.value as "rectangular" | "polygon")
                    }
                    className="luxury-input py-2.5 text-sm"
                  >
                    <option value="rectangular">Rectangular Plot</option>
                    <option value="polygon">Custom Polygon Plot</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Plot Width (ft)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={250}
                    value={plotWidthFt}
                    onChange={(e) =>
                      setPlotWidthFt(Math.max(20, Number(e.target.value)))
                    }
                    className="luxury-input py-2.5 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Plot Length (ft)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={plotLengthFt}
                    onChange={(e) =>
                      setPlotLengthFt(Math.max(20, Number(e.target.value)))
                    }
                    className="luxury-input py-2.5 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Orientation & Road Facing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7E7E7]">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Compass North Direction
                  </label>
                  <select
                    value={northDirection}
                    onChange={(e) =>
                      setNorthDirection(e.target.value as CardinalDirection)
                    }
                    className="luxury-input py-2.5 text-sm"
                  >
                    {(["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const).map(
                      (dir) => (
                        <option key={dir} value={dir}>
                          {dir} — Compass Orientation
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Primary Road-Facing Side
                  </label>
                  <select
                    value={roadFacing}
                    onChange={(e) => setRoadFacing(e.target.value as RoadSide)}
                    className="luxury-input py-2.5 text-sm"
                  >
                    <option value="north">North Road Frontage</option>
                    <option value="east">East Road Frontage</option>
                    <option value="south">South Road Frontage</option>
                    <option value="west">West Road Frontage</option>
                  </select>
                </div>
              </div>

              {/* Setbacks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#E7E7E7]">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                    Front Setback (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={frontSetbackFt}
                    onChange={(e) =>
                      setFrontSetbackFt(Math.max(0, Number(e.target.value)))
                    }
                    className="luxury-input py-2 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                    Rear Setback (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={backSetbackFt}
                    onChange={(e) =>
                      setBackSetbackFt(Math.max(0, Number(e.target.value)))
                    }
                    className="luxury-input py-2 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                    Left Setback (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={leftSetbackFt}
                    onChange={(e) =>
                      setLeftSetbackFt(Math.max(0, Number(e.target.value)))
                    }
                    className="luxury-input py-2 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                    Right Setback (ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={rightSetbackFt}
                    onChange={(e) =>
                      setRightSetbackFt(Math.max(0, Number(e.target.value)))
                    }
                    className="luxury-input py-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Multi-Floor Levels & Starter Layout */}
            <div className="p-7 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-6">
              <div className="flex items-center justify-between">
                <h2
                  className="font-serif text-2xl text-[#111111]"
                  style={{
                    fontFamily:
                      "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  3. Multi-Floor Building System
                </h2>
                <span className="text-xs font-mono text-[#C5A880]">
                  {selectedFloors.length} Active Levels
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_FLOORS.map((flr) => {
                  const active = selectedFloors.includes(flr.type);
                  return (
                    <button
                      key={flr.type}
                      type="button"
                      onClick={() => toggleFloor(flr.type)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                        active
                          ? "bg-white border-[#111111] shadow-sm"
                          : "bg-white/60 border-[#E7E7E7] text-[#6B6B6B] hover:border-[#111111]"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-medium text-[#111111] block">
                          {flr.label}
                        </span>
                        <span className="text-[11px] text-[#6B6B6B] font-light">
                          {flr.desc}
                        </span>
                      </div>
                      <CheckCircle2
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          active ? "text-[#C5A880]" : "text-[#E7E7E7]"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7E7E7]">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Floor-to-Ceiling Height (ft)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={8.5}
                    max={16}
                    value={ceilingHeightFt}
                    onChange={(e) =>
                      setCeilingHeightFt(Number(e.target.value) || 10)
                    }
                    className="luxury-input py-2.5 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium block">
                    Initial Floor Plan Layout
                  </label>
                  <select
                    value={templateId}
                    onChange={(e) =>
                      setTemplateId(
                        e.target.value as
                          | "blank"
                          | "modern_villa_3bhk"
                          | "compact_courtyard_2bhk"
                          | "executive_duplex_4bhk"
                      )
                    }
                    className="luxury-input py-2.5 text-sm"
                  >
                    <option value="modern_villa_3bhk">
                      Pre-Populated 3BHK Architectural Layout
                    </option>
                    <option value="executive_duplex_4bhk">
                      Executive 4BHK Multi-Zone Layout
                    </option>
                    <option value="compact_courtyard_2bhk">
                      2BHK Courtyard Layout
                    </option>
                    <option value="blank">
                      Blank Plot (Draw from Scratch)
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Architectural Preview Sidebar */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="p-7 rounded-[24px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-6">
              <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-medium block">
                    Live Plot Envelope Preview
                  </span>
                  <h3
                    className="font-serif text-2xl text-[#111111]"
                    style={{
                      fontFamily:
                        "var(--font-cormorant), Cormorant Garamond, serif",
                    }}
                  >
                    {name || "New Home Project"}
                  </h3>
                </div>
                <Compass className="w-5 h-5 text-[#C5A880]" />
              </div>

              {/* Interactive SVG Plot & Setback Diagram */}
              <div className="w-full aspect-[4/3] bg-white rounded-2xl border border-[#E7E7E7] p-5 flex items-center justify-center relative">
                <svg
                  viewBox={`-10 -10 ${plotWidthFt + 20} ${plotLengthFt + 20}`}
                  className="w-full h-full max-h-[220px]"
                >
                  <rect
                    x={0}
                    y={0}
                    width={plotWidthFt}
                    height={plotLengthFt}
                    fill="#FBFBFA"
                    stroke="#111111"
                    strokeWidth={1.1}
                  />
                  <rect
                    x={leftSetbackFt}
                    y={frontSetbackFt}
                    width={buildableWidthFt}
                    height={buildableLengthFt}
                    fill="#F5EFE6"
                    stroke="#C5A880"
                    strokeWidth={0.8}
                    strokeDasharray="2.5 1.5"
                  />
                  <text
                    x={plotWidthFt / 2}
                    y={plotLengthFt / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#111111"
                    fontSize={Math.max(3, Math.min(plotWidthFt, plotLengthFt) * 0.08)}
                    fontFamily="DM Sans, sans-serif"
                  >
                    {formatDimension(buildableWidthFt, displayUnit)} ×{" "}
                    {formatDimension(buildableLengthFt, displayUnit)}
                  </text>
                </svg>

                <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-[10px] font-mono text-[#6B6B6B]">
                  <span>NORTH: {northDirection}</span>
                  <span>ROAD: {roadFacing.toUpperCase()}</span>
                </div>
              </div>

              {/* Real-Time Computed Metrics */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs py-2 border-b border-[#E7E7E7]">
                  <span className="text-[#6B6B6B]">Gross Plot Area</span>
                  <span className="font-mono font-medium text-[#111111]">
                    {formatArea(plotAreaSqFt, displayUnit)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-[#E7E7E7]">
                  <span className="text-[#6B6B6B]">
                    Net Buildable Plinth (After Setbacks)
                  </span>
                  <span className="font-mono font-medium text-[#111111]">
                    {formatArea(singleFloorFootprintSqFt, displayUnit)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-[#E7E7E7]">
                  <span className="text-[#6B6B6B]">Configured Floors</span>
                  <span className="font-mono font-medium text-[#111111]">
                    {selectedFloors.length} Levels (
                    {selectedFloors.map((f) => f.toUpperCase()).join(", ")})
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm py-2.5 bg-white px-3.5 rounded-xl border border-[#E7E7E7]">
                  <span className="font-medium text-[#111111]">
                    Estimated Total Built-Up Area
                  </span>
                  <span className="font-mono font-semibold text-[#C5A880]">
                    {formatArea(totalBuiltUpAreaSqFt, displayUnit)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="luxury-button-primary w-full text-xs uppercase tracking-wider py-4 group"
              >
                <Building2 className="w-4 h-4 text-[#C5A880]" />
                <span>Create Project & Open Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

