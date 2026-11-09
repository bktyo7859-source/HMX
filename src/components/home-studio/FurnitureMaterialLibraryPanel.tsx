"use client";

import React, { useState } from "react";
import {
  Copy,
  Layers,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Sofa,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  ArchitecturalMaterialCategory,
  FurnitureCategory,
} from "@/types/homeStudio";
import {
  useHomeStudioStore,
  selectActiveProject,
  selectSelectedFloor,
  selectDisplayUnit,
} from "@/store/useHomeStudioStore";
import {
  buildFurnitureItemFromCatalogAsset,
  CatalogFurnitureAsset,
  FURNITURE_CATEGORY_META,
  getCatalogAssetsByCategory,
  MATERIAL_CATEGORY_META,
  validateFurniturePlacementFt,
} from "@/lib/home-studio/furnitureCatalog";
import { formatArchitecturalLength } from "@/lib/home-studio/units";

export default function FurnitureMaterialLibraryPanel({
  onStatusNotice,
}: {
  onStatusNotice: (msg: string | null) => void;
}) {
  const project = useHomeStudioStore(selectActiveProject);
  const activeFloor = useHomeStudioStore(selectSelectedFloor);
  const displayUnit = useHomeStudioStore(selectDisplayUnit);
  const selectedIds = useHomeStudioStore((s) => s.selectedObjectIds);

  const addFurniture = useHomeStudioStore((s) => s.addFurniture);
  const setSelectedObjectIds = useHomeStudioStore(
    (s) => s.setSelectedObjectIds
  );
  const updateSettings = useHomeStudioStore((s) => s.updateSettings);
  const assignMaterialToSelectedSurface = useHomeStudioStore(
    (s) => s.assignMaterialToSelectedSurface
  );
  const addOrUpdateMaterial = useHomeStudioStore((s) => s.addOrUpdateMaterial);
  const duplicateMaterial = useHomeStudioStore((s) => s.duplicateMaterial);
  const resetMaterialToDefault = useHomeStudioStore(
    (s) => s.resetMaterialToDefault
  );

  const [panelTab, setPanelTab] = useState<
    "furniture" | "materials" | "lighting"
  >("furniture");
  const [selectedCategory, setSelectedCategory] = useState<
    FurnitureCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMaterialCat, setSelectedMaterialCat] = useState<
    ArchitecturalMaterialCategory | "all"
  >("all");
  const [roomSurfaceTarget, setRoomSurfaceTarget] = useState<
    "room_floor" | "room_wall" | "room_ceiling"
  >("room_floor");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(
    null
  );

  const catalogItems = getCatalogAssetsByCategory(
    selectedCategory,
    searchQuery
  );

  const filteredMaterials = project.materials.filter((m) =>
    selectedMaterialCat === "all" ? true : m.category === selectedMaterialCat
  );

  const editingMaterial = project.materials.find(
    (m) => m.id === editingMaterialId
  );

  const handlePlaceAsset = (asset: CatalogFurnitureAsset) => {
    const payload = buildFurnitureItemFromCatalogAsset(
      asset,
      activeFloor,
      project.plot.width,
      project.plot.length
    );
    const check = validateFurniturePlacementFt({
      floor: activeFloor,
      plotWidth: project.plot.width,
      plotLength: project.plot.length,
      candidateX: payload.position.x,
      candidateZ: payload.position.z,
      widthFt: payload.dimensions.width,
      depthFt: payload.dimensions.depth,
      snapToGrid: project.plot.snapToGrid,
      gridSizeFt: project.plot.gridSize,
      snapToWall: asset.collisionFootprint.snapToWall,
      allowOutsideRoom: Boolean(payload.allowOutsideRoom),
    });

    payload.position.x = check.snappedPositionFt.x;
    payload.position.z = check.snappedPositionFt.z;

    const created = addFurniture(payload);
    if (created) {
      setSelectedObjectIds([created.id]);
      onStatusNotice(
        check.warningMessage ||
          `Placed "${created.name}" on ${activeFloor.name}. Drag on 2D canvas or use 3D transform controls to adjust.`
      );
    }
  };

  return (
    <div className="p-4 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3.5">
      {/* Studio Sub-Navigation (Furniture | Materials | Lighting) */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white border border-[#E7E7E7]">
        {(
          [
            { id: "furniture", label: "Furniture", icon: Sofa },
            { id: "materials", label: "Materials", icon: Palette },
            { id: "lighting", label: "Lighting", icon: Sun },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = panelTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setPanelTab(t.id)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition-colors inline-flex items-center justify-center gap-1 ${
                active
                  ? "bg-[#111111] text-white"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              <Icon className="w-3 h-3 text-[#C5A880]" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: 17-CATEGORY FURNITURE LIBRARY */}
      {panelTab === "furniture" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B6B6B] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search beds, sofas, kitchen..."
              className="w-full bg-white border border-[#E7E7E7] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-[#111111] outline-none focus:border-[#111111]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(
                e.target.value as FurnitureCategory | "all"
              )
            }
            className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111] outline-none"
          >
            <option value="all">
              All 17 Categories ({ARCHITECTURAL_FURNITURE_CATALOG_COUNT} Assets)
            </option>
            {FURNITURE_CATEGORY_META.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          <label className="flex items-center justify-between text-[11px] text-[#6B6B6B] cursor-pointer px-1">
            <span>Show 2D Plan Symbols</span>
            <input
              type="checkbox"
              checked={project.settings.showFurniture2D}
              onChange={(e) =>
                updateSettings({ showFurniture2D: e.target.checked })
              }
              className="accent-[#111111]"
            />
          </label>

          {/* Draggable & Click-to-Place Asset Cards */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {catalogItems.map((asset) => (
              <div
                key={asset.assetId}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/hmx-furniture-asset-id",
                    asset.assetId
                  );
                  onStatusNotice(
                    `Dragging "${asset.name}" — drop inside any room on the 2D floor plan.`
                  );
                }}
                className="p-2.5 rounded-xl bg-white border border-[#E7E7E7] hover:border-[#111111] transition-all space-y-2 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-2.5">
                  {/* Blueprint SVG Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] border border-[#E7E7E7] flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 32 32"
                      className="w-6 h-6 stroke-[#111111] fill-none"
                      strokeWidth={1.5}
                    >
                      <path d={asset.thumbnailSvg} />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#111111] block truncate">
                      {asset.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#6B6B6B] block">
                      {formatArchitecturalLength(
                        asset.dimensions.width,
                        displayUnit
                      )}{" "}
                      ×{" "}
                      {formatArchitecturalLength(
                        asset.dimensions.depth,
                        displayUnit
                      )}{" "}
                      • H{" "}
                      {formatArchitecturalLength(
                        asset.dimensions.height,
                        displayUnit
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F2F2EE]">
                  <span className="text-[10px] font-mono text-[#C5A880] uppercase">
                    {asset.complexityLevel.replace("_", " ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePlaceAsset(asset)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111111] text-white text-[10px] font-medium hover:bg-[#262626] transition-colors"
                  >
                    <Plus className="w-3 h-3 text-[#C5A880]" />
                    <span>Place</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: 15-CATEGORY ARCHITECTURAL MATERIAL LIBRARY */}
      {panelTab === "materials" && (
        <div className="space-y-3">
          <select
            value={selectedMaterialCat}
            onChange={(e) =>
              setSelectedMaterialCat(
                e.target.value as ArchitecturalMaterialCategory | "all"
              )
            }
            className="w-full bg-white border border-[#E7E7E7] rounded-xl px-2.5 py-1.5 text-xs text-[#111111] outline-none"
          >
            <option value="all">
              All 15 Material Categories ({project.materials.length})
            </option>
            {MATERIAL_CATEGORY_META.map((mc) => (
              <option key={mc.id} value={mc.id}>
                {mc.label}
              </option>
            ))}
          </select>

          {/* Target Surface Selector when a Room is selected */}
          <div className="p-2 rounded-xl bg-white border border-[#E7E7E7] space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
              Room Surface Target
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: "room_floor", label: "Floor" },
                  { id: "room_wall", label: "Walls" },
                  { id: "room_ceiling", label: "Ceiling" },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setRoomSurfaceTarget(st.id)}
                  className={`py-1 rounded-lg text-[10px] font-medium transition-colors ${
                    roomSurfaceTarget === st.id
                      ? "bg-[#111111] text-white"
                      : "bg-[#F7F7F5] text-[#6B6B6B] hover:text-[#111111]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Swatch List */}
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {filteredMaterials.map((mat) => (
              <div
                key={mat.id}
                className="p-2.5 rounded-xl bg-white border border-[#E7E7E7] hover:border-[#111111] transition-colors space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingMaterialId(mat.id)}
                    className="w-8 h-8 rounded-lg border border-[#111111]/20 shrink-0 shadow-inner"
                    style={{ backgroundColor: mat.color }}
                    title="Click to customize material color & repeat scale"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#111111] block truncate">
                      {mat.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#6B6B6B] block">
                      ₹{mat.unitCostPerSqFt}/sqft • R:{mat.roughness} M:
                      {mat.metalness}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#F2F2EE]">
                  <button
                    type="button"
                    onClick={() => setEditingMaterialId(mat.id)}
                    className="text-[10px] text-[#6B6B6B] hover:text-[#111111] font-mono"
                  >
                    Customize
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedIds.length === 0) {
                        onStatusNotice(
                          "Select a room, wall, door/window, or furniture object first to apply this material."
                        );
                        return;
                      }
                      const ok = assignMaterialToSelectedSurface(
                        mat.id,
                        roomSurfaceTarget
                      );
                      if (ok) {
                        onStatusNotice(
                          `Applied "${mat.name}" to selected surface.`
                        );
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#111111] text-white text-[10px] font-medium hover:bg-[#262626]"
                  >
                    Apply to Selected
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Material Customizer (Color, Scale, Duplicate, Reset) */}
          {editingMaterial && (
            <div className="p-3 rounded-xl bg-white border border-[#C5A880] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#C5A880]">
                  PBR Material Editor
                </span>
                <button
                  type="button"
                  onClick={() => setEditingMaterialId(null)}
                  className="text-[10px] text-[#6B6B6B] hover:text-[#111111]"
                >
                  Close
                </button>
              </div>
              <span className="font-medium text-[#111111] block truncate">
                {editingMaterial.name}
              </span>

              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-[#6B6B6B]">Base Color</label>
                <input
                  type="color"
                  value={editingMaterial.color}
                  onChange={(e) =>
                    addOrUpdateMaterial({
                      ...editingMaterial,
                      color: e.target.value,
                    })
                  }
                  className="w-8 h-6 rounded border border-[#E7E7E7] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                  <span>Texture Scale</span>
                  <span className="font-mono">
                    {editingMaterial.repeatScale || 1}x
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={editingMaterial.repeatScale || 1}
                  onChange={(e) =>
                    addOrUpdateMaterial({
                      ...editingMaterial,
                      repeatScale: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#111111]"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const dup = duplicateMaterial(editingMaterial.id);
                    if (dup) {
                      setEditingMaterialId(dup.id);
                      onStatusNotice(`Duplicated material "${dup.name}".`);
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#F7F7F5] border border-[#E7E7E7] text-[10px] font-medium text-[#111111]"
                >
                  <Copy className="w-3 h-3" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetMaterialToDefault(editingMaterial.id);
                    onStatusNotice(`Reset "${editingMaterial.name}" to default.`);
                  }}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#F7F7F5] border border-[#E7E7E7] text-[10px] font-medium text-[#6B6B6B] hover:text-[#111111]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ARCHITECTURAL LIGHTING STUDIO */}
      {panelTab === "lighting" && (
        <div className="space-y-3 text-xs">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#C5A880] font-medium block">
            Daylight & Interior Luminaires
          </span>

          {/* Time-of-Day Presets */}
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                {
                  label: "Morning 08:30",
                  hours: 8.5,
                  az: 95,
                  el: 32,
                  day: 1.0,
                  amb: 0.72,
                },
                {
                  label: "Solar Noon 12:30",
                  hours: 12.5,
                  az: 180,
                  el: 72,
                  day: 1.25,
                  amb: 0.85,
                },
                {
                  label: "Golden Hour 17:30",
                  hours: 17.5,
                  az: 255,
                  el: 22,
                  day: 1.1,
                  amb: 0.65,
                },
                {
                  label: "Evening 20:00",
                  hours: 20.0,
                  az: 290,
                  el: 12,
                  day: 0.35,
                  amb: 0.45,
                },
              ] as const
            ).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  updateSettings({
                    timeOfDayHours: preset.hours,
                    sunAzimuth: preset.az,
                    sunElevation: preset.el,
                    daylightIntensity: preset.day,
                    ambientLightIntensity: preset.amb,
                    interiorLightsEnabled: true,
                  });
                  onStatusNotice(`Applied ${preset.label} lighting preset.`);
                }}
                className="p-2 rounded-xl bg-white border border-[#E7E7E7] text-[10px] font-medium text-[#111111] hover:border-[#111111] text-left transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-white border border-[#E7E7E7]">
            <div>
              <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                <span>Daylight Sun Intensity</span>
                <span className="font-mono">
                  {(project.settings.daylightIntensity ?? 1.15).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.4}
                step={0.05}
                value={project.settings.daylightIntensity ?? 1.15}
                onChange={(e) =>
                  updateSettings({ daylightIntensity: Number(e.target.value) })
                }
                className="w-full accent-[#111111]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                <span>Ambient Fill Intensity</span>
                <span className="font-mono">
                  {project.settings.ambientLightIntensity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.8}
                step={0.05}
                value={project.settings.ambientLightIntensity}
                onChange={(e) =>
                  updateSettings({
                    ambientLightIntensity: Number(e.target.value),
                  })
                }
                className="w-full accent-[#111111]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                <span>Sun Azimuth Angle</span>
                <span className="font-mono">{project.settings.sunAzimuth}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={project.settings.sunAzimuth}
                onChange={(e) =>
                  updateSettings({ sunAzimuth: Number(e.target.value) })
                }
                className="w-full accent-[#111111]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-[#6B6B6B]">
                <span>Sun Elevation Altitude</span>
                <span className="font-mono">
                  {project.settings.sunElevation}°
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={88}
                step={2}
                value={project.settings.sunElevation}
                onChange={(e) =>
                  updateSettings({ sunElevation: Number(e.target.value) })
                }
                className="w-full accent-[#111111]"
              />
            </div>

            <label className="flex items-center justify-between pt-1 border-t border-[#F2F2EE] cursor-pointer">
              <span className="text-[11px] text-[#111111]">
                Interior Fixture Point Lights
              </span>
              <input
                type="checkbox"
                checked={project.settings.interiorLightsEnabled ?? true}
                onChange={(e) =>
                  updateSettings({ interiorLightsEnabled: e.target.checked })
                }
                className="accent-[#111111]"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

const ARCHITECTURAL_FURNITURE_CATALOG_COUNT = 20;

