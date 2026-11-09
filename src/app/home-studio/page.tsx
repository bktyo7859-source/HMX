"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  FolderOpen,
  Layers,
  LayoutGrid,
  Maximize2,
  Plus,
  Ruler,
  Search,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { BuildingProject, UnitSystem } from "@/types/homeStudio";
import {
  STARTER_HOME_PROJECTS,
  calculateProjectMetrics,
  deleteHomeStudioProject,
  duplicateHomeStudioProject,
  formatArea,
  formatDimension,
  loadHomeStudioProjects,
  createNewHomeStudioProject,
} from "@/data/homeStudioProjects";
import ProjectCard from "@/components/home-studio/ProjectCard";
import { useRouter } from "next/navigation";

export default function HomeStudioLandingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<BuildingProject[]>(STARTER_HOME_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState<"all" | "1" | "2" | "3+">("all");
  const [displayUnit, setDisplayUnit] = useState<UnitSystem>("ft");
  const [activeTab, setActiveTab] = useState<"recent" | "saved" | "templates">("recent");

  useEffect(() => {
    const loaded = loadHomeStudioProjects();
    setProjects(loaded);
  }, []);

  const handleDuplicate = (projectId: string) => {
    const dup = duplicateHomeStudioProject(projectId);
    if (dup) {
      setProjects(loadHomeStudioProjects());
    }
  };

  const handleDelete = (projectId: string) => {
    if (projects.length <= 1) {
      alert("At least one architectural project must remain in the workspace.");
      return;
    }
    const updated = deleteHomeStudioProject(projectId);
    setProjects(updated);
  };

  const handleLaunchTemplate = (
    templateId: "modern_villa_3bhk" | "compact_courtyard_2bhk" | "executive_duplex_4bhk",
    title: string,
    width: number,
    length: number,
    floors: ("basement" | "ground" | "first")[]
  ) => {
    const created = createNewHomeStudioProject({
      name: title,
      description: `Architectural configuration initialized from the ${title} blueprint preset.`,
      location: "Bangalore, India",
      plotShape: "rectangular",
      plotWidthFt: width,
      plotLengthFt: length,
      displayUnit,
      northDirection: "N",
      roadFacing: "north",
      frontSetbackFt: 8,
      backSetbackFt: 6,
      leftSetbackFt: 5,
      rightSetbackFt: 5,
      initialFloors: floors,
      ceilingHeightFt: 10.5,
      templateId,
    });
    router.push(`/home-studio/${created.id}`);
  };

  const filteredProjects = useMemo(() => {
    return [...projects]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .filter((p) => {
        const matchesQuery =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase());

        const fc = p.floors.length;
        const matchesFloors =
          floorFilter === "all" ||
          (floorFilter === "1" && fc === 1) ||
          (floorFilter === "2" && fc === 2) ||
          (floorFilter === "3+" && fc >= 3);

        return matchesQuery && matchesFloors;
      });
  }, [projects, searchQuery, floorFilter]);

  const portfolioStats = useMemo(() => {
    let totalBuiltUp = 0;
    let totalFloors = 0;
    let totalRooms = 0;

    projects.forEach((p) => {
      const m = calculateProjectMetrics(p);
      totalBuiltUp += m.totalBuiltUpAreaSqFt;
      totalFloors += m.floorCount;
      totalRooms += m.totalRoomsCount;
    });

    return {
      projectCount: projects.length,
      totalBuiltUp,
      totalFloors,
      totalRooms,
    };
  }, [projects]);

  return (
    <div className="bg-white min-h-screen pt-32 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-14">
        {/* Top Editorial Studio Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end pb-12 border-b border-[#E7E7E7]">
          <div className="lg:col-span-8 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F7F5] border border-[#E7E7E7] text-[#111111]">
              <Compass className="w-3.5 h-3.5 text-[#C5A880]" />
              <span
                className="text-[11px] uppercase tracking-[0.22em] font-medium"
                style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
              >
                HMX Home Studio • Architectural CAD & 3D BIM Workspace
              </span>
            </div>

            <h1
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#111111] leading-[1.08]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Architectural Home Builder & Spatial Cost Studio
            </h1>

            <p className="text-base sm:text-lg text-[#6B6B6B] font-sans font-light max-w-2xl leading-relaxed">
              Draft precision 2D floor plans in real-world units, configure
              multi-story elevations, visualize synchronized 3D massing, and
              compute item-wise construction quantities alongside HMX AI
              property valuation.
            </p>
          </div>

          {/* Primary Create Actions & Unit Switcher */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-3">
            <Link
              href="/home-studio/new"
              className="luxury-button-primary text-xs uppercase tracking-wider px-7 py-4 group w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4 text-[#C5A880]" />
              <span>Create New Home Project</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>

            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F7F7F5] border border-[#E7E7E7] self-start sm:self-auto lg:self-end">
              <span className="text-[10px] uppercase tracking-widest text-[#6B6B6B] px-3">
                Units:
              </span>
              <button
                type="button"
                onClick={() => setDisplayUnit("ft")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  displayUnit === "ft"
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                Feet / Inches (ft)
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
                Metres (m)
              </button>
            </div>
          </div>
        </div>

        {/* Studio Workspace Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#6B6B6B]">
              <span>Active Designs</span>
              <FolderOpen className="w-4 h-4 text-[#C5A880]" />
            </div>
            <p
              className="font-serif text-3xl sm:text-4xl text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {portfolioStats.projectCount} Projects
            </p>
            <p className="text-xs text-[#6B6B6B] font-light">
              Synchronized in real-world architectural coordinates
            </p>
          </div>

          <div className="p-6 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#6B6B6B]">
              <span>Cumulative Built-Up Area</span>
              <Maximize2 className="w-4 h-4 text-[#C5A880]" />
            </div>
            <p
              className="font-serif text-3xl sm:text-4xl text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {formatArea(portfolioStats.totalBuiltUp, displayUnit)}
            </p>
            <p className="text-xs text-[#6B6B6B] font-light">
              Computed across all active floor plates
            </p>
          </div>

          <div className="p-6 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#6B6B6B]">
              <span>Configured Elevations</span>
              <Layers className="w-4 h-4 text-[#C5A880]" />
            </div>
            <p
              className="font-serif text-3xl sm:text-4xl text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {portfolioStats.totalFloors} Floor Plates
            </p>
            <p className="text-xs text-[#6B6B6B] font-light">
              {portfolioStats.totalRooms} total architectural room zones
            </p>
          </div>

          <div className="p-6 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#6B6B6B]">
              <span>Valuation Engine Link</span>
              <Sparkles className="w-4 h-4 text-[#C5A880]" />
            </div>
            <p
              className="font-serif text-3xl sm:text-4xl text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Ready • 12 Features
            </p>
            <p className="text-xs text-[#6B6B6B] font-light">
              Separate Cost Takeoff & HMX Market Valuation
            </p>
          </div>
        </div>

        {/* Workspace Navigation Tabs & Filter Bar */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E7E7] pb-4">
            {/* Section Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("recent")}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-medium transition-colors inline-flex items-center gap-2 ${
                  activeTab === "recent"
                    ? "bg-[#111111] text-white"
                    : "bg-[#F7F7F5] text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Projects ({projects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-medium transition-colors inline-flex items-center gap-2 ${
                  activeTab === "saved"
                    ? "bg-[#111111] text-white"
                    : "bg-[#F7F7F5] text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Saved Designs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("templates")}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-medium transition-colors inline-flex items-center gap-2 ${
                  activeTab === "templates"
                    ? "bg-[#111111] text-white"
                    : "bg-[#F7F7F5] text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Architectural Presets</span>
              </button>
            </div>

            {/* Search & Floor Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#6B6B6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search project or location..."
                  className="w-full bg-[#F7F7F5] border border-[#E7E7E7] rounded-full pl-9 pr-4 py-2 text-xs text-[#111111] outline-none focus:bg-white focus:border-[#111111] transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#F7F7F5] border border-[#E7E7E7] rounded-full p-1">
                {(["all", "1", "2", "3+"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFloorFilter(lvl)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      floorFilter === lvl
                        ? "bg-white text-[#111111] shadow-sm border border-[#E7E7E7]"
                        : "text-[#6B6B6B] hover:text-[#111111]"
                    }`}
                  >
                    {lvl === "all" ? "All Floors" : `${lvl} Flr`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Projects Grid (Recent or Saved) */}
          {activeTab !== "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Create New Home Quick Card */}
              <Link
                href="/home-studio/new"
                className="group rounded-[20px] border-2 border-dashed border-[#DFDFDC] hover:border-[#C5A880] bg-[#F7F7F5]/60 hover:bg-[#F7F7F5] p-8 flex flex-col items-center justify-center text-center min-h-[380px] transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-white border border-[#E7E7E7] flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 group-hover:border-[#C5A880] transition-all">
                  <Plus className="w-7 h-7 text-[#111111] group-hover:text-[#C5A880] transition-colors" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#6B6B6B] font-medium mb-2">
                  New CAD / BIM Workspace
                </span>
                <h3
                  className="font-serif text-3xl text-[#111111] mb-3"
                  style={{
                    fontFamily:
                      "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  Create New Home
                </h3>
                <p className="text-xs text-[#6B6B6B] font-light max-w-xs leading-relaxed mb-6">
                  Configure plot dimensions in feet or metres, set municipal
                  setbacks, road orientation, and multi-floor levels.
                </p>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-[#111111] border-b border-[#111111] pb-1 group-hover:text-[#C5A880] group-hover:border-[#C5A880] transition-colors">
                  <span>Configure Plot & Levels</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              {/* Existing Project Cards */}
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  displayUnit={displayUnit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Architectural Starter Presets Tab */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  id: "modern_villa_3bhk" as const,
                  title: "Contemporary Courtyard 3BHK Villa",
                  subtitle: "50' × 80' Plot • Ground + First Floor",
                  width: 50,
                  length: 80,
                  floors: ["ground", "first"] as ("ground" | "first")[],
                  features: [
                    "Double-height living & dining core",
                    "Vastu-compliant north-east entrance",
                    "4,280 sq ft total built-up envelope",
                  ],
                },
                {
                  id: "executive_duplex_4bhk" as const,
                  title: "Modernist 4BHK Tri-Level Residence",
                  subtitle: "60' × 90' Plot • Basement + Ground + 1st",
                  width: 60,
                  length: 90,
                  floors: ["basement", "ground", "first"] as (
                    | "basement"
                    | "ground"
                    | "first"
                  )[],
                  features: [
                    "Subterranean parking & media lounge",
                    "Cantilevered upper terrace & study",
                    "8,160 sq ft multi-floor built-up area",
                  ],
                },
                {
                  id: "compact_courtyard_2bhk" as const,
                  title: "Urban Verandah Single-Story Bungalow",
                  subtitle: "40' × 60' Plot • Ground Floor Only",
                  width: 40,
                  length: 60,
                  floors: ["ground"] as "ground"[],
                  features: [
                    "Barrier-free single-level circulation",
                    "Cross-ventilated bedrooms & kitchen",
                    "1,568 sq ft efficient footprint",
                  ],
                },
              ].map((tpl) => (
                <div
                  key={tpl.id}
                  className="luxury-card p-7 flex flex-col justify-between space-y-6 bg-white border border-[#E7E7E7]"
                >
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-[#F7F7F5] border border-[#E7E7E7] text-[10px] uppercase tracking-[0.18em] text-[#6B6B6B] font-medium inline-block">
                      Verified Architectural Preset
                    </span>
                    <h3
                      className="font-serif text-2xl sm:text-3xl text-[#111111]"
                      style={{
                        fontFamily:
                          "var(--font-cormorant), Cormorant Garamond, serif",
                      }}
                    >
                      {tpl.title}
                    </h3>
                    <p className="text-xs font-mono text-[#C5A880]">
                      {tpl.subtitle} ({formatDimension(tpl.width, displayUnit)} ×{" "}
                      {formatDimension(tpl.length, displayUnit)})
                    </p>

                    <ul className="space-y-2 pt-2 border-t border-[#E7E7E7]">
                      {tpl.features.map((feat, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs text-[#6B6B6B]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A880] flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleLaunchTemplate(
                        tpl.id,
                        tpl.title,
                        tpl.width,
                        tpl.length,
                        tpl.floors
                      )
                    }
                    className="luxury-button-primary w-full text-xs uppercase tracking-wider py-3.5"
                  >
                    <span>Initialize Project from Preset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Architectural Standards & HMX Valuation Notice */}
        <div className="p-8 sm:p-10 rounded-[24px] bg-[#F7F7F5] border border-[#E7E7E7] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#C5A880] font-medium">
              Unified Architectural & Valuation Workflow
            </span>
            <h3
              className="font-serif text-2xl sm:text-3xl text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Real-World CAD Geometry Meets Empirical Market Intelligence
            </h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] font-light leading-relaxed">
              Every project in HMX Home Studio stores geometry in canonical
              real-world dimensions. Construction quantity takeoffs and HMX
              machine learning market valuations are maintained as distinct,
              transparent analytical pipelines.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3">
            <Link
              href="/home-studio/new"
              className="luxury-button-primary text-xs uppercase tracking-wider px-6 py-3.5"
            >
              <span>Start Blank Plot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/predict"
              className="luxury-button-secondary text-xs uppercase tracking-wider px-6 py-3.5"
            >
              <span>Valuation Studio</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

