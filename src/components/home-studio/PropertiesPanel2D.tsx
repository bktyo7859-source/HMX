"use client";

import React from "react";
import {
  ArrowUpDown,
  Compass,
  Copy,
  DoorOpen,
  Layers,
  Maximize2,
  Ruler,
  Trash2,
} from "lucide-react";
import {
  CardinalDirection,
  OpeningType,
  RoadSide,
  RoomType,
  StaircaseType,
} from "@/types/homeStudio";
import {
  useHomeStudioStore,
  selectActiveProject,
  selectSelectedFloor,
  selectDisplayUnit,
} from "@/store/useHomeStudioStore";
import {
  formatArchitecturalArea,
  formatArchitecturalLength,
  computePolygonBoundsFt,
  roundToPrecision,
} from "@/lib/home-studio/units";
import {
  computeWallLengthFt,
  validateOpeningOnWall,
} from "@/lib/home-studio/geometry2d";
import {
  computeStaircaseSpecification,
  STAIRCASE_ENGINEERING_DISCLAIMER,
} from "@/lib/home-studio/staircase";
import { ROOM_TYPE_DEFAULTS } from "./FloorPlanCanvas2D";

const ROOM_TYPES_LIST: RoomType[] = [
  "living_room",
  "dining_room",
  "master_bedroom",
  "bedroom",
  "kitchen",
  "bathroom",
  "study_room",
  "balcony",
  "garage",
  "utility_room",
  "storage_room",
  "custom_room",
];

const OPENING_TYPES_LIST: { value: OpeningType; label: string }[] = [
  { value: "door", label: "Single Door" },
  { value: "double_door", label: "Double Door" },
  { value: "sliding_door", label: "Sliding Door" },
  { value: "window", label: "Single Window" },
  { value: "double_window", label: "Double Window" },
  { value: "sliding_window", label: "Sliding Window" },
  { value: "french_window", label: "French Picture Window" },
  { value: "ventilator", label: "Bath Ventilator" },
];

