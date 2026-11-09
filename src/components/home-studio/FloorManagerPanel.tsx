"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Eye,
  EyeOff,
  GitCommitVertical,
  Layers,
  Lock,
  Plus,
  Trash2,
  Unlock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { FloorType, StaircaseType } from "@/types/homeStudio";
import {
  useHomeStudioStore,
  selectActiveProject,
  selectSelectedFloor,
  selectDisplayUnit,
} from "@/store/useHomeStudioStore";
import {
  formatArchitecturalArea,
  formatArchitecturalLength,
} from "@/lib/home-studio/units";
import {
  auditProjectStaircaseAlignment,
  computeMultiFloorStatistics,
  computeStaircaseSpecification,
  STAIRCASE_ENGINEERING_DISCLAIMER,
} from "@/lib/home-studio/staircase";

const FLOOR_TYPE_OPTIONS: { value: FloorType; label: string; badge: string }[] = [
  { value: "basement", label: "Basement Level", badge: "B" },
  { value: "ground", label: "Ground Floor", badge: "G" },
  { value: "first", label: "First Floor", badge: "1F" },
  { value: "second", label: "Second Floor", badge: "2F" },
  { value: "third", label: "Third Floor", badge: "3F" },
  { value: "rooftop", label: "Rooftop Terrace", badge: "RF" },
  { value: "custom", label: "Custom Floor", badge: "CF" },
];

const STAIR_TYPE_OPTIONS: { value: StaircaseType; label: string }[] = [
  { value: "straight", label: "Straight Flight Staircase" },
  { value: "l_shaped", label: "L-Shaped Quarter-Turn" },
  { value: "u_shaped", label: "U-Shaped Switchback" },
  { value: "spiral", label: "Spiral Helical Staircase" },
];

export interface FloorManagerPanelProps {
  showReferenceUnderlay: boolean;
  setShowReferenceUnderlay: (val: boolean) => void;
  referenceFloorId: string;
  setReferenceFloorId: (id: string) => void;
  ghostOpacity: number;
  setGhostOpacity: (val: number) => void;
  onStatusNotice: (msg: string | null) => void;
}

