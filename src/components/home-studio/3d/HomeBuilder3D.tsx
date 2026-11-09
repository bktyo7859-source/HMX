"use client";

import React, {
  Component,
  ErrorInfo,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import {
  AlertTriangle,
  Box,
  Compass,
  Home,
  Layers,
  RotateCcw,
  Scissors,
  UserCheck,
} from "lucide-react";
import { ViewMode3D } from "@/types/homeStudio";
import {
  useHomeStudioStore,
  selectActiveProject,
  selectSelectedFloor,
  selectDisplayUnit,
} from "@/store/useHomeStudioStore";
import {
  deriveBuildingSceneMeshes3D,
  RoofStyle3D,
} from "@/lib/home-studio/geometry3d";
import { formatArchitecturalLength } from "@/lib/home-studio/units";
import SceneLightingAndGround from "./SceneLightingAndGround";
import BuildingMeshes3D from "./BuildingMeshes3D";

// WebGL Error Boundary for graceful fallback if hardware acceleration / WebGL is unavailable
class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("WebGL 3D Viewport Fallback triggered:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function CameraController({
  viewMode,
  plotW,
  plotL,
  activeFloorElevation,
  resetTick,
}: {
  viewMode: ViewMode3D;
  plotW: number;
  plotL: number;
  activeFloorElevation: number;
  resetTick: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const cx = plotW / 2;
    const cz = plotL / 2;

    if (viewMode === "top_ortho") {
      camera.position.set(cx, Math.max(plotW, plotL) * 1.65, cz + 0.01);
      camera.lookAt(cx, activeFloorElevation, cz);
    } else if (viewMode === "dollhouse") {
      camera.position.set(
        cx + plotW * 0.65,
        Math.max(plotW, plotL) * 1.15,
        cz + plotL * 0.75
      );
      camera.lookAt(cx, activeFloorElevation, cz);
    } else if (viewMode === "walkthrough") {
      camera.position.set(cx, activeFloorElevation + 5.5, cz + plotL * 0.22);
      camera.lookAt(cx, activeFloorElevation + 5.5, cz - 10);
    } else if (viewMode === "floor_isolation") {
      camera.position.set(
        cx + plotW * 0.8,
        activeFloorElevation + 38,
        cz + plotL * 0.8
      );
      camera.lookAt(cx, activeFloorElevation + 4, cz);
    } else {
      camera.position.set(cx + plotW * 0.9, 46, cz + plotL * 0.95);
      camera.lookAt(cx, 8, cz);
    }
  }, [viewMode, plotW, plotL, activeFloorElevation, resetTick, camera]);

  return null;
}

