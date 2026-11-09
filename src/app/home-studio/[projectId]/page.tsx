"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  Copy,
  Download,
  DoorOpen,
  Layers,
  MapPin,
  Maximize2,
  Minus,
  MousePointer,
  PenTool,
  Plus,
  Redo2,
  RotateCcw,
  Ruler,
  Square,
  Trash2,
  Undo2,
  CheckCircle2,
  Columns,
  Box,
  SplitSquareVertical,
  Calculator,
  TrendingUp,
  FileText,
} from "lucide-react";
import {
  EditorTool,
  OpeningType,
  Point2D,
  RoomType,
} from "@/types/homeStudio";
import {
  STARTER_HOME_PROJECTS,
  calculateProjectMetrics,
  duplicateHomeStudioProject,
  getHomeStudioProjectById,
} from "@/data/homeStudioProjects";
import {
  useHomeStudioStore,
  selectActiveProject,
  selectSelectedFloor,
  selectDisplayUnit,
  selectCanUndo,
  selectCanRedo,
} from "@/store/useHomeStudioStore";
import {
  formatArchitecturalArea,
  formatArchitecturalLength,
} from "@/lib/home-studio/units";
import {
  calculateConstructionEstimate,
  formatConstructionCurrency,
} from "@/lib/home-studio/costEngine";
import PropertiesPanel2D from "@/components/home-studio/PropertiesPanel2D";
import FloorManagerPanel from "@/components/home-studio/FloorManagerPanel";
import FurnitureMaterialLibraryPanel from "@/components/home-studio/FurnitureMaterialLibraryPanel";
import AuthAndPersistenceModal from "@/components/home-studio/AuthAndPersistenceModal";
import { ROOM_TYPE_DEFAULTS } from "@/components/home-studio/FloorPlanCanvas2D";

const FloorPlanCanvas2D = dynamic(
  () => import("@/components/home-studio/FloorPlanCanvas2D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] bg-[#F7F7F5] rounded-2xl border border-[#E7E7E7] flex items-center justify-center">
        <span className="text-xs font-mono text-[#6B6B6B]">
          Initializing React Konva 2D Architectural Engine...
        </span>
      </div>
    ),
  }
);

const HomeBuilder3D = dynamic(
  () => import("@/components/home-studio/3d/HomeBuilder3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] bg-[#F7F7F5] rounded-2xl border border-[#E7E7E7] flex items-center justify-center">
        <span className="text-xs font-mono text-[#6B6B6B]">
          Initializing Three.js Real-Time 3D Architectural Engine...
        </span>
      </div>
    ),
  }
);

const ConstructionCostDashboard = dynamic(
  () => import("@/components/home-studio/ConstructionCostDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] bg-[#F7F7F5] rounded-2xl border border-[#E7E7E7] flex items-center justify-center">
        <span className="text-xs font-mono text-[#6B6B6B]">
          Initializing Quantity Takeoff & Construction Cost Engine...
        </span>
      </div>
    ),
  }
);

const ValuationComparisonPanel = dynamic(
  () => import("@/components/home-studio/ValuationComparisonPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] bg-[#F7F7F5] rounded-2xl border border-[#E7E7E7] flex items-center justify-center">
        <span className="text-xs font-mono text-[#6B6B6B]">
          Initializing HMX Property Valuation Bridge...
        </span>
      </div>
    ),
  }
);

const ReportCenter = dynamic(
  () => import("@/components/home-studio/ReportCenter"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] bg-[#F7F7F5] rounded-2xl border border-[#E7E7E7] flex items-center justify-center">
        <span className="text-xs font-mono text-[#6B6B6B]">
          Initializing A4 Architectural & BOQ PDF Report Center...
        </span>
      </div>
    ),
  }
);

const DRAWING_TOOLS: {
  id: EditorTool;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "select", label: "Select / Move", shortcut: "V", icon: MousePointer },
  { id: "wall", label: "Draw Wall", shortcut: "W", icon: PenTool },
  { id: "room", label: "Draw Room", shortcut: "R", icon: Square },
  { id: "door", label: "Place Door", shortcut: "D", icon: DoorOpen },
  { id: "window", label: "Place Window", shortcut: "N", icon: Columns },
  { id: "measure", label: "Measure Tape", shortcut: "M", icon: Ruler },
  { id: "delete", label: "Delete Element", shortcut: "Del", icon: Trash2 },
];