export default function FloorManagerPanel({
  showReferenceUnderlay,
  setShowReferenceUnderlay,
  referenceFloorId,
  setReferenceFloorId,
  ghostOpacity,
  setGhostOpacity,
  onStatusNotice,
}: FloorManagerPanelProps) {
  const project = useHomeStudioStore(selectActiveProject);
  const activeFloor = useHomeStudioStore(selectSelectedFloor);
  const displayUnit = useHomeStudioStore(selectDisplayUnit);

  const setSelectedFloorId = useHomeStudioStore((s) => s.setSelectedFloorId);
  const addFloor = useHomeStudioStore((s) => s.addFloor);
  const duplicateFloor = useHomeStudioStore((s) => s.duplicateFloor);
  const updateFloor = useHomeStudioStore((s) => s.updateFloor);
  const reorderFloor = useHomeStudioStore((s) => s.reorderFloor);
  const deleteFloor = useHomeStudioStore((s) => s.deleteFloor);
  const placeStaircaseCore = useHomeStudioStore((s) => s.placeStaircaseCore);
  const alignVerticalStructure = useHomeStudioStore(
    (s) => s.alignVerticalStructureAcrossFloors
  );

  // Add Floor state
  const [newFloorType, setNewFloorType] = useState<FloorType>("second");
  const [customFloorName, setCustomFloorName] = useState<string>("");

  // Staircase Designer state
  const [stairType, setStairType] = useState<StaircaseType>("u_shaped");
  const [stairWidthFt, setStairWidthFt] = useState<number>(3.5);
  const [treadDepthInches, setTreadDepthInches] = useState<number>(10.5);
  const [propagateStair, setPropagateStair] = useState<boolean>(true);

  const buildingStats = useMemo(
    () => computeMultiFloorStatistics(project),
    [project]
  );

  const stairAudit = useMemo(
    () => auditProjectStaircaseAlignment(project),
    [project]
  );

  const stairSpecPreview = useMemo(
    () =>
      computeStaircaseSpecification({
        stairType,
        widthFt: stairWidthFt,
        treadDepthInches,
        startingFloor: activeFloor,
      }),
    [stairType, stairWidthFt, treadDepthInches, activeFloor]
  );

  const activeFloorStat = useMemo(
    () =>
      buildingStats.floorStats.find((s) => s.floorId === activeFloor.id) ||
      buildingStats.floorStats[0],
    [buildingStats, activeFloor.id]
  );

  // Display floors in architectural stack order (highest level at top)
  const stackedFloors = useMemo(
    () => [...project.floors].sort((a, b) => b.levelIndex - a.levelIndex),
    [project.floors]
  );

  const handleAddFloor = () => {
    const created = addFloor(
      newFloorType,
      customFloorName.trim() || undefined
    );
    if (created) {
      setCustomFloorName("");
      onStatusNotice(
        `Added "${created.name}" at datum elevation ${formatArchitecturalLength(created.elevation, displayUnit)}.`
      );
    }
  };

  const handleDuplicateActiveFloor = () => {
    const nextType: FloorType =
      activeFloor.type === "ground"
        ? "first"
        : activeFloor.type === "first"
        ? "second"
        : activeFloor.type === "second"
        ? "third"
        : "custom";
    const dup = duplicateFloor(activeFloor.id, nextType);
    if (dup) {
      onStatusNotice(
        `Duplicated "${activeFloor.name}" layout to "${dup.name}".`
      );
    }
  };

  const handlePlaceStaircase = () => {
    const cx = Math.round(
      project.plot.width / 2 - stairSpecPreview.footprintWidthFt / 2
    );
    const cy = Math.round(
      project.plot.length / 2 - stairSpecPreview.footprintDepthFt / 2
    );
    const created = placeStaircaseCore(
      activeFloor.id,
      { x: cx, y: cy },
      propagateStair,
      {
        stairType,
        widthFt: stairWidthFt,
        treadDepthInches,
      }
    );
    if (created.length > 0) {
      onStatusNotice(
        `Placed ${stairType.replace("_", "-")} staircase (${stairSpecPreview.metadata.riserCount} risers @ ${stairSpecPreview.metadata.riserHeightInches}") across ${created.length} floor(s).`
      );
    }
  };

  const handleSyncVerticalCores = () => {
    const count = alignVerticalStructure(activeFloor.id);
    if (count > 0) {
      onStatusNotice(
        `Synchronized ${count} staircase/structural core element(s) across floors.`
      );
    } else {
      onStatusNotice(
        "All vertical staircases and structural cores are aligned across floors."
      );
    }
  };

  const plotW = Math.max(20, project.plot.width);
  const plotL = Math.max(20, project.plot.length);

  return (
    <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
      {/* Header & Building Summary Pill */}
      <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
            Multi-Floor Building System
          </span>
          <h3 className="font-serif text-xl text-[#111111]">
            Vertical Stack ({buildingStats.totalFloors} Levels)
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] text-[10px] font-mono text-[#111111]">
          H: {formatArchitecturalLength(buildingStats.totalBuildingHeightFt, displayUnit)}
        </span>
      </div>

      {/* Building-Wide Summary Strip */}
      <div className="grid grid-cols-4 gap-1.5 text-center p-2.5 rounded-xl bg-white border border-[#E7E7E7]">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-[#6B6B6B] block">
            Floors
          </span>
          <span className="text-xs font-mono font-semibold text-[#111111]">
            {buildingStats.totalFloors}
          </span>
        </div>
        <div className="border-x border-[#E7E7E7]">
          <span className="text-[9px] uppercase tracking-wider text-[#6B6B6B] block">
            Rooms
          </span>
          <span className="text-xs font-mono font-semibold text-[#111111]">
            {buildingStats.totalRooms}
          </span>
        </div>
        <div className="border-r border-[#E7E7E7]">
          <span className="text-[9px] uppercase tracking-wider text-[#6B6B6B] block">
            Stairs
          </span>
          <span className="text-xs font-mono font-semibold text-[#111111]">
            {buildingStats.totalStaircases}
          </span>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-wider text-[#6B6B6B] block">
            Built-Up
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#C5A880]">
            {Math.round(buildingStats.totalBuiltUpAreaSqFt).toLocaleString()} sf
          </span>
        </div>
      </div>

      {/* Vertical Floor Stack Cards with Mini SVG Thumbnails & Reorder Controls */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {stackedFloors.map((flr) => {
          const isCurrent = flr.id === activeFloor.id;
          const fStat = buildingStats.floorStats.find(
            (s) => s.floorId === flr.id
          );
          const badge =
            FLOOR_TYPE_OPTIONS.find((o) => o.value === flr.type)?.badge || "FL";

          return (
            <div
              key={flr.id}
              onClick={() => setSelectedFloorId(flr.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                isCurrent
                  ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                  : "bg-white text-[#111111] border-[#E7E7E7] hover:border-[#111111]"
              }`}
            >
              {/* Mini SVG Floor Plan Thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] border border-[#E7E7E7] flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
                <svg viewBox={`0 0 ${plotW} ${plotL}`} className="w-full h-full">
                  <rect
                    x={0}
                    y={0}
                    width={plotW}
                    height={plotL}
                    fill="#FFFFFF"
                    stroke="#111111"
                    strokeWidth={2}
                  />
                  {flr.rooms.map((rm) => {
                    const xs = rm.polygon.map((p) => p.x);
                    const ys = rm.polygon.map((p) => p.y);
                    const minX = Math.min(...xs);
                    const minY = Math.min(...ys);
                    return (
                      <rect
                        key={rm.id}
                        x={minX}
                        y={minY}
                        width={Math.max(2, Math.max(...xs) - minX)}
                        height={Math.max(2, Math.max(...ys) - minY)}
                        fill="#C5A880"
                        stroke="#111111"
                        strokeWidth={1.2}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Floor Name, Badge & Elevation Summary */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      isCurrent
                        ? "bg-[#C5A880] text-[#111111]"
                        : "bg-[#F7F7F5] text-[#6B6B6B]"
                    }`}
                  >
                    {badge}
                  </span>
                  <span className="text-xs font-medium truncate">
                    {flr.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono block mt-0.5 ${
                    isCurrent ? "text-[#C5A880]" : "text-[#6B6B6B]"
                  }`}
                >
                  Elev {formatArchitecturalLength(flr.elevation, displayUnit)} •{" "}
                  {formatArchitecturalArea(
                    fStat?.builtUpAreaSqFt || 0,
                    displayUnit
                  )}
                </span>
              </div>

              {/* Reorder, Visibility & Lock Controls */}
              <div
                className="flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => reorderFloor(flr.id, "up")}
                  title="Move Floor Up"
                  className={`p-1 rounded transition-colors ${
                    isCurrent
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-[#F7F7F5] text-[#6B6B6B]"
                  }`}
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => reorderFloor(flr.id, "down")}
                  title="Move Floor Down"
                  className={`p-1 rounded transition-colors ${
                    isCurrent
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-[#F7F7F5] text-[#6B6B6B]"
                  }`}
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateFloor(flr.id, { visible: !flr.visible })
                  }
                  title={flr.visible ? "Visible" : "Hidden"}
                  className={`p-1 rounded transition-colors ${
                    isCurrent
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-[#F7F7F5] text-[#6B6B6B]"
                  }`}
                >
                  {flr.visible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3 opacity-50" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => updateFloor(flr.id, { locked: !flr.locked })}
                  title={flr.locked ? "Locked" : "Unlocked"}
                  className={`p-1 rounded transition-colors ${
                    isCurrent
                      ? "hover:bg-white/10 text-white"
                      : "hover:bg-[#F7F7F5] text-[#6B6B6B]"
                  }`}
                >
                  {flr.locked ? (
                    <Lock className="w-3 h-3 text-[#C5A880]" />
                  ) : (
                    <Unlock className="w-3 h-3 opacity-60" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Floor Elevation, Slab & Statistics Inspector */}
      <div className="pt-3 border-t border-[#E7E7E7] space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
              Floor Name
            </label>
            <input
              type="text"
              value={activeFloor.name}
              onChange={(e) =>
                updateFloor(activeFloor.id, { name: e.target.value })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
              Floor Type
            </label>
            <select
              value={activeFloor.type}
              onChange={(e) =>
                updateFloor(activeFloor.id, {
                  type: e.target.value as FloorType,
                })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111]"
            >
              {FLOOR_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
              Ceiling (ft)
            </label>
            <input
              type="number"
              step={0.5}
              min={8}
              max={24}
              value={activeFloor.ceilingHeight}
              onChange={(e) =>
                updateFloor(activeFloor.id, {
                  ceilingHeight: Math.max(8, Number(e.target.value) || 10),
                })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
              Slab (ft)
            </label>
            <input
              type="number"
              step={0.1}
              min={0.3}
              max={2.5}
              value={activeFloor.floorHeight}
              onChange={(e) =>
                updateFloor(activeFloor.id, {
                  floorHeight: Math.max(0.3, Number(e.target.value) || 0.5),
                })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
              Datum (ft)
            </label>
            <input
              type="number"
              step={0.5}
              value={activeFloor.elevation}
              onChange={(e) =>
                updateFloor(activeFloor.id, {
                  elevation: Number(e.target.value) || 0,
                })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
            />
          </div>
        </div>

        {/* Active Floor Live Statistics */}
        {activeFloorStat && (
          <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7] grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">Carpet Area:</span>
              <span className="font-mono font-medium text-[#111111]">
                {formatArchitecturalArea(
                  activeFloorStat.carpetAreaSqFt,
                  displayUnit
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">Built-Up:</span>
              <span className="font-mono font-semibold text-[#C5A880]">
                {formatArchitecturalArea(
                  activeFloorStat.builtUpAreaSqFt,
                  displayUnit
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">Rooms / Walls:</span>
              <span className="font-mono text-[#111111]">
                {activeFloorStat.roomCount} / {activeFloorStat.wallCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">Openings:</span>
              <span className="font-mono text-[#111111]">
                {activeFloorStat.openingCount}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDuplicateActiveFloor}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate Floor</span>
          </button>

          {project.floors.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const name = activeFloor.name;
                if (deleteFloor(activeFloor.id)) {
                  onStatusNotice(`Deleted floor "${name}".`);
                }
              }}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-[#E7E7E7] text-red-700 hover:border-red-300 transition-colors"
              title="Delete Active Floor"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Add New Floor Section */}
      <div className="pt-3 border-t border-[#E7E7E7] space-y-2 text-xs">
        <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
          Add New Floor Level
        </span>
        <div className="flex items-center gap-2">
          <select
            value={newFloorType}
            onChange={(e) => setNewFloorType(e.target.value as FloorType)}
            className="flex-1 bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111]"
          >
            {FLOOR_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddFloor}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Add</span>
          </button>
        </div>
        {newFloorType === "custom" && (
          <input
            type="text"
            value={customFloorName}
            onChange={(e) => setCustomFloorName(e.target.value)}
            placeholder="Custom floor name (e.g. Mezzanine Floor)"
            className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111]"
          />
        )}
      </div>

      {/* Ghost Floor Underlay Controls */}
      <div className="pt-3 border-t border-[#E7E7E7] space-y-2.5 text-xs">
        <span className="text-[10px] uppercase tracking-wider text-[#C5A880] font-medium block">
          Ghost Floor Reference Underlay
        </span>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-[#6B6B6B]">Enable Reference Underlay</span>
          <input
            type="checkbox"
            checked={showReferenceUnderlay}
            onChange={(e) => setShowReferenceUnderlay(e.target.checked)}
            className="accent-[#111111]"
          />
        </label>

        {showReferenceUnderlay && project.floors.length > 1 && (
          <div className="space-y-2">
            <select
              value={referenceFloorId}
              onChange={(e) => setReferenceFloorId(e.target.value)}
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111]"
            >
              {project.floors
                .filter((f) => f.id !== activeFloor.id)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    Reference: {f.name}
                  </option>
                ))}
            </select>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                <span>Ghost Opacity</span>
                <span className="font-mono">{Math.round(ghostOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.65}
                step={0.05}
                value={ghostOpacity}
                onChange={(e) => setGhostOpacity(Number(e.target.value))}
                className="w-full accent-[#111111]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Staircase Designer & Vertical Alignment */}
      <div className="pt-3 border-t border-[#E7E7E7] space-y-3 text-xs">
        <span className="text-[10px] uppercase tracking-wider text-[#C5A880] font-medium block">
          Vertical Staircase Core Designer
        </span>

        <select
          value={stairType}
          onChange={(e) => setStairType(e.target.value as StaircaseType)}
          className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111]"
        >
          {STAIR_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-[#6B6B6B] block">
              Flight Width (ft)
            </label>
            <input
              type="number"
              step={0.25}
              min={2.5}
              max={6}
              value={stairWidthFt}
              onChange={(e) =>
                setStairWidthFt(Math.max(2.5, Number(e.target.value) || 3.5))
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#111111]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-[#6B6B6B] block">
              Tread Depth (in)
            </label>
            <input
              type="number"
              step={0.5}
              min={9}
              max={14}
              value={treadDepthInches}
              onChange={(e) =>
                setTreadDepthInches(Math.max(9, Number(e.target.value) || 10.5))
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#111111]"
            />
          </div>
        </div>

        {/* Live Riser / Tread / Footprint Readout */}
        <div className="p-2.5 rounded-xl bg-white border border-[#E7E7E7] space-y-1 text-[10px] font-mono text-[#6B6B6B]">
          <div className="flex justify-between">
            <span>Risers / Rise:</span>
            <span className="text-[#111111]">
              {stairSpecPreview.metadata.riserCount} ×{" "}
              {stairSpecPreview.metadata.riserHeightInches}&quot;
            </span>
          </div>
          <div className="flex justify-between">
            <span>Footprint:</span>
            <span className="text-[#111111]">
              {formatArchitecturalLength(
                stairSpecPreview.footprintWidthFt,
                displayUnit
              )}{" "}
              ×{" "}
              {formatArchitecturalLength(
                stairSpecPreview.footprintDepthFt,
                displayUnit
              )}
            </span>
          </div>
        </div>

        {/* Alignment Warnings if any */}
        {stairAudit.misalignedWarnings.length > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>{stairAudit.misalignedWarnings[0]}</span>
          </div>
        )}

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-[#6B6B6B]">Propagate Across All Floors</span>
          <input
            type="checkbox"
            checked={propagateStair}
            onChange={(e) => setPropagateStair(e.target.checked)}
            className="accent-[#111111]"
          />
        </label>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={handlePlaceStaircase}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Place Staircase Core</span>
          </button>

          <button
            type="button"
            onClick={handleSyncVerticalCores}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
          >
            <GitCommitVertical className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Align Vertical Cores Across Floors</span>
          </button>
        </div>

        <p className="text-[10px] text-[#8A8A86] leading-relaxed pt-1">
          {STAIRCASE_ENGINEERING_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