export default function PropertiesPanel2D({
  onStatusNotice,
}: {
  onStatusNotice: (msg: string | null) => void;
}) {
  const project = useHomeStudioStore(selectActiveProject);
  const activeFloor = useHomeStudioStore(selectSelectedFloor);
  const displayUnit = useHomeStudioStore(selectDisplayUnit);
  const selectedIds = useHomeStudioStore((s) => s.selectedObjectIds);

  const updateRoom = useHomeStudioStore((s) => s.updateRoom);
  const deleteRoom = useHomeStudioStore((s) => s.deleteRoom);
  const updateWall = useHomeStudioStore((s) => s.updateWall);
  const deleteWall = useHomeStudioStore((s) => s.deleteWall);
  const updateOpening = useHomeStudioStore((s) => s.updateOpening);
  const deleteOpening = useHomeStudioStore((s) => s.deleteOpening);
  const updateFurniture = useHomeStudioStore((s) => s.updateFurniture);
  const deleteFurniture = useHomeStudioStore((s) => s.deleteFurniture);
  const updatePlotConfig = useHomeStudioStore((s) => s.updatePlotConfig);
  const duplicateSelected = useHomeStudioStore(
    (s) => s.duplicateSelectedObjects
  );
  const deleteSelected = useHomeStudioStore((s) => s.deleteSelectedObjects);

  const primarySelectedId = selectedIds[0];

  const selectedRoom = activeFloor.rooms.find(
    (r) => r.id === primarySelectedId
  );
  const selectedWall = activeFloor.walls.find(
    (w) => w.id === primarySelectedId
  );
  const selectedOpening = activeFloor.openings.find(
    (o) => o.id === primarySelectedId
  );
  const selectedObject = activeFloor.objects.find(
    (obj) => obj.id === primarySelectedId
  );

  // 1. Multi-Selection Inspector
  if (selectedIds.length > 1) {
    return (
      <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
        <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
          <span className="text-xs uppercase tracking-wider font-medium text-[#111111]">
            Multi-Selection ({selectedIds.length} Objects)
          </span>
          <Layers className="w-4 h-4 text-[#C5A880]" />
        </div>

        <p className="text-xs text-[#6B6B6B] font-light leading-relaxed">
          {selectedIds.length} architectural elements selected on{" "}
          {activeFloor.name}. Use keyboard shortcuts or actions below to
          duplicate or remove them together.
        </p>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              const ids = duplicateSelected();
              onStatusNotice(`Duplicated ${ids.length} selected objects.`);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate All</span>
          </button>

          <button
            type="button"
            onClick={() => {
              deleteSelected();
              onStatusNotice("Deleted selected objects.");
            }}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-red-700 hover:border-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Room Properties Inspector
  if (selectedRoom) {
    const bounds = computePolygonBoundsFt(selectedRoom.polygon);
    return (
      <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
        <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
              Room Properties
            </span>
            <h3 className="font-serif text-xl text-[#111111]">
              {selectedRoom.name}
            </h3>
          </div>
          <Maximize2 className="w-4 h-4 text-[#C5A880]" />
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Room Label
            </label>
            <input
              type="text"
              value={selectedRoom.name}
              onChange={(e) =>
                updateRoom(selectedRoom.id, { name: e.target.value })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#111111]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Room Classification
            </label>
            <select
              value={selectedRoom.type}
              onChange={(e) => {
                const newType = e.target.value as RoomType;
                const meta = ROOM_TYPE_DEFAULTS[newType];
                updateRoom(selectedRoom.id, {
                  type: newType,
                  color: meta.color,
                  floorMaterialId: meta.defaultMaterial,
                });
              }}
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#111111]"
            >
              {ROOM_TYPES_LIST.map((rt) => (
                <option key={rt} value={rt}>
                  {ROOM_TYPE_DEFAULTS[rt].label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Width (ft)
              </label>
              <input
                type="number"
                step={0.5}
                min={3}
                max={project.plot.width - bounds.minX}
                value={selectedRoom.dimensions.width}
                onChange={(e) => {
                  const w = Math.max(3, Number(e.target.value) || 3);
                  const l = selectedRoom.dimensions.length;
                  updateRoom(selectedRoom.id, {
                    dimensions: {
                      width: w,
                      length: l,
                      area: roundToPrecision(w * l, 2),
                    },
                  });
                }}
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Length (ft)
              </label>
              <input
                type="number"
                step={0.5}
                min={3}
                max={project.plot.length - bounds.minY}
                value={selectedRoom.dimensions.length}
                onChange={(e) => {
                  const l = Math.max(3, Number(e.target.value) || 3);
                  const w = selectedRoom.dimensions.width;
                  updateRoom(selectedRoom.id, {
                    dimensions: {
                      width: w,
                      length: l,
                      area: roundToPrecision(w * l, 2),
                    },
                  });
                }}
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E7E7E7] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#6B6B6B]">Formatted Dimensions</span>
              <span className="font-mono font-medium text-[#111111]">
                {formatArchitecturalLength(
                  selectedRoom.dimensions.width,
                  displayUnit
                )}{" "}
                ×{" "}
                {formatArchitecturalLength(
                  selectedRoom.dimensions.length,
                  displayUnit
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B6B6B]">Computed Room Area</span>
              <span className="font-mono font-semibold text-[#C5A880]">
                {formatArchitecturalArea(
                  selectedRoom.dimensions.area,
                  displayUnit
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B6B6B]">Assigned Floor</span>
              <span className="font-mono text-[#111111]">
                {activeFloor.name}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Flooring Material
            </label>
            <select
              value={selectedRoom.floorMaterialId}
              onChange={(e) => {
                const mat = project.materials.find(
                  (m) => m.id === e.target.value
                );
                updateRoom(selectedRoom.id, {
                  floorMaterialId: e.target.value,
                  color: mat?.color || selectedRoom.color,
                });
              }}
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#111111]"
            >
              {project.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (₹{m.unitCostPerSqFt}/sqft)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
                Room Wall Finish
              </label>
              <select
                value={selectedRoom.wallMaterialId}
                onChange={(e) =>
                  updateRoom(selectedRoom.id, {
                    wallMaterialId: e.target.value,
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-[11px] text-[#111111] outline-none"
              >
                {project.materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
                Ceiling Finish
              </label>
              <select
                value={
                  selectedRoom.ceilingMaterialId || selectedRoom.wallMaterialId
                }
                onChange={(e) =>
                  updateRoom(selectedRoom.id, {
                    ceilingMaterialId: e.target.value,
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-[11px] text-[#111111] outline-none"
              >
                {project.materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                duplicateSelected();
                onStatusNotice(`Duplicated "${selectedRoom.name}".`);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                deleteRoom(selectedRoom.id);
                onStatusNotice(`Deleted "${selectedRoom.name}".`);
              }}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-red-700 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Wall Properties Inspector
  if (selectedWall) {
    const currentLen = computeWallLengthFt(selectedWall);
    const dx = selectedWall.endPoint.x - selectedWall.startPoint.x;
    const dy = selectedWall.endPoint.y - selectedWall.startPoint.y;

    const handleWallLengthChange = (newLenFt: number) => {
      if (newLenFt < 0.5 || currentLen < 0.01) return;
      const ratio = newLenFt / currentLen;
      const newEndX = roundToPrecision(
        Math.min(
          project.plot.width,
          Math.max(0, selectedWall.startPoint.x + dx * ratio)
        ),
        2
      );
      const newEndY = roundToPrecision(
        Math.min(
          project.plot.length,
          Math.max(0, selectedWall.startPoint.y + dy * ratio)
        ),
        2
      );
      updateWall(selectedWall.id, {
        endPoint: { x: newEndX, y: newEndY },
      });
    };

    return (
      <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
        <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
              Structural Wall Segment
            </span>
            <h3 className="font-serif text-xl text-[#111111]">
              {formatArchitecturalLength(currentLen, displayUnit)} Wall
            </h3>
          </div>
          <Ruler className="w-4 h-4 text-[#C5A880]" />
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Wall Length (ft)
            </label>
            <input
              type="number"
              step={0.5}
              min={1}
              max={200}
              value={currentLen}
              onChange={(e) => handleWallLengthChange(Number(e.target.value))}
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Thickness (ft)
              </label>
              <select
                value={selectedWall.thickness}
                onChange={(e) =>
                  updateWall(selectedWall.id, {
                    thickness: Number(e.target.value),
                    isExterior: Number(e.target.value) >= 0.65,
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
              >
                <option value={0.375}>4.5&quot; (0.375 ft) Partition</option>
                <option value={0.5}>6.0&quot; (0.50 ft) Internal</option>
                <option value={0.75}>9.0&quot; (0.75 ft) Exterior</option>
                <option value={1.0}>12.0&quot; (1.00 ft) Load-Bearing</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Wall Height (ft)
              </label>
              <input
                type="number"
                step={0.5}
                min={7}
                max={24}
                value={selectedWall.height}
                onChange={(e) =>
                  updateWall(selectedWall.id, {
                    height: Math.max(7, Number(e.target.value) || 10),
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Wall Finish Material
            </label>
            <select
              value={selectedWall.materialId}
              onChange={(e) =>
                updateWall(selectedWall.id, { materialId: e.target.value })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#111111]"
            >
              {project.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              deleteWall(selectedWall.id);
              onStatusNotice("Deleted wall segment.");
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-red-700 hover:border-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Wall</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Door / Window Opening Inspector
  if (selectedOpening) {
    const hostWall = activeFloor.walls.find(
      (w) => w.id === selectedOpening.wallId
    );

    return (
      <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
        <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
              Wall-Hosted Opening
            </span>
            <h3 className="font-serif text-xl text-[#111111]">
              {selectedOpening.name}
            </h3>
          </div>
          <DoorOpen className="w-4 h-4 text-[#C5A880]" />
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Opening Type
            </label>
            <select
              value={selectedOpening.type}
              onChange={(e) => {
                const nextType = e.target.value as OpeningType;
                updateOpening(selectedOpening.id, {
                  type: nextType,
                  name: nextType.replace("_", " ").toUpperCase(),
                });
              }}
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#111111]"
            >
              {OPENING_TYPES_LIST.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Width (ft)
              </label>
              <input
                type="number"
                step={0.5}
                min={1.5}
                max={16}
                value={selectedOpening.width}
                onChange={(e) => {
                  const newW = Math.max(1.5, Number(e.target.value) || 3);
                  if (hostWall) {
                    const check = validateOpeningOnWall(
                      hostWall,
                      activeFloor.openings.filter(
                        (o) => o.wallId === hostWall.id
                      ),
                      selectedOpening.position,
                      newW,
                      selectedOpening.id
                    );
                    if (!check.valid) {
                      onStatusNotice(
                        check.reason || "Opening width exceeds wall bounds."
                      );
                      return;
                    }
                    updateOpening(selectedOpening.id, {
                      width: newW,
                      position: check.clampedPosition,
                      offsetFromStart: check.offsetFromStartFt,
                    });
                  }
                }}
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Height (ft)
              </label>
              <input
                type="number"
                step={0.5}
                min={2}
                max={12}
                value={selectedOpening.height}
                onChange={(e) =>
                  updateOpening(selectedOpening.id, {
                    height: Math.max(2, Number(e.target.value) || 7),
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111] outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] flex justify-between">
              <span>Position Along Wall</span>
              <span className="font-mono text-[#111111]">
                {Math.round(selectedOpening.position * 100)}% (
                {formatArchitecturalLength(
                  selectedOpening.offsetFromStart,
                  displayUnit
                )}
                )
              </span>
            </label>
            <input
              type="range"
              min={0.08}
              max={0.92}
              step={0.02}
              value={selectedOpening.position}
              onChange={(e) => {
                const nextPos = Number(e.target.value);
                if (!hostWall) return;
                const check = validateOpeningOnWall(
                  hostWall,
                  activeFloor.openings.filter((o) => o.wallId === hostWall.id),
                  nextPos,
                  selectedOpening.width,
                  selectedOpening.id
                );
                if (check.valid) {
                  updateOpening(selectedOpening.id, {
                    position: check.clampedPosition,
                    offsetFromStart: check.offsetFromStartFt,
                  });
                } else {
                  onStatusNotice(check.reason || "Opening collision detected.");
                }
              }}
              className="w-full accent-[#111111] cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              deleteOpening(selectedOpening.id);
              onStatusNotice(`Deleted ${selectedOpening.name}.`);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-red-700 hover:border-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Opening</span>
          </button>
        </div>
      </div>
    );
  }

  // 4B. Staircase / Interior Object Inspector
  if (selectedObject) {
    const isStair = selectedObject.category === "staircases";
    const meta = selectedObject.stairMetadata;

    return (
      <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
        <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
              {isStair ? "Vertical Staircase Core" : "Interior Object"}
            </span>
            <h3 className="font-serif text-xl text-[#111111]">
              {selectedObject.name}
            </h3>
          </div>
          <ArrowUpDown className="w-4 h-4 text-[#C5A880]" />
        </div>

        <div className="space-y-3 text-xs">
          {isStair && meta && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                  Staircase Configuration
                </label>
                <select
                  value={meta.stairType}
                  onChange={(e) => {
                    const nextType = e.target.value as StaircaseType;
                    const spec = computeStaircaseSpecification({
                      stairType: nextType,
                      widthFt: meta.widthFt,
                      treadDepthInches: meta.treadDepthInches,
                      startingFloor: activeFloor,
                    });
                    updateFurniture(selectedObject.id, {
                      stairMetadata: spec.metadata,
                      dimensions: {
                        width: spec.footprintWidthFt,
                        depth: spec.footprintDepthFt,
                        height: spec.metadata.totalRiseFt,
                      },
                    });
                  }}
                  className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111]"
                >
                  <option value="straight">Straight Flight</option>
                  <option value="l_shaped">L-Shaped Quarter-Turn</option>
                  <option value="u_shaped">U-Shaped Switchback</option>
                  <option value="spiral">Spiral Helical</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E7E7E7] space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Total Rise:</span>
                  <span className="text-[#111111]">
                    {formatArchitecturalLength(meta.totalRiseFt, displayUnit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Risers / Height:</span>
                  <span className="text-[#111111]">
                    {meta.riserCount} × {meta.riserHeightInches}&quot;
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Tread Depth:</span>
                  <span className="text-[#111111]">
                    {meta.treadDepthInches}&quot;
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Headroom:</span>
                  <span className="text-emerald-700">
                    {formatArchitecturalLength(
                      meta.headroomClearanceFt,
                      displayUnit
                    )}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Position X (ft)
              </label>
              <input
                type="number"
                step={0.5}
                value={selectedObject.position.x}
                onChange={(e) =>
                  updateFurniture(selectedObject.id, {
                    position: {
                      ...selectedObject.position,
                      x: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Position Z (ft)
              </label>
              <input
                type="number"
                step={0.5}
                value={selectedObject.position.z}
                onChange={(e) =>
                  updateFurniture(selectedObject.id, {
                    position: {
                      ...selectedObject.position,
                      z: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Rotation (deg)
              </label>
              <select
                value={selectedObject.rotation}
                onChange={(e) =>
                  updateFurniture(selectedObject.id, {
                    rotation: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111]"
              >
                <option value={0}>0° North</option>
                <option value={45}>45° NE</option>
                <option value={90}>90° East</option>
                <option value={135}>135° SE</option>
                <option value={180}>180° South</option>
                <option value={225}>225° SW</option>
                <option value={270}>270° West</option>
                <option value={315}>315° NW</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                Elevation Y (ft)
              </label>
              <input
                type="number"
                step={0.5}
                min={0}
                max={14}
                value={selectedObject.position.y}
                onChange={(e) =>
                  updateFurniture(selectedObject.id, {
                    position: {
                      ...selectedObject.position,
                      y: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111]"
              />
            </div>
          </div>

          {!isStair && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#6B6B6B] block">
                    Width (ft)
                  </label>
                  <input
                    type="number"
                    step={0.25}
                    min={0.5}
                    max={30}
                    value={selectedObject.dimensions.width}
                    onChange={(e) =>
                      updateFurniture(selectedObject.id, {
                        dimensions: {
                          ...selectedObject.dimensions,
                          width: Math.max(0.5, Number(e.target.value) || 1),
                        },
                      })
                    }
                    className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#6B6B6B] block">
                    Length (ft)
                  </label>
                  <input
                    type="number"
                    step={0.25}
                    min={0.5}
                    max={30}
                    value={selectedObject.dimensions.depth}
                    onChange={(e) =>
                      updateFurniture(selectedObject.id, {
                        dimensions: {
                          ...selectedObject.dimensions,
                          depth: Math.max(0.5, Number(e.target.value) || 1),
                        },
                      })
                    }
                    className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#6B6B6B] block">
                    Height (ft)
                  </label>
                  <input
                    type="number"
                    step={0.25}
                    min={0.5}
                    max={15}
                    value={selectedObject.dimensions.height}
                    onChange={(e) =>
                      updateFurniture(selectedObject.id, {
                        dimensions: {
                          ...selectedObject.dimensions,
                          height: Math.max(0.5, Number(e.target.value) || 1),
                        },
                      })
                    }
                    className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2 py-1.5 text-xs font-mono text-[#111111]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
                  Surface Material & Finish
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedObject.materialId}
                    onChange={(e) => {
                      const mat = project.materials.find(
                        (m) => m.id === e.target.value
                      );
                      updateFurniture(selectedObject.id, {
                        materialId: e.target.value,
                        color: mat?.color || selectedObject.color,
                      });
                    }}
                    className="flex-1 bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-2 text-xs text-[#111111]"
                  >
                    {project.materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={selectedObject.color || "#C5A880"}
                    onChange={(e) =>
                      updateFurniture(selectedObject.id, {
                        color: e.target.value,
                      })
                    }
                    title="Custom Surface Color"
                    className="w-8 h-8 rounded-lg border border-[#E7E7E7] cursor-pointer"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between pt-1 cursor-pointer">
                <span className="text-[11px] text-[#6B6B6B]">
                  Allow Outdoor / Terrace Placement
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedObject.allowOutsideRoom)}
                  onChange={(e) =>
                    updateFurniture(selectedObject.id, {
                      allowOutsideRoom: e.target.checked,
                    })
                  }
                  className="accent-[#111111]"
                />
              </label>
            </>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                duplicateSelected();
                onStatusNotice(`Duplicated "${selectedObject.name}".`);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                deleteFurniture(selectedObject.id);
                onStatusNotice(`Deleted ${selectedObject.name}.`);
              }}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-red-700 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          {isStair && (
            <p className="text-[10px] text-[#8A8A86] leading-relaxed">
              {STAIRCASE_ENGINEERING_DISCLAIMER}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 5. Default Plot & Floor Inspector when nothing is selected
  return (
    <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
      <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
            Plot & Grid Configuration
          </span>
          <h3 className="font-serif text-xl text-[#111111]">
            Site Envelope Settings
          </h3>
        </div>
        <Compass className="w-4 h-4 text-[#C5A880]" />
      </div>

      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Plot Width (ft)
            </label>
            <input
              type="number"
              min={20}
              max={300}
              value={project.plot.width}
              onChange={(e) =>
                updatePlotConfig({
                  width: Math.max(20, Number(e.target.value) || 40),
                })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Plot Length (ft)
            </label>
            <input
              type="number"
              min={20}
              max={300}
              value={project.plot.length}
              onChange={(e) =>
                updatePlotConfig({
                  length: Math.max(20, Number(e.target.value) || 60),
                })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs font-mono text-[#111111]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              North Compass
            </label>
            <select
              value={project.plot.northDirection}
              onChange={(e) =>
                updatePlotConfig({
                  northDirection: e.target.value as CardinalDirection,
                })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111]"
            >
              {(["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const).map(
                (d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block">
              Road Facing
            </label>
            <select
              value={project.plot.roadFacing}
              onChange={(e) =>
                updatePlotConfig({ roadFacing: e.target.value as RoadSide })
              }
              className="w-full bg-white border border-[#E7E7E7] rounded-xl px-3 py-2 text-xs text-[#111111]"
            >
              <option value="north">North</option>
              <option value="east">East</option>
              <option value="south">South</option>
              <option value="west">West</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E7E7E7] space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[#6B6B6B]">Show Architectural Grid</span>
            <input
              type="checkbox"
              checked={project.plot.showGrid}
              onChange={(e) => updatePlotConfig({ showGrid: e.target.checked })}
              className="accent-[#111111]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[#6B6B6B]">Snap to Grid ({project.plot.gridSize}&apos;)</span>
            <input
              type="checkbox"
              checked={project.plot.snapToGrid}
              onChange={(e) =>
                updatePlotConfig({ snapToGrid: e.target.checked })
              }
              className="accent-[#111111]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[#6B6B6B]">Snap to Wall Endpoints</span>
            <input
              type="checkbox"
              checked={project.plot.snapToWall}
              onChange={(e) =>
                updatePlotConfig({ snapToWall: e.target.checked })
              }
              className="accent-[#111111]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