export default function HomeBuilder3D({
  onStatusNotice,
  heightClass = "h-[640px]",
}: {
  onStatusNotice?: (msg: string | null) => void;
  heightClass?: string;
}) {
  const project = useHomeStudioStore(selectActiveProject);
  const activeFloor = useHomeStudioStore(selectSelectedFloor);
  const displayUnit = useHomeStudioStore(selectDisplayUnit);
  const viewMode3D = useHomeStudioStore((s) => s.viewMode3D);
  const selectedIds = useHomeStudioStore((s) => s.selectedObjectIds);

  const setViewMode3D = useHomeStudioStore((s) => s.setViewMode3D);
  const setSelectedObjectIds = useHomeStudioStore(
    (s) => s.setSelectedObjectIds
  );
  const updateSettings = useHomeStudioStore((s) => s.updateSettings);
  const updateFurniture = useHomeStudioStore((s) => s.updateFurniture);
  const deleteFurniture = useHomeStudioStore((s) => s.deleteFurniture);

  const selectedFurniture3D = activeFloor.objects.find(
    (o) => o.id === selectedIds[0]
  );

  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [sectionCutFt, setSectionCutFt] = useState<number>(
    project.settings.sectionCutHeight || 16
  );
  const [explodedStack, setExplodedStack] = useState<boolean>(false);
  const [roofStyle, setRoofStyle] = useState<RoofStyle3D>("parapet");
  const [cameraResetTick, setCameraResetTick] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setWebglSupported(Boolean(gl));
    } catch {
      setWebglSupported(false);
    }
  }, []);

  const sceneMeshes = useMemo(
    () =>
      deriveBuildingSceneMeshes3D(project, {
        viewMode: viewMode3D,
        selectedFloorId: activeFloor.id,
        sectionCutHeightFt: sectionCutFt,
        explodedFloorGapFt: explodedStack ? 6.5 : 0,
        roofStyle,
      }),
    [
      project,
      viewMode3D,
      activeFloor.id,
      sectionCutFt,
      explodedStack,
      roofStyle,
    ]
  );

  const plotW = project.plot.width;
  const plotL = project.plot.length;

  const fallbackUI = (
    <div
      className={`w-full ${heightClass} rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] p-8 flex flex-col items-center justify-center text-center space-y-3`}
    >
      <AlertTriangle className="w-8 h-8 text-[#C5A880]" />
      <h3 className="font-serif text-2xl text-[#111111]">
        WebGL 3D Hardware Acceleration Unavailable
      </h3>
      <p className="text-xs text-[#6B6B6B] max-w-md leading-relaxed">
        Your current browser environment does not have WebGL enabled. All 2D CAD
        floor planning, multi-floor stacking, and quantity takeoff calculations
        remain 100% active.
      </p>
    </div>
  );

  if (!webglSupported) {
    return fallbackUI;
  }

  return (
    <div
      className={`relative w-full ${heightClass} bg-[#F7F7F5] overflow-hidden select-none`}
    >
      {/* Top 3D View Mode Controls Overlay */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-white/95 border border-[#E7E7E7] shadow-sm pointer-events-auto">
          {(
            [
              { id: "orbit", label: "3D Orbit", icon: Box },
              { id: "dollhouse", label: "Dollhouse", icon: Home },
              { id: "floor_isolation", label: "Isolate Floor", icon: Layers },
              { id: "section", label: "Section Cut", icon: Scissors },
              { id: "walkthrough", label: "Walkthrough", icon: UserCheck },
              { id: "top_ortho", label: "Top Ortho", icon: Compass },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = viewMode3D === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setViewMode3D(m.id);
                  onStatusNotice?.(`Switched 3D camera to ${m.label} mode.`);
                }}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors inline-flex items-center gap-1.5 ${
                  active
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                <Icon className="w-3 h-3 text-[#C5A880]" />
                <span>{m.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setCameraResetTick((t) => t + 1);
              onStatusNotice?.("Reset 3D camera target and orbit position.");
            }}
            title="Reset 3D Camera"
            className="p-1.5 rounded-full text-[#6B6B6B] hover:text-[#111111] hover:bg-[#F7F7F5] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Roof Controls, Exploded Stack & Section Cut Slider */}
        <div className="inline-flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/95 border border-[#E7E7E7] shadow-sm pointer-events-auto text-[11px]">
          {viewMode3D === "section" && (
            <div className="flex items-center gap-2 pr-2 border-r border-[#E7E7E7]">
              <span className="text-[#6B6B6B] font-mono">
                Cut: {formatArchitecturalLength(sectionCutFt, displayUnit)}
              </span>
              <input
                type="range"
                min={2}
                max={45}
                step={0.5}
                value={sectionCutFt}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSectionCutFt(val);
                  updateSettings({ sectionCutHeight: val });
                }}
                className="w-20 accent-[#111111]"
              />
            </div>
          )}

          {project.floors.length > 1 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-[#111111] pr-2 border-r border-[#E7E7E7]">
              <input
                type="checkbox"
                checked={explodedStack}
                onChange={(e) => setExplodedStack(e.target.checked)}
                className="accent-[#111111]"
              />
              <span>Explode Floors</span>
            </label>
          )}

          <label className="flex items-center gap-1.5 cursor-pointer text-[#111111]">
            <input
              type="checkbox"
              checked={project.settings.showRoof3D}
              onChange={(e) =>
                updateSettings({ showRoof3D: e.target.checked })
              }
              className="accent-[#111111]"
            />
            <span>Roof</span>
          </label>

          {project.settings.showRoof3D && (
            <select
              value={roofStyle}
              onChange={(e) => setRoofStyle(e.target.value as RoofStyle3D)}
              className="bg-[#F7F7F5] border border-[#E7E7E7] rounded-full px-2 py-0.5 text-[10px] font-medium text-[#111111] outline-none"
            >
              <option value="parapet">Parapet Roof</option>
              <option value="flat">Flat Slab</option>
              <option value="gable">Gable Crown</option>
              <option value="hip">Hip Crown</option>
            </select>
          )}
        </div>
      </div>

      <WebGLErrorBoundary fallback={fallbackUI}>
        <Canvas shadows dpr={[1, 2]}>
          <color attach="background" args={["#F7F7F5"]} />

          <PerspectiveCamera
            makeDefault
            fov={
              viewMode3D === "walkthrough"
                ? 62
                : viewMode3D === "top_ortho"
                ? 28
                : 45
            }
            near={0.5}
            far={1200}
          />

          <CameraController
            viewMode={viewMode3D}
            plotW={plotW}
            plotL={plotL}
            activeFloorElevation={activeFloor.elevation}
            resetTick={cameraResetTick}
          />

          <OrbitControls
            makeDefault
            target={[
              plotW / 2,
              viewMode3D === "walkthrough"
                ? activeFloor.elevation + 5.2
                : activeFloor.elevation + 4,
              plotL / 2,
            ]}
            maxPolarAngle={Math.PI / 2 - 0.02}
            minDistance={3}
            maxDistance={340}
          />

          <SceneLightingAndGround
            plot={project.plot}
            floors={project.floors}
            ambientLightIntensity={project.settings.ambientLightIntensity}
            daylightIntensity={project.settings.daylightIntensity ?? 1.15}
            sunAngle={project.settings.sunAzimuth}
            sunElevation={project.settings.sunElevation ?? 55}
            timeOfDayHours={project.settings.timeOfDayHours ?? 12.5}
            interiorLightsEnabled={
              project.settings.interiorLightsEnabled ?? true
            }
            onClearSelection={() => setSelectedObjectIds([])}
          />

          <BuildingMeshes3D
            meshes={sceneMeshes}
            selectedIds={selectedIds}
            onSelectObject={(sourceId, kind) => {
              setSelectedObjectIds([sourceId]);
              onStatusNotice?.(
                `Selected 3D architectural element (${kind.replace("_", " ")}).`
              );
            }}
          />
        </Canvas>
      </WebGLErrorBoundary>

      {/* Interactive 3D Object Transform HUD when a furniture/staircase object is selected */}
      {selectedFurniture3D && (
        <div className="absolute bottom-11 left-3.5 z-10 inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-[#C5A880] shadow-sm text-[11px] pointer-events-auto">
          <span className="font-medium text-[#111111] pr-1.5 border-r border-[#E7E7E7]">
            3D Transform: {selectedFurniture3D.name}
          </span>
          <button
            type="button"
            onClick={() =>
              updateFurniture(selectedFurniture3D.id, {
                position: {
                  ...selectedFurniture3D.position,
                  x: Math.max(0.5, selectedFurniture3D.position.x - 1),
                },
              })
            }
            className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#E7E7E7] font-mono text-[10px] hover:border-[#111111]"
          >
            X -1&apos;
          </button>
          <button
            type="button"
            onClick={() =>
              updateFurniture(selectedFurniture3D.id, {
                position: {
                  ...selectedFurniture3D.position,
                  x: Math.min(
                    plotW - selectedFurniture3D.dimensions.width - 0.5,
                    selectedFurniture3D.position.x + 1
                  ),
                },
              })
            }
            className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#E7E7E7] font-mono text-[10px] hover:border-[#111111]"
          >
            X +1&apos;
          </button>
          <button
            type="button"
            onClick={() =>
              updateFurniture(selectedFurniture3D.id, {
                position: {
                  ...selectedFurniture3D.position,
                  z: Math.max(0.5, selectedFurniture3D.position.z - 1),
                },
              })
            }
            className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#E7E7E7] font-mono text-[10px] hover:border-[#111111]"
          >
            Z -1&apos;
          </button>
          <button
            type="button"
            onClick={() =>
              updateFurniture(selectedFurniture3D.id, {
                position: {
                  ...selectedFurniture3D.position,
                  z: Math.min(
                    plotL - selectedFurniture3D.dimensions.depth - 0.5,
                    selectedFurniture3D.position.z + 1
                  ),
                },
              })
            }
            className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#E7E7E7] font-mono text-[10px] hover:border-[#111111]"
          >
            Z +1&apos;
          </button>
          <button
            type="button"
            onClick={() =>
              updateFurniture(selectedFurniture3D.id, {
                rotation: ((selectedFurniture3D.rotation || 0) + 45) % 360,
              })
            }
            className="px-2 py-0.5 rounded bg-[#111111] text-white font-mono text-[10px] hover:bg-[#262626]"
          >
            Rotate +45°
          </button>
          <button
            type="button"
            onClick={() => {
              deleteFurniture(selectedFurniture3D.id);
              onStatusNotice?.(`Deleted ${selectedFurniture3D.name}.`);
            }}
            className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-mono text-[10px]"
          >
            Delete
          </button>
        </div>
      )}

      {/* Bottom 3D Legend Badge */}
      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-[10px] font-mono text-[#6B6B6B] pointer-events-none">
        <span className="bg-white/90 px-2.5 py-1 rounded-full border border-[#E7E7E7]">
          REAL-TIME 3D BIM SYNC • {sceneMeshes.length} MESH SEGMENTS
        </span>
        <span className="bg-white/90 px-2.5 py-1 rounded-full border border-[#E7E7E7]">
          LEFT DRAG: ORBIT • RIGHT DRAG: PAN • SCROLL: ZOOM
        </span>
      </div>
    </div>
  );
}