export default function HomeStudioProjectWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params?.projectId || "";

  // Editor Local Sub-Tool Configurations
  const [activeRoomType, setActiveRoomType] = useState<RoomType>("living_room");
  const [activeOpeningType, setActiveOpeningType] =
    useState<OpeningType>("door");
  const [wallThicknessFt, setWallThicknessFt] = useState<number>(0.75);
  const [wallHeightFt, setWallHeightFt] = useState<number>(10.5);

  // Canvas Viewport State
  const [zoom, setZoom] = useState<number>(1.0);
  const [stageOffset, setStageOffset] = useState<Point2D>({ x: 90, y: 55 });
  const [cursorFt, setCursorFt] = useState<Point2D>({ x: 0, y: 0 });
  const [showReferenceUnderlay, setShowReferenceUnderlay] =
    useState<boolean>(true);
  const [referenceFloorId, setReferenceFloorId] = useState<string>("");
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.3);
  const [statusNotice, setStatusNotice] = useState<string | null>(
    "Ready. Select a CAD tool on the left or click any room, wall, or opening to inspect."
  );

  // Store Selectors
  const project = useHomeStudioStore(selectActiveProject);
  const activeFloor = useHomeStudioStore(selectSelectedFloor);
  const displayUnit = useHomeStudioStore(selectDisplayUnit);
  const canUndo = useHomeStudioStore(selectCanUndo);
  const canRedo = useHomeStudioStore(selectCanRedo);
  const activeTool = useHomeStudioStore((s) => s.activeTool);
  const activeTab = useHomeStudioStore((s) => s.activeTab);
  const selectedIds = useHomeStudioStore((s) => s.selectedObjectIds);
  const lastValidationError = useHomeStudioStore((s) => s.lastValidationError);

  const setActiveProject = useHomeStudioStore((s) => s.setActiveProject);
  const setSelectedFloorId = useHomeStudioStore((s) => s.setSelectedFloorId);
  const setSelectedObjectIds = useHomeStudioStore(
    (s) => s.setSelectedObjectIds
  );
  const setDisplayUnit = useHomeStudioStore((s) => s.setDisplayUnit);
  const setActiveTool = useHomeStudioStore((s) => s.setActiveTool);
  const setActiveTab = useHomeStudioStore((s) => s.setActiveTab);
  const undo = useHomeStudioStore((s) => s.undo);
  const redo = useHomeStudioStore((s) => s.redo);
  const deleteSelectedObjects = useHomeStudioStore(
    (s) => s.deleteSelectedObjects
  );
  const copySelectedObjects = useHomeStudioStore((s) => s.copySelectedObjects);
  const pasteClipboardObjects = useHomeStudioStore(
    (s) => s.pasteClipboardObjects
  );
  const duplicateSelectedObjects = useHomeStudioStore(
    (s) => s.duplicateSelectedObjects
  );
  const exportProjectJson = useHomeStudioStore((s) => s.exportProjectJson);

  // Load project on mount
  useEffect(() => {
    const found =
      getHomeStudioProjectById(projectId) || STARTER_HOME_PROJECTS[0];
    setActiveProject(found, false);
  }, [projectId, setActiveProject]);

  // Global CAD Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        const count = copySelectedObjects();
        if (count > 0) setStatusNotice(`Copied ${count} object(s) to clipboard.`);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const ids = pasteClipboardObjects();
        if (ids.length > 0) setStatusNotice(`Pasted ${ids.length} object(s).`);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const ids = duplicateSelectedObjects();
        if (ids.length > 0)
          setStatusNotice(`Duplicated ${ids.length} object(s).`);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (deleteSelectedObjects()) {
          setStatusNotice("Removed selected architectural element(s).");
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "v") setActiveTool("select");
      else if (key === "w") setActiveTool("wall");
      else if (key === "r") setActiveTool("room");
      else if (key === "d") {
        setActiveTool("door");
        setActiveOpeningType("door");
      } else if (key === "n") {
        setActiveTool("window");
        setActiveOpeningType("window");
      } else if (key === "m") setActiveTool("measure");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    copySelectedObjects,
    pasteClipboardObjects,
    duplicateSelectedObjects,
    deleteSelectedObjects,
    setActiveTool,
  ]);

  if (!project) {
    return (
      <div className="bg-white min-h-screen pt-32 pb-24 px-6 flex items-center justify-center">
        <p className="text-sm text-[#6B6B6B] font-mono">
          Loading HMX Home Studio Project...
        </p>
      </div>
    );
  }

  const metrics = calculateProjectMetrics(project);
  const liveEstimate = calculateConstructionEstimate(project);
  const activeFloorAreaSqFt = activeFloor.rooms.reduce(
    (acc, r) => acc + (r.dimensions?.area || 0),
    0
  );

  const handleDuplicateProject = () => {
    const dup = duplicateHomeStudioProject(project.id);
    if (dup) {
      router.push(`/home-studio/${dup.id}`);
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportProjectJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}-v${project.version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetView = () => {
    setZoom(1.0);
    setStageOffset({ x: 90, y: 55 });
  };

  return (
    <div className="bg-white min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-10">
      <div className="max-w-[1440px] mx-auto space-y-5">
        {/* 1. TOP ARCHITECTURAL CAD TOOLBAR */}
        <div className="p-4 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/home-studio"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E7E7E7] text-xs uppercase tracking-wider font-medium text-[#111111] hover:border-[#111111] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Studio</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="font-serif text-xl sm:text-2xl text-[#111111]"
                  style={{
                    fontFamily:
                      "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  {project.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E7E7E7] text-[10px] font-mono text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Saved v{project.version}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#6B6B6B]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#C5A880]" />
                  {project.location}
                </span>
                <span>•</span>
                <span className="font-mono">
                  Plot: {formatArchitecturalLength(project.plot.width, displayUnit)}{" "}
                  × {formatArchitecturalLength(project.plot.length, displayUnit)}
                </span>
              </div>
            </div>
          </div>

          {/* Workspace Mode Switcher, Floor Selector, Undo/Redo, Zoom, Unit Switcher & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Workspace View Mode Switcher (2D Plan | Split 2D+3D | 3D View | Construction Cost | HMX Valuation | PDF Reports) */}
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-white border border-[#E7E7E7]">
              {(
                [
                  { id: "2d", label: "2D Plan", icon: Compass },
                  {
                    id: "split",
                    label: "Split 2D + 3D",
                    icon: SplitSquareVertical,
                  },
                  { id: "3d", label: "3D View", icon: Box },
                  {
                    id: "cost",
                    label: "Construction Cost",
                    icon: Calculator,
                  },
                  {
                    id: "valuation",
                    label: "HMX Valuation",
                    icon: TrendingUp,
                  },
                  {
                    id: "export",
                    label: "PDF Reports",
                    icon: FileText,
                  },
                ] as const
              ).map((tab) => {
                const TabIcon = tab.icon;
                const isActive =
                  activeTab === tab.id ||
                  (tab.id === "2d" &&
                    activeTab !== "split" &&
                    activeTab !== "3d" &&
                    activeTab !== "cost" &&
                    activeTab !== "valuation" &&
                    activeTab !== "export");
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setStatusNotice(
                        `Switched workspace mode to ${tab.label}.`
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#111111] text-white"
                        : "text-[#6B6B6B] hover:text-[#111111]"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Phase 9 Authentication, Cloud Save & Version History Control */}
            <AuthAndPersistenceModal onStatusNotice={setStatusNotice} />

            {/* Floor Selector Pill */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-[#E7E7E7] rounded-full px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-[#C5A880]" />
              <select
                value={activeFloor.id}
                onChange={(e) => setSelectedFloorId(e.target.value)}
                className="text-xs font-medium text-[#111111] bg-transparent outline-none cursor-pointer"
              >
                {project.floors.map((flr) => (
                  <option key={flr.id} value={flr.id}>
                    {flr.name} (Elev {formatArchitecturalLength(flr.elevation, displayUnit)})
                  </option>
                ))}
              </select>
            </div>

            {/* Undo / Redo */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-[#E7E7E7]">
              <button
                type="button"
                onClick={() => undo()}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded-full text-[#111111] disabled:opacity-30 hover:bg-[#F7F7F5] transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => redo()}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="p-1.5 rounded-full text-[#111111] disabled:opacity-30 hover:bg-[#F7F7F5] transition-colors"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-[#E7E7E7]">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                title="Zoom Out"
                className="p-1.5 rounded-full text-[#111111] hover:bg-[#F7F7F5]"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-2 text-[#111111]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                title="Zoom In"
                className="p-1.5 rounded-full text-[#111111] hover:bg-[#F7F7F5]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                title="Reset Pan & Zoom"
                className="p-1.5 rounded-full text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F7F7F5]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Unit Selector */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-[#E7E7E7]">
              <button
                type="button"
                onClick={() => setDisplayUnit("ft")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  displayUnit === "ft"
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                ft / in
              </button>
              <button
                type="button"
                onClick={() => setDisplayUnit("m")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  displayUnit === "m"
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                m
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicateProject}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Duplicate</span>
            </button>
          </div>
        </div>

        {/* 2. MAIN CAD WORKSPACE, COST DASHBOARD, HMX VALUATION BRIDGE OR PDF REPORT CENTER */}
        {activeTab === "cost" ? (
          <ConstructionCostDashboard onStatusNotice={setStatusNotice} />
        ) : activeTab === "valuation" ? (
          <ValuationComparisonPanel onStatusNotice={setStatusNotice} />
        ) : activeTab === "export" ? (
          <ReportCenter onStatusNotice={setStatusNotice} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT DRAWING TOOLBAR */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#6B6B6B] font-medium block">
                2D CAD Tools
              </span>

              <div className="space-y-1.5">
                {DRAWING_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const active = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        setActiveTool(tool.id);
                        if (tool.id === "door") setActiveOpeningType("door");
                        if (tool.id === "window")
                          setActiveOpeningType("window");
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                        active
                          ? "bg-[#111111] text-white shadow-sm"
                          : "bg-white text-[#111111] border border-[#E7E7E7] hover:border-[#111111]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            active ? "text-[#C5A880]" : "text-[#6B6B6B]"
                          }`}
                        />
                        <span>{tool.label}</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          active ? "text-[#C5A880]" : "text-[#949494]"
                        }`}
                      >
                        {tool.shortcut}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Tool Configuration Card */}
            {activeTool === "room" && (
              <div className="p-4 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
                  New Room Preset
                </span>
                <select
                  value={activeRoomType}
                  onChange={(e) =>
                    setActiveRoomType(e.target.value as RoomType)
                  }
                  className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
                >
                  {(Object.keys(ROOM_TYPE_DEFAULTS) as RoomType[]).map((rt) => (
                    <option key={rt} value={rt}>
                      {ROOM_TYPE_DEFAULTS[rt].label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#6B6B6B] font-light">
                  Click & drag on the plot canvas to draw a{" "}
                  {ROOM_TYPE_DEFAULTS[activeRoomType].label}.
                </p>
              </div>
            )}

            {activeTool === "wall" && (
              <div className="p-4 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
                  Wall Specification
                </span>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#6B6B6B] block">
                    Thickness
                  </label>
                  <select
                    value={wallThicknessFt}
                    onChange={(e) => setWallThicknessFt(Number(e.target.value))}
                    className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#111111]"
                  >
                    <option value={0.375}>4.5&quot; Partition</option>
                    <option value={0.5}>6.0&quot; Interior</option>
                    <option value={0.75}>9.0&quot; Exterior</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#6B6B6B] block">
                    Height (ft)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={8}
                    max={20}
                    value={wallHeightFt}
                    onChange={(e) =>
                      setWallHeightFt(Number(e.target.value) || 10)
                    }
                    className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#111111]"
                  />
                </div>
              </div>
            )}

            {(activeTool === "door" || activeTool === "window") && (
              <div className="p-4 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-2.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
                  Opening Style
                </span>
                <select
                  value={activeOpeningType}
                  onChange={(e) =>
                    setActiveOpeningType(e.target.value as OpeningType)
                  }
                  className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
                >
                  {activeTool === "door" ? (
                    <>
                      <option value="door">Single Swing Door (3&apos;)</option>
                      <option value="double_door">
                        Double Entrance Door (5&apos;)
                      </option>
                      <option value="sliding_door">
                        Sliding Patio Door (5&apos;)
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="window">Single Casement Window (4&apos;)</option>
                      <option value="double_window">
                        Double Window (5&apos;)
                      </option>
                      <option value="sliding_window">
                        Sliding Window (5&apos;)
                      </option>
                      <option value="french_window">
                        French Picture Window (5&apos;)
                      </option>
                    </>
                  )}
                </select>
                <p className="text-[11px] text-[#6B6B6B] font-light">
                  Hover near any wall segment and click to insert opening.
                </p>
              </div>
            )}

            {/* Interior Design Studio: 17-Category Furniture Catalog, 15-Category Material Library & Lighting Studio */}
            <FurnitureMaterialLibraryPanel onStatusNotice={setStatusNotice} />
          </div>

          {/* CENTER 2D / 3D / SPLIT ARCHITECTURAL VIEWPORT */}
          <div className="lg:col-span-7 space-y-3">
            {activeTab === "3d" ? (
              <div className="rounded-[24px] overflow-hidden border border-[#E7E7E7] bg-[#F7F7F5] shadow-sm">
                <HomeBuilder3D onStatusNotice={setStatusNotice} />
              </div>
            ) : activeTab === "split" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="rounded-[24px] overflow-hidden border border-[#E7E7E7] bg-[#F7F7F5] shadow-sm">
                  <div className="px-3.5 py-2 bg-white border-b border-[#E7E7E7] flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B]">
                    <span>2D CAD Plan ({activeFloor.name})</span>
                    <span className="text-[#C5A880]">Live Master</span>
                  </div>
                  <FloorPlanCanvas2D
                    activeRoomType={activeRoomType}
                    activeOpeningType={activeOpeningType}
                    wallThicknessFt={wallThicknessFt}
                    wallHeightFt={wallHeightFt}
                    zoom={zoom}
                    setZoom={setZoom}
                    stageOffset={stageOffset}
                    setStageOffset={setStageOffset}
                    onCursorMoveFt={setCursorFt}
                    onStatusNotice={setStatusNotice}
                    showReferenceUnderlay={showReferenceUnderlay}
                    referenceFloorId={referenceFloorId}
                    ghostOpacity={ghostOpacity}
                  />
                </div>
                <div className="rounded-[24px] overflow-hidden border border-[#E7E7E7] bg-[#F7F7F5] shadow-sm">
                  <div className="px-3.5 py-2 bg-white border-b border-[#E7E7E7] flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#6B6B6B]">
                    <span>Real-Time 3D Model</span>
                    <span className="text-emerald-700">Synced</span>
                  </div>
                  <HomeBuilder3D onStatusNotice={setStatusNotice} />
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] overflow-hidden border border-[#E7E7E7] bg-[#F7F7F5] shadow-sm">
                <FloorPlanCanvas2D
                  activeRoomType={activeRoomType}
                  activeOpeningType={activeOpeningType}
                  wallThicknessFt={wallThicknessFt}
                  wallHeightFt={wallHeightFt}
                  zoom={zoom}
                  setZoom={setZoom}
                  stageOffset={stageOffset}
                  setStageOffset={setStageOffset}
                  onCursorMoveFt={setCursorFt}
                  onStatusNotice={setStatusNotice}
                  showReferenceUnderlay={showReferenceUnderlay}
                  referenceFloorId={referenceFloorId}
                  ghostOpacity={ghostOpacity}
                />
              </div>
            )}

            {/* BOTTOM CAD STATUS BAR */}
            <div className="px-4 py-2.5 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-3 text-[#111111]">
                <span className="font-mono uppercase px-2 py-0.5 rounded bg-white border border-[#E7E7E7] text-[#C5A880] font-semibold">
                  TOOL: {activeTool.toUpperCase()}
                </span>
                <span className="text-[#6B6B6B] truncate max-w-md">
                  {lastValidationError || statusNotice}
                </span>
              </div>

              <div className="flex items-center gap-4 font-mono text-[#6B6B6B]">
                <span>
                  X: {formatArchitecturalLength(cursorFt.x, displayUnit)} • Y:{" "}
                  {formatArchitecturalLength(cursorFt.y, displayUnit)}
                </span>
                <span>•</span>
                <span>
                  Floor Area:{" "}
                  <strong className="text-[#111111]">
                    {formatArchitecturalArea(activeFloorAreaSqFt, displayUnit)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Total Built-Up:{" "}
                  <strong className="text-[#C5A880]">
                    {formatArchitecturalArea(
                      metrics.totalBuiltUpAreaSqFt,
                      displayUnit
                    )}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT PROPERTIES, MULTI-FLOOR MANAGER & SCHEDULE PANEL */}
          <div className="lg:col-span-3 space-y-4">
            <FloorManagerPanel
              showReferenceUnderlay={showReferenceUnderlay}
              setShowReferenceUnderlay={setShowReferenceUnderlay}
              referenceFloorId={referenceFloorId}
              setReferenceFloorId={setReferenceFloorId}
              ghostOpacity={ghostOpacity}
              setGhostOpacity={setGhostOpacity}
              onStatusNotice={setStatusNotice}
            />

            <PropertiesPanel2D onStatusNotice={setStatusNotice} />

            {/* Floor Room & Wall Schedule */}
            <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-2.5">
                <span className="text-xs uppercase tracking-wider font-medium text-[#111111]">
                  {activeFloor.name} Schedule
                </span>
                <span className="text-[11px] font-mono text-[#6B6B6B]">
                  {activeFloor.rooms.length} Rms • {activeFloor.objects.length}{" "}
                  Items
                </span>
              </div>

              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {activeFloor.rooms.map((room) => {
                  const isSel = selectedIds.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedObjectIds([room.id])}
                      className={`w-full p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        isSel
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-white text-[#111111] border-[#E7E7E7] hover:border-[#111111]"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-medium block">
                          {room.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            isSel ? "text-[#C5A880]" : "text-[#6B6B6B]"
                          }`}
                        >
                          {formatArchitecturalLength(
                            room.dimensions.width,
                            displayUnit
                          )}{" "}
                          ×{" "}
                          {formatArchitecturalLength(
                            room.dimensions.length,
                            displayUnit
                          )}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium">
                        {formatArchitecturalArea(
                          room.dimensions.area,
                          displayUnit
                        )}
                      </span>
                    </button>
                  );
                })}

                {activeFloor.objects.map((obj) => {
                  const isSel = selectedIds.includes(obj.id);
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => setSelectedObjectIds([obj.id])}
                      className={`w-full p-2 rounded-xl border text-left transition-colors flex items-center justify-between ${
                        isSel
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-white text-[#111111] border-[#E7E7E7] hover:border-[#111111]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-medium block truncate">
                          {obj.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            isSel ? "text-[#C5A880]" : "text-[#6B6B6B]"
                          }`}
                        >
                          {obj.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono shrink-0">
                        {formatArchitecturalLength(
                          obj.dimensions.width,
                          displayUnit
                        )}{" "}
                        ×{" "}
                        {formatArchitecturalLength(
                          obj.dimensions.depth,
                          displayUnit
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Construction Cost & Quantity Takeoff Quick Summary Card */}
            <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-2.5">
                <span className="text-xs uppercase tracking-wider font-medium text-[#111111] inline-flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Live Cost Estimate</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-[#E7E7E7] text-[#C5A880]">
                  {liveEstimate.finishTier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[10px] uppercase text-[#6B6B6B] block">
                    Est. Base Cost
                  </span>
                  <span className="text-sm font-serif text-[#111111] font-semibold">
                    {formatConstructionCurrency(liveEstimate.finalEstimatedCostINR)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
                  <span className="text-[10px] uppercase text-[#6B6B6B] block">
                    Cost / Sq Ft
                  </span>
                  <span className="text-sm font-mono text-[#111111] font-medium">
                    ₹{liveEstimate.costPerSqFtINR.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("cost");
                  setStatusNotice(
                    "Opened Construction Quantity Takeoff & Cost Estimation Engine."
                  );
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Open Full BOQ & Cost Simulator</span>
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
