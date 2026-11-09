"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Rect, Line, Circle, Text, Arc, Group } from "react-konva";
import type Konva from "konva";
import {
  EditorTool,
  Opening,
  OpeningType,
  Point2D,
  Room,
  RoomType,
  Wall,
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
  computePolygonAreaSqFt,
  roundToPrecision,
} from "@/lib/home-studio/units";
import {
  snapPoint2D,
  snapOrthogonalPoint,
  computeWallLengthFt,
  findNearestWall,
  validateOpeningOnWall,
  checkRoomOverlap,
} from "@/lib/home-studio/geometry2d";
import {
  ARCHITECTURAL_FURNITURE_CATALOG,
  buildFurnitureItemFromCatalogAsset,
  validateFurniturePlacementFt,
} from "@/lib/home-studio/furnitureCatalog";

export const PIXELS_PER_FOOT = 12;

export const ROOM_TYPE_DEFAULTS: Record<
  RoomType,
  { label: string; color: string; defaultMaterial: string }
> = {
  living_room: {
    label: "Living Room",
    color: "#F5F2EB",
    defaultMaterial: "mat-floor-italian-marble",
  },
  dining_room: {
    label: "Dining Room",
    color: "#F3EFE6",
    defaultMaterial: "mat-floor-italian-marble",
  },
  master_bedroom: {
    label: "Master Bedroom",
    color: "#EDE6DC",
    defaultMaterial: "mat-floor-oak-herringbone",
  },
  bedroom: {
    label: "Bedroom",
    color: "#F0EAE1",
    defaultMaterial: "mat-floor-oak-herringbone",
  },
  kitchen: {
    label: "Kitchen",
    color: "#EFECE6",
    defaultMaterial: "mat-floor-vitrified-matte",
  },
  bathroom: {
    label: "Bathroom",
    color: "#E8ECEB",
    defaultMaterial: "mat-floor-vitrified-matte",
  },
  study_room: {
    label: "Study Room",
    color: "#F3EFE8",
    defaultMaterial: "mat-floor-oak-herringbone",
  },
  balcony: {
    label: "Balcony / Terrace",
    color: "#EBF0EC",
    defaultMaterial: "mat-wall-travertine",
  },
  garage: {
    label: "Garage",
    color: "#EAE8E3",
    defaultMaterial: "mat-floor-vitrified-matte",
  },
  utility_room: {
    label: "Utility Room",
    color: "#EFECE8",
    defaultMaterial: "mat-floor-vitrified-matte",
  },
  storage_room: {
    label: "Storage Room",
    color: "#ECE9E2",
    defaultMaterial: "mat-floor-vitrified-matte",
  },
  custom_room: {
    label: "Custom Room",
    color: "#F4F1EA",
    defaultMaterial: "mat-floor-italian-marble",
  },
};

export interface FloorPlanCanvas2DProps {
  activeRoomType: RoomType;
  activeOpeningType: OpeningType;
  wallThicknessFt: number;
  wallHeightFt: number;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  stageOffset: Point2D;
  setStageOffset: React.Dispatch<React.SetStateAction<Point2D>>;
  onCursorMoveFt: (pt: Point2D) => void;
  onStatusNotice: (msg: string | null) => void;
  showReferenceUnderlay?: boolean;
  referenceFloorId?: string;
  ghostOpacity?: number;
}

export default function FloorPlanCanvas2D({
  activeRoomType,
  activeOpeningType,
  wallThicknessFt,
  wallHeightFt,
  zoom,
  setZoom,
  stageOffset,
  setStageOffset,
  onCursorMoveFt,
  onStatusNotice,
  showReferenceUnderlay = false,
  referenceFloorId = "",
  ghostOpacity = 0.3,
}: FloorPlanCanvas2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 900, height: 640 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Interactive Draft States
  const [wallDraftStartFt, setWallDraftStartFt] = useState<Point2D | null>(null);
  const [wallDraftCurrentFt, setWallDraftCurrentFt] = useState<Point2D | null>(
    null
  );
  const [snappedIndicatorFt, setSnappedIndicatorFt] = useState<Point2D | null>(
    null
  );

  const [roomDraftStartFt, setRoomDraftStartFt] = useState<Point2D | null>(null);
  const [roomDraftCurrentFt, setRoomDraftCurrentFt] = useState<Point2D | null>(
    null
  );

  const [measureStartFt, setMeasureStartFt] = useState<Point2D | null>(null);
  const [measureEndFt, setMeasureEndFt] = useState<Point2D | null>(null);

  const [marqueeStartFt, setMarqueeStartFt] = useState<Point2D | null>(null);
  const [marqueeCurrentFt, setMarqueeCurrentFt] = useState<Point2D | null>(null);

  const [openingPreview, setOpeningPreview] = useState<{
    wall: Wall;
    t: number;
    projectedPoint: Point2D;
    valid: boolean;
    reason?: string;
  } | null>(null);

  // Store Selectors
  const project = useHomeStudioStore(selectActiveProject);
  const activeFloor = useHomeStudioStore(selectSelectedFloor);
  const displayUnit = useHomeStudioStore(selectDisplayUnit);
  const activeTool = useHomeStudioStore((s) => s.activeTool);
  const selectedObjectIds = useHomeStudioStore((s) => s.selectedObjectIds);

  const setSelectedObjectIds = useHomeStudioStore(
    (s) => s.setSelectedObjectIds
  );
  const toggleObjectSelection = useHomeStudioStore(
    (s) => s.toggleObjectSelection
  );
  const addWall = useHomeStudioStore((s) => s.addWall);
  const updateWall = useHomeStudioStore((s) => s.updateWall);
  const deleteWall = useHomeStudioStore((s) => s.deleteWall);
  const addRoom = useHomeStudioStore((s) => s.addRoom);
  const updateRoom = useHomeStudioStore((s) => s.updateRoom);
  const deleteRoom = useHomeStudioStore((s) => s.deleteRoom);
  const addOpening = useHomeStudioStore((s) => s.addOpening);
  const deleteOpening = useHomeStudioStore((s) => s.deleteOpening);
  const addFurniture = useHomeStudioStore((s) => s.addFurniture);
  const updateFurniture = useHomeStudioStore((s) => s.updateFurniture);
  const deleteFurniture = useHomeStudioStore((s) => s.deleteFurniture);

  const referenceFloor = useMemo(() => {
    if (!showReferenceUnderlay) return null;
    if (referenceFloorId) {
      const f = project.floors.find(
        (flr) => flr.id === referenceFloorId && flr.id !== activeFloor.id
      );
      if (f) return f;
    }
    return project.floors.find((flr) => flr.id !== activeFloor.id) || null;
  }, [showReferenceUnderlay, referenceFloorId, project.floors, activeFloor.id]);

  // Measure container size
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setViewportSize({
        width: Math.max(360, Math.floor(rect.width)),
        height: Math.max(420, Math.floor(rect.height)),
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        setIsSpacePressed(true);
      }
      if (e.key === "Escape") {
        setWallDraftStartFt(null);
        setWallDraftCurrentFt(null);
        setRoomDraftStartFt(null);
        setRoomDraftCurrentFt(null);
        setMeasureStartFt(null);
        setMeasureEndFt(null);
        setMarqueeStartFt(null);
        setMarqueeCurrentFt(null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const plotW = project.plot.width;
  const plotL = project.plot.length;
  const sb = project.plot.setbacks;
  const gridSizeFt = project.plot.gridSize || 1;

  // Convert Stage Pointer to Canonical World Feet
  const getWorldPointFt = useCallback(
    (stage: Konva.Stage, shiftKey: boolean = false, anchorFt?: Point2D | null) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;

      const worldPxX = (pointer.x - stageOffset.x) / zoom;
      const worldPxY = (pointer.y - stageOffset.y) / zoom;

      const rawFt: Point2D = {
        x: roundToPrecision(worldPxX / PIXELS_PER_FOOT, 2),
        y: roundToPrecision(worldPxY / PIXELS_PER_FOOT, 2),
      };

      const snapped = snapPoint2D(rawFt, {
        gridSizeFt,
        snapToGrid: project.plot.snapToGrid,
        snapToWall: project.plot.snapToWall,
        walls: activeFloor.walls,
        rooms: activeFloor.rooms,
        snapRadiusFt: 1.25,
        plotWidthFt: plotW,
        plotLengthFt: plotL,
      });

      let finalPt = snapped.point;
      if (anchorFt) {
        const ortho = snapOrthogonalPoint(anchorFt, finalPt, {
          forceOrtho: shiftKey,
          angleToleranceDeg: 7,
        });
        finalPt = ortho.point;
      }

      return {
        point: finalPt,
        snappedToEndpoint: snapped.snappedToEndpoint,
      };
    },
    [
      stageOffset,
      zoom,
      gridSizeFt,
      project.plot.snapToGrid,
      project.plot.snapToWall,
      activeFloor.walls,
      activeFloor.rooms,
      plotW,
      plotL,
    ]
  );

  // Mouse Wheel Zoom around pointer
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const oldScale = zoom;
    const newScale =
      e.evt.deltaY < 0
        ? Math.min(3.5, oldScale * scaleBy)
        : Math.max(0.35, oldScale / scaleBy);

    const mousePointTo = {
      x: (pointer.x - stageOffset.x) / oldScale,
      y: (pointer.y - stageOffset.y) / oldScale,
    };

    setZoom(roundToPrecision(newScale, 3));
    setStageOffset({
      x: Math.round(pointer.x - mousePointTo.x * newScale),
      y: Math.round(pointer.y - mousePointTo.y * newScale),
    });
  };

  // Stage Mouse Down
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isSpacePressed || e.evt.button === 1) return;
    const stage = e.target.getStage();
    if (!stage) return;

    const res = getWorldPointFt(
      stage,
      e.evt.shiftKey,
      wallDraftStartFt || roomDraftStartFt
    );
    if (!res) return;
    const pt = res.point;

    if (activeTool === "wall") {
      if (!wallDraftStartFt) {
        setWallDraftStartFt(pt);
        setWallDraftCurrentFt(pt);
        onStatusNotice(
          `Wall start anchored at (${formatArchitecturalLength(pt.x, displayUnit)}, ${formatArchitecturalLength(pt.y, displayUnit)}). Click end point or press Esc to stop.`
        );
      } else {
        const len = Math.hypot(
          pt.x - wallDraftStartFt.x,
          pt.y - wallDraftStartFt.y
        );
        if (len >= 0.5) {
          const created = addWall({
            floorId: activeFloor.id,
            startPoint: wallDraftStartFt,
            endPoint: pt,
            height: wallHeightFt,
            thickness: wallThicknessFt,
            materialId: "mat-wall-plaster-white",
            isExterior: wallThicknessFt >= 0.65,
            isStructural: true,
          });
          if (created) {
            setSelectedObjectIds([created.id]);
            // Chain continuous wall drawing from endpoint
            setWallDraftStartFt(pt);
            setWallDraftCurrentFt(pt);
            onStatusNotice(
              `Created ${formatArchitecturalLength(len, displayUnit)} wall. Click next point to continue chain, or press Esc to finish.`
            );
          }
        }
      }
      return;
    }

    if (activeTool === "room") {
      if (!roomDraftStartFt) {
        setRoomDraftStartFt(pt);
        setRoomDraftCurrentFt(pt);
        onStatusNotice("Drag or click opposite corner to complete room polygon.");
      } else {
        finalizeRoomDraft(roomDraftStartFt, pt);
      }
      return;
    }

    if (activeTool === "door" || activeTool === "window") {
      if (openingPreview && openingPreview.valid) {
        const isDoor = activeTool === "door";
        const defaultW =
          activeOpeningType === "double_door" ||
          activeOpeningType === "sliding_door" ||
          activeOpeningType === "double_window" ||
          activeOpeningType === "sliding_window" ||
          activeOpeningType === "french_window"
            ? 5
            : isDoor
            ? 3
            : 4;
        const defaultH = isDoor ? 7 : 4.5;
        const sill = isDoor ? 0 : activeOpeningType === "french_window" ? 1 : 3;

        const validation = validateOpeningOnWall(
          openingPreview.wall,
          activeFloor.openings.filter(
            (o) => o.wallId === openingPreview.wall.id
          ),
          openingPreview.t,
          defaultW
        );

        if (!validation.valid) {
          onStatusNotice(validation.reason || "Invalid opening placement.");
          return;
        }

        const created = addOpening({
          floorId: activeFloor.id,
          wallId: openingPreview.wall.id,
          type: activeOpeningType,
          name: isDoor
            ? `${activeOpeningType.replace("_", " ").toUpperCase()}`
            : `${activeOpeningType.replace("_", " ").toUpperCase()}`,
          position: validation.clampedPosition,
          offsetFromStart: validation.offsetFromStartFt,
          width: defaultW,
          height: defaultH,
          sillHeight: sill,
          materialId: isDoor
            ? "mat-floor-oak-herringbone"
            : "mat-glass-low-e",
          swingDirection: "inward",
        });

        if (created) {
          setSelectedObjectIds([created.id]);
          onStatusNotice(
            `Placed ${created.name} (${formatArchitecturalLength(created.width, displayUnit)}) on wall.`
          );
        }
      } else if (openingPreview && !openingPreview.valid) {
        onStatusNotice(
          openingPreview.reason || "Cannot place opening at this position."
        );
      } else {
        onStatusNotice("Hover over an existing wall to place a door or window.");
      }
      return;
    }

    if (activeTool === "measure") {
      if (!measureStartFt || (measureStartFt && measureEndFt)) {
        setMeasureStartFt(pt);
        setMeasureEndFt(pt);
        onStatusNotice("Move cursor and click second point to lock measurement.");
      } else {
        setMeasureEndFt(pt);
      }
      return;
    }

    // Select tool clicked on empty stage background -> start marquee box
    if (e.target === stage || e.target.name() === "plot-bg") {
      if (!e.evt.shiftKey) {
        setSelectedObjectIds([]);
      }
      setMarqueeStartFt(pt);
      setMarqueeCurrentFt(pt);
    }
  };

  const finalizeRoomDraft = (startFt: Point2D, endFt: Point2D) => {
    const minX = roundToPrecision(Math.min(startFt.x, endFt.x), 2);
    const maxX = roundToPrecision(Math.max(startFt.x, endFt.x), 2);
    const minY = roundToPrecision(Math.min(startFt.y, endFt.y), 2);
    const maxY = roundToPrecision(Math.max(startFt.y, endFt.y), 2);
    const w = roundToPrecision(maxX - minX, 2);
    const l = roundToPrecision(maxY - minY, 2);

    if (w < 3 || l < 3) {
      onStatusNotice("Room width and length must be at least 3' 0\".");
      setRoomDraftStartFt(null);
      setRoomDraftCurrentFt(null);
      return;
    }

    const polygon: Point2D[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];

    const overlapCheck = checkRoomOverlap(polygon, activeFloor.rooms);
    const meta = ROOM_TYPE_DEFAULTS[activeRoomType];
    const existingCount = activeFloor.rooms.filter(
      (r) => r.type === activeRoomType
    ).length;

    const created = addRoom({
      floorId: activeFloor.id,
      type: activeRoomType,
      name:
        existingCount > 0 ? `${meta.label} ${existingCount + 1}` : meta.label,
      polygon,
      floorMaterialId: meta.defaultMaterial,
      wallMaterialId: "mat-wall-plaster-white",
      color: meta.color,
    });

    if (created) {
      setSelectedObjectIds([created.id]);
      if (overlapCheck.overlaps) {
        onStatusNotice(
          `Warning: "${created.name}" overlaps with "${overlapCheck.overlappingRoomName}". Adjust position or dimensions.`
        );
      } else {
        onStatusNotice(
          `Created ${created.name} (${formatArchitecturalLength(w, displayUnit)} × ${formatArchitecturalLength(l, displayUnit)} = ${formatArchitecturalArea(w * l, displayUnit)}).`
        );
      }
    }

    setRoomDraftStartFt(null);
    setRoomDraftCurrentFt(null);
  };

  // Stage Mouse Move
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const res = getWorldPointFt(
      stage,
      e.evt.shiftKey,
      wallDraftStartFt || roomDraftStartFt
    );
    if (!res) return;

    onCursorMoveFt(res.point);
    setSnappedIndicatorFt(res.snappedToEndpoint ? res.point : null);

    if (activeTool === "wall" && wallDraftStartFt) {
      setWallDraftCurrentFt(res.point);
    } else if (activeTool === "room" && roomDraftStartFt) {
      setRoomDraftCurrentFt(res.point);
    } else if (
      activeTool === "measure" &&
      measureStartFt &&
      measureEndFt === measureStartFt
    ) {
      setMeasureEndFt(res.point);
    } else if (activeTool === "select" && marqueeStartFt) {
      setMarqueeCurrentFt(res.point);
    } else if (activeTool === "door" || activeTool === "window") {
      const nearest = findNearestWall(res.point, activeFloor.walls, 3.5);
      if (!nearest) {
        setOpeningPreview(null);
      } else {
        const isDoor = activeTool === "door";
        const defaultW =
          activeOpeningType === "double_door" ||
          activeOpeningType === "sliding_door" ||
          activeOpeningType === "double_window" ||
          activeOpeningType === "sliding_window" ||
          activeOpeningType === "french_window"
            ? 5
            : isDoor
            ? 3
            : 4;
        const check = validateOpeningOnWall(
          nearest.wall,
          activeFloor.openings.filter((o) => o.wallId === nearest.wall.id),
          nearest.t,
          defaultW
        );
        setOpeningPreview({
          wall: nearest.wall,
          t: check.clampedPosition,
          projectedPoint: nearest.projectedPoint,
          valid: check.valid,
          reason: check.reason,
        });
      }
    } else {
      setOpeningPreview(null);
    }
  };

  // Stage Mouse Up
  const handleStageMouseUp = () => {
    if (
      activeTool === "room" &&
      roomDraftStartFt &&
      roomDraftCurrentFt &&
      Math.hypot(
        roomDraftCurrentFt.x - roomDraftStartFt.x,
        roomDraftCurrentFt.y - roomDraftStartFt.y
      ) >= 3
    ) {
      finalizeRoomDraft(roomDraftStartFt, roomDraftCurrentFt);
    }

    if (activeTool === "select" && marqueeStartFt && marqueeCurrentFt) {
      const minX = Math.min(marqueeStartFt.x, marqueeCurrentFt.x);
      const maxX = Math.max(marqueeStartFt.x, marqueeCurrentFt.x);
      const minY = Math.min(marqueeStartFt.y, marqueeCurrentFt.y);
      const maxY = Math.max(marqueeStartFt.y, marqueeCurrentFt.y);

      if (maxX - minX > 1 && maxY - minY > 1) {
        const matchedIds: string[] = [];
        for (const r of activeFloor.rooms) {
          const b = computePolygonBoundsFt(r.polygon);
          if (b.minX >= minX && b.maxX <= maxX && b.minY >= minY && b.maxY <= maxY) {
            matchedIds.push(r.id);
          }
        }
        for (const w of activeFloor.walls) {
          const wxMin = Math.min(w.startPoint.x, w.endPoint.x);
          const wxMax = Math.max(w.startPoint.x, w.endPoint.x);
          const wyMin = Math.min(w.startPoint.y, w.endPoint.y);
          const wyMax = Math.max(w.startPoint.y, w.endPoint.y);
          if (wxMin >= minX && wxMax <= maxX && wyMin >= minY && wyMax <= maxY) {
            matchedIds.push(w.id);
          }
        }
        if (matchedIds.length > 0) {
          setSelectedObjectIds(matchedIds);
          onStatusNotice(`Selected ${matchedIds.length} architectural objects.`);
        }
      }
      setMarqueeStartFt(null);
      setMarqueeCurrentFt(null);
    }
  };

  // Precompute Grid Lines in Pixels
  const gridLines = useMemo(() => {
    if (!project.plot.showGrid) return [];
    const lines: { points: number[]; major: boolean; key: string }[] = [];
    const stepFt = Math.max(1, gridSizeFt);
    const totalW = plotW * PIXELS_PER_FOOT;
    const totalL = plotL * PIXELS_PER_FOOT;

    for (let xFt = 0; xFt <= plotW; xFt += stepFt) {
      const xPx = xFt * PIXELS_PER_FOOT;
      lines.push({
        key: `gx-${xFt}`,
        points: [xPx, 0, xPx, totalL],
        major: xFt % 10 === 0,
      });
    }
    for (let yFt = 0; yFt <= plotL; yFt += stepFt) {
      const yPx = yFt * PIXELS_PER_FOOT;
      lines.push({
        key: `gy-${yFt}`,
        points: [0, yPx, totalW, yPx],
        major: yFt % 10 === 0,
      });
    }
    return lines;
  }, [project.plot.showGrid, gridSizeFt, plotW, plotL]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[640px] bg-[#F7F7F5] overflow-hidden select-none"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const assetId = e.dataTransfer.getData(
          "application/hmx-furniture-asset-id"
        );
        if (!assetId || !containerRef.current) return;
        const asset = ARCHITECTURAL_FURNITURE_CATALOG.find(
          (a) => a.assetId === assetId
        );
        if (!asset) return;

        const rect = containerRef.current.getBoundingClientRect();
        const rawXFt =
          (e.clientX - rect.left - stageOffset.x) / (zoom * PIXELS_PER_FOOT) -
          asset.dimensions.width / 2;
        const rawZFt =
          (e.clientY - rect.top - stageOffset.y) / (zoom * PIXELS_PER_FOOT) -
          asset.dimensions.depth / 2;

        const check = validateFurniturePlacementFt({
          floor: activeFloor,
          plotWidth: plotW,
          plotLength: plotL,
          candidateX: rawXFt,
          candidateZ: rawZFt,
          widthFt: asset.dimensions.width,
          depthFt: asset.dimensions.depth,
          snapToGrid: project.plot.snapToGrid,
          gridSizeFt: project.plot.gridSize,
          snapToWall: asset.collisionFootprint.snapToWall,
          allowOutsideRoom: asset.collisionFootprint.allowOutdoor,
        });

        const payload = buildFurnitureItemFromCatalogAsset(
          asset,
          activeFloor,
          plotW,
          plotL,
          check.snappedPositionFt
        );
        const created = addFurniture(payload);
        if (created) {
          setSelectedObjectIds([created.id]);
          onStatusNotice(
            check.warningMessage ||
              `Placed "${created.name}" on ${activeFloor.name}.`
          );
        }
      }}
      style={{
        cursor: isSpacePressed
          ? "grab"
          : activeTool === "wall" ||
            activeTool === "room" ||
            activeTool === "measure"
          ? "crosshair"
          : "default",
      }}
    >
      <Stage
        ref={stageRef}
        width={viewportSize.width}
        height={viewportSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={stageOffset.x}
        y={stageOffset.y}
        draggable={isSpacePressed}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStageOffset({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {/* 1. Plot Surface & Boundary */}
          <Rect
            name="plot-bg"
            x={0}
            y={0}
            width={plotW * PIXELS_PER_FOOT}
            height={plotL * PIXELS_PER_FOOT}
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth={2}
            shadowColor="rgba(0,0,0,0.06)"
            shadowBlur={24}
          />

          {/* 2. Architectural Grid */}
          {gridLines.map((ln) => (
            <Line
              key={ln.key}
              points={ln.points}
              stroke={ln.major ? "#E4E4E0" : "#F2F2EE"}
              strokeWidth={ln.major ? 1 : 0.6}
              listening={false}
            />
          ))}

          {/* 3. Municipal Setback Envelope */}
          {project.settings.showSetbacks && (
            <Rect
              x={sb.left * PIXELS_PER_FOOT}
              y={sb.front * PIXELS_PER_FOOT}
              width={Math.max(4, plotW - sb.left - sb.right) * PIXELS_PER_FOOT}
              height={Math.max(4, plotL - sb.front - sb.back) * PIXELS_PER_FOOT}
              stroke="#C5A880"
              strokeWidth={1.2}
              dash={[6, 4]}
              listening={false}
            />
          )}

          {/* 3B. Ghost Reference Floor Underlay (Non-editable, Visual Alignment Only) */}
          {referenceFloor && (
            <Group opacity={Math.max(0.1, Math.min(0.75, ghostOpacity))} listening={false}>
              {referenceFloor.rooms.map((gRoom) => {
                const gb = computePolygonBoundsFt(gRoom.polygon);
                return (
                  <Rect
                    key={`ghost-room-${gRoom.id}`}
                    x={gb.minX * PIXELS_PER_FOOT}
                    y={gb.minY * PIXELS_PER_FOOT}
                    width={gb.width * PIXELS_PER_FOOT}
                    height={gb.length * PIXELS_PER_FOOT}
                    fill="#E5E4DF"
                    stroke="#6B6B6B"
                    strokeWidth={1}
                    dash={[5, 4]}
                  />
                );
              })}

              {referenceFloor.walls.map((gWall) => (
                <Line
                  key={`ghost-wall-${gWall.id}`}
                  points={[
                    gWall.startPoint.x * PIXELS_PER_FOOT,
                    gWall.startPoint.y * PIXELS_PER_FOOT,
                    gWall.endPoint.x * PIXELS_PER_FOOT,
                    gWall.endPoint.y * PIXELS_PER_FOOT,
                  ]}
                  stroke="#6B6B6B"
                  strokeWidth={Math.max(2, gWall.thickness * PIXELS_PER_FOOT)}
                  dash={[6, 4]}
                />
              ))}

              {referenceFloor.objects
                .filter((o) => o.category === "staircases")
                .map((gStair) => (
                  <Group
                    key={`ghost-stair-${gStair.id}`}
                    x={gStair.position.x * PIXELS_PER_FOOT}
                    y={gStair.position.z * PIXELS_PER_FOOT}
                  >
                    <Rect
                      x={0}
                      y={0}
                      width={gStair.dimensions.width * PIXELS_PER_FOOT}
                      height={gStair.dimensions.depth * PIXELS_PER_FOOT}
                      stroke="#C5A880"
                      strokeWidth={1.5}
                      dash={[4, 3]}
                    />
                    <Text
                      x={4}
                      y={4}
                      text={`REF STAIR (${referenceFloor.name})`}
                      fontSize={8.5}
                      fill="#9E8056"
                    />
                  </Group>
                ))}
            </Group>
          )}

          {/* Plot Overall Dimensions Annotation */}
          {project.settings.showDimensions && (
            <>
              <Text
                x={(plotW * PIXELS_PER_FOOT) / 2 - 45}
                y={-22}
                text={`PLOT WIDTH: ${formatArchitecturalLength(plotW, displayUnit)} (${project.plot.roadFacing.toUpperCase()} ROAD)`}
                fontSize={10}
                fontStyle="bold"
                fill="#6B6B6B"
                listening={false}
              />
              <Text
                x={-18}
                y={(plotL * PIXELS_PER_FOOT) / 2 + 40}
                rotation={-90}
                text={`PLOT LENGTH: ${formatArchitecturalLength(plotL, displayUnit)}`}
                fontSize={10}
                fontStyle="bold"
                fill="#6B6B6B"
                listening={false}
              />
            </>
          )}

          {/* 4. Rooms Layer */}
          {activeFloor.rooms.map((room) => {
            const isSelected = selectedObjectIds.includes(room.id);
            const bounds = computePolygonBoundsFt(room.polygon);
            const rx = bounds.minX * PIXELS_PER_FOOT;
            const ry = bounds.minY * PIXELS_PER_FOOT;
            const rw = bounds.width * PIXELS_PER_FOOT;
            const rl = bounds.length * PIXELS_PER_FOOT;

            return (
              <Group
                key={room.id}
                x={rx}
                y={ry}
                draggable={activeTool === "select" && !activeFloor.locked}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === "delete") {
                    deleteRoom(room.id);
                    onStatusNotice(`Deleted room "${room.name}".`);
                    return;
                  }
                  toggleObjectSelection(room.id, e.evt.shiftKey);
                }}
                onDragEnd={(e) => {
                  const rawNewXFt = e.target.x() / PIXELS_PER_FOOT;
                  const rawNewYFt = e.target.y() / PIXELS_PER_FOOT;
                  const snapped = snapPoint2D(
                    { x: rawNewXFt, y: rawNewYFt },
                    {
                      gridSizeFt,
                      snapToGrid: project.plot.snapToGrid,
                      snapToWall: false,
                      walls: [],
                      plotWidthFt: Math.max(0, plotW - bounds.width),
                      plotLengthFt: Math.max(0, plotL - bounds.length),
                    }
                  ).point;

                  const dxFt = roundToPrecision(snapped.x - bounds.minX, 2);
                  const dyFt = roundToPrecision(snapped.y - bounds.minY, 2);

                  const newPoly = room.polygon.map((p) => ({
                    x: roundToPrecision(p.x + dxFt, 2),
                    y: roundToPrecision(p.y + dyFt, 2),
                  }));

                  e.target.position({
                    x: snapped.x * PIXELS_PER_FOOT,
                    y: snapped.y * PIXELS_PER_FOOT,
                  });
                  updateRoom(room.id, { polygon: newPoly });
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={rw}
                  height={rl}
                  fill={room.color || "#F5F2EB"}
                  stroke={isSelected ? "#C5A880" : "#111111"}
                  strokeWidth={isSelected ? 2.4 : 1.4}
                />

                {/* Room Title & Area Annotation */}
                {project.settings.showRoomLabels && rw > 42 && rl > 36 && (
                  <>
                    <Text
                      x={4}
                      y={rl / 2 - 16}
                      width={rw - 8}
                      align="center"
                      text={room.name}
                      fontSize={11}
                      fontStyle="bold"
                      fill="#111111"
                      listening={false}
                    />
                    {project.settings.showDimensions && (
                      <Text
                        x={4}
                        y={rl / 2 - 2}
                        width={rw - 8}
                        align="center"
                        text={`${formatArchitecturalLength(bounds.width, displayUnit)} × ${formatArchitecturalLength(bounds.length, displayUnit)}\n${formatArchitecturalArea(room.dimensions.area, displayUnit)}`}
                        fontSize={9.5}
                        lineHeight={1.25}
                        fill="#6B6B6B"
                        listening={false}
                      />
                    )}
                  </>
                )}

                {/* Corner Resize Handle when Selected */}
                {isSelected && activeTool === "select" && (
                  <Rect
                    x={rw - 6}
                    y={rl - 6}
                    width={12}
                    height={12}
                    fill="#C5A880"
                    stroke="#111111"
                    strokeWidth={1}
                    draggable
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                    }}
                    onDragEnd={(e) => {
                      e.cancelBubble = true;
                      const newW = Math.max(
                        3,
                        roundToPrecision(
                          (e.target.x() + 6) / PIXELS_PER_FOOT,
                          2
                        )
                      );
                      const newL = Math.max(
                        3,
                        roundToPrecision(
                          (e.target.y() + 6) / PIXELS_PER_FOOT,
                          2
                        )
                      );
                      const clampedW = Math.min(plotW - bounds.minX, newW);
                      const clampedL = Math.min(plotL - bounds.minY, newL);
                      updateRoom(room.id, {
                        dimensions: {
                          width: clampedW,
                          length: clampedL,
                          area: roundToPrecision(clampedW * clampedL, 2),
                        },
                      });
                    }}
                  />
                )}
              </Group>
            );
          })}

          {/* 5. Structural & Partition Walls Layer */}
          {activeFloor.walls.map((wall) => {
            const isSelected = selectedObjectIds.includes(wall.id);
            const x1 = wall.startPoint.x * PIXELS_PER_FOOT;
            const y1 = wall.startPoint.y * PIXELS_PER_FOOT;
            const x2 = wall.endPoint.x * PIXELS_PER_FOOT;
            const y2 = wall.endPoint.y * PIXELS_PER_FOOT;
            const lengthFt = computeWallLengthFt(wall);
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <Group key={wall.id}>
                <Line
                  points={[x1, y1, x2, y2]}
                  stroke={isSelected ? "#C5A880" : "#111111"}
                  strokeWidth={Math.max(
                    3,
                    wall.thickness * PIXELS_PER_FOOT
                  )}
                  lineCap="square"
                  hitStrokeWidth={14}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (activeTool === "delete") {
                      deleteWall(wall.id);
                      onStatusNotice("Deleted wall segment.");
                      return;
                    }
                    if (activeTool === "select") {
                      toggleObjectSelection(wall.id, e.evt.shiftKey);
                    }
                  }}
                />

                {/* Wall Length Annotation */}
                {project.settings.showDimensions && lengthFt >= 4 && (
                  <Text
                    x={midX - 24}
                    y={midY - 14}
                    text={formatArchitecturalLength(lengthFt, displayUnit)}
                    fontSize={9}
                    fill={isSelected ? "#C5A880" : "#6B6B6B"}
                    listening={false}
                  />
                )}

                {/* Draggable Endpoints when Wall is Selected */}
                {isSelected && activeTool === "select" && (
                  <>
                    <Circle
                      x={x1}
                      y={y1}
                      radius={5.5}
                      fill="#FFFFFF"
                      stroke="#C5A880"
                      strokeWidth={2}
                      draggable
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                        const pt = snapPoint2D(
                          {
                            x: e.target.x() / PIXELS_PER_FOOT,
                            y: e.target.y() / PIXELS_PER_FOOT,
                          },
                          {
                            gridSizeFt,
                            snapToGrid: project.plot.snapToGrid,
                            snapToWall: true,
                            walls: activeFloor.walls.filter(
                              (w) => w.id !== wall.id
                            ),
                            plotWidthFt: plotW,
                            plotLengthFt: plotL,
                          }
                        ).point;
                        updateWall(wall.id, { startPoint: pt });
                      }}
                    />
                    <Circle
                      x={x2}
                      y={y2}
                      radius={5.5}
                      fill="#FFFFFF"
                      stroke="#C5A880"
                      strokeWidth={2}
                      draggable
                      onDragEnd={(e) => {
                        e.cancelBubble = true;
                        const pt = snapPoint2D(
                          {
                            x: e.target.x() / PIXELS_PER_FOOT,
                            y: e.target.y() / PIXELS_PER_FOOT,
                          },
                          {
                            gridSizeFt,
                            snapToGrid: project.plot.snapToGrid,
                            snapToWall: true,
                            walls: activeFloor.walls.filter(
                              (w) => w.id !== wall.id
                            ),
                            plotWidthFt: plotW,
                            plotLengthFt: plotL,
                          }
                        ).point;
                        updateWall(wall.id, { endPoint: pt });
                      }}
                    />
                  </>
                )}
              </Group>
            );
          })}

          {/* 6. Wall-Hosted Doors & Windows Layer */}
          {activeFloor.openings.map((opening) => {
            const hostWall = activeFloor.walls.find(
              (w) => w.id === opening.wallId
            );
            if (!hostWall) return null;

            const isSelected = selectedObjectIds.includes(opening.id);
            const dx = hostWall.endPoint.x - hostWall.startPoint.x;
            const dy = hostWall.endPoint.y - hostWall.startPoint.y;
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

            const cxFt = hostWall.startPoint.x + opening.position * dx;
            const cyFt = hostWall.startPoint.y + opening.position * dy;
            const cxPx = cxFt * PIXELS_PER_FOOT;
            const cyPx = cyFt * PIXELS_PER_FOOT;
            const wPx = opening.width * PIXELS_PER_FOOT;
            const thickPx = Math.max(
              6,
              hostWall.thickness * PIXELS_PER_FOOT + 2
            );

            const isDoor = opening.type.includes("door");

            return (
              <Group
                key={opening.id}
                x={cxPx}
                y={cyPx}
                rotation={angleDeg}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === "delete") {
                    deleteOpening(opening.id);
                    onStatusNotice(`Deleted ${opening.name}.`);
                    return;
                  }
                  toggleObjectSelection(opening.id, e.evt.shiftKey);
                }}
              >
                {/* Clear wall cut background */}
                <Rect
                  x={-wPx / 2}
                  y={-thickPx / 2}
                  width={wPx}
                  height={thickPx}
                  fill="#FFFFFF"
                  stroke={isSelected ? "#C5A880" : isDoor ? "#9E8056" : "#4A7C9B"}
                  strokeWidth={isSelected ? 2 : 1.3}
                />

                {/* Architectural Door Swing Arc or Window Glazing Lines */}
                {isDoor ? (
                  <>
                    <Line
                      points={[-wPx / 2, 0, -wPx / 2, wPx * 0.85]}
                      stroke="#9E8056"
                      strokeWidth={1.5}
                    />
                    <Arc
                      x={-wPx / 2}
                      y={0}
                      innerRadius={wPx * 0.82}
                      outerRadius={wPx * 0.85}
                      angle={90}
                      rotation={0}
                      stroke="#C5A880"
                      strokeWidth={1}
                      dash={[3, 2]}
                    />
                  </>
                ) : (
                  <Line
                    points={[-wPx / 2, 0, wPx / 2, 0]}
                    stroke="#4A7C9B"
                    strokeWidth={2}
                  />
                )}

                {project.settings.showDimensions && (
                  <Text
                    x={-wPx / 2}
                    y={-14}
                    width={wPx}
                    align="center"
                    text={formatArchitecturalLength(opening.width, displayUnit)}
                    fontSize={8.5}
                    fill={isSelected ? "#C5A880" : "#6B6B6B"}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}

          {/* 6B. Staircases & Interior Furniture Symbols Layer */}
          {activeFloor.objects.map((obj) => {
            const isStair = obj.category === "staircases";
            if (!isStair && !project.settings.showFurniture2D) return null;

            const isSelected = selectedObjectIds.includes(obj.id);
            const sx = obj.position.x * PIXELS_PER_FOOT;
            const sy = obj.position.z * PIXELS_PER_FOOT;
            const sw = obj.dimensions.width * PIXELS_PER_FOOT;
            const sd = obj.dimensions.depth * PIXELS_PER_FOOT;
            const risers = obj.stairMetadata?.riserCount || 14;
            const stepLines: number[][] = [];

            if (isStair) {
              const count = Math.min(16, Math.max(5, Math.floor(risers / 2)));
              for (let i = 1; i < count; i++) {
                const yStep = (sd / count) * i;
                stepLines.push([0, yStep, sw, yStep]);
              }
            }

            const placementCheck = !isStair
              ? validateFurniturePlacementFt({
                  floor: activeFloor,
                  plotWidth: plotW,
                  plotLength: plotL,
                  candidateX: obj.position.x,
                  candidateZ: obj.position.z,
                  widthFt: obj.dimensions.width,
                  depthFt: obj.dimensions.depth,
                  excludeObjectId: obj.id,
                  snapToGrid: false,
                  snapToWall: false,
                  allowOutsideRoom: Boolean(obj.allowOutsideRoom),
                })
              : null;

            const hasCollisionWarning =
              placementCheck && !placementCheck.valid;

            const isBed =
              obj.category === "bedroom_furniture" || obj.category === "beds";
            const isSofa =
              obj.category === "living_room_furniture" ||
              obj.category === "sofas" ||
              obj.category === "chairs";
            const isLightOrFan =
              obj.category === "lighting" ||
              obj.category === "lights" ||
              obj.category === "ceiling_fans";

            return (
              <Group
                key={obj.id}
                x={sx}
                y={sy}
                rotation={obj.rotation || 0}
                draggable={activeTool === "select" && !activeFloor.locked}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === "delete") {
                    deleteFurniture(obj.id);
                    onStatusNotice(`Deleted ${obj.name}.`);
                    return;
                  }
                  toggleObjectSelection(obj.id, e.evt.shiftKey);
                }}
                onDragEnd={(e) => {
                  const rawX = e.target.x() / PIXELS_PER_FOOT;
                  const rawZ = e.target.y() / PIXELS_PER_FOOT;
                  const check = validateFurniturePlacementFt({
                    floor: activeFloor,
                    plotWidth: plotW,
                    plotLength: plotL,
                    candidateX: rawX,
                    candidateZ: rawZ,
                    widthFt: obj.dimensions.width,
                    depthFt: obj.dimensions.depth,
                    excludeObjectId: obj.id,
                    snapToGrid: project.plot.snapToGrid,
                    gridSizeFt: project.plot.gridSize,
                    snapToWall: project.plot.snapToWall,
                    allowOutsideRoom: Boolean(obj.allowOutsideRoom),
                  });

                  const nx = check.snappedPositionFt.x;
                  const nz = check.snappedPositionFt.z;
                  e.target.position({
                    x: nx * PIXELS_PER_FOOT,
                    y: nz * PIXELS_PER_FOOT,
                  });
                  updateFurniture(obj.id, {
                    position: { x: nx, y: obj.position.y, z: nz },
                  });
                  if (check.warningMessage) {
                    onStatusNotice(check.warningMessage);
                  }
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={sw}
                  height={sd}
                  cornerRadius={isStair ? 0 : 2}
                  fill={
                    isStair
                      ? "#F7F3EB"
                      : hasCollisionWarning
                      ? "rgba(220, 38, 38, 0.08)"
                      : obj.color || "#FFFFFF"
                  }
                  stroke={
                    hasCollisionWarning
                      ? "#DC2626"
                      : isSelected
                      ? "#C5A880"
                      : "#111111"
                  }
                  strokeWidth={isSelected || hasCollisionWarning ? 2.2 : 1.1}
                  dash={hasCollisionWarning ? [4, 3] : undefined}
                />

                {/* Category-Specific 2D Architectural Symbol Details */}
                {isBed && (
                  <>
                    <Rect
                      x={2}
                      y={2}
                      width={sw - 4}
                      height={Math.max(4, sd * 0.12)}
                      fill="#9A744C"
                      listening={false}
                    />
                    <Rect
                      x={sw * 0.1}
                      y={sd * 0.16}
                      width={sw * 0.34}
                      height={sd * 0.18}
                      fill="#FFFFFF"
                      stroke="#6B6B6B"
                      strokeWidth={0.7}
                      listening={false}
                    />
                    <Rect
                      x={sw * 0.56}
                      y={sd * 0.16}
                      width={sw * 0.34}
                      height={sd * 0.18}
                      fill="#FFFFFF"
                      stroke="#6B6B6B"
                      strokeWidth={0.7}
                      listening={false}
                    />
                  </>
                )}

                {isSofa && (
                  <Rect
                    x={2}
                    y={2}
                    width={sw - 4}
                    height={Math.max(4, sd * 0.24)}
                    fill="rgba(17,17,17,0.08)"
                    stroke="#6B6B6B"
                    strokeWidth={0.7}
                    listening={false}
                  />
                )}

                {isLightOrFan && (
                  <>
                    <Circle
                      x={sw / 2}
                      y={sd / 2}
                      radius={Math.min(sw, sd) * 0.38}
                      stroke="#C5A880"
                      strokeWidth={1.2}
                      listening={false}
                    />
                    <Line
                      points={[0, sd / 2, sw, sd / 2]}
                      stroke="#C5A880"
                      strokeWidth={0.8}
                      listening={false}
                    />
                    <Line
                      points={[sw / 2, 0, sw / 2, sd]}
                      stroke="#C5A880"
                      strokeWidth={0.8}
                      listening={false}
                    />
                  </>
                )}

                {isStair &&
                  stepLines.map((pts, idx) => (
                    <Line
                      key={idx}
                      points={pts}
                      stroke="#9E8056"
                      strokeWidth={0.8}
                      listening={false}
                    />
                  ))}

                {/* Direction of Ascent Arrow for Staircase or Object Label for Furniture */}
                {isStair ? (
                  <>
                    <Line
                      points={[sw / 2, sd - 8, sw / 2, 10]}
                      stroke="#111111"
                      strokeWidth={1.2}
                      listening={false}
                    />
                    <Text
                      x={4}
                      y={sd / 2 - 6}
                      width={sw - 8}
                      align="center"
                      text={`UP • ${obj.stairMetadata?.stairType?.toUpperCase() || "STAIR"}`}
                      fontSize={8.5}
                      fontStyle="bold"
                      fill="#111111"
                      listening={false}
                    />
                  </>
                ) : (
                  <Text
                    x={2}
                    y={Math.max(2, sd / 2 - 5)}
                    width={Math.max(16, sw - 4)}
                    align="center"
                    text={obj.name.split(" ").slice(0, 2).join(" ")}
                    fontSize={8}
                    fontStyle="bold"
                    fill="#111111"
                    listening={false}
                  />
                )}

                {/* Interactive Rotation Handle (top-center) & Resize Handle (bottom-right) when selected */}
                {isSelected && !activeFloor.locked && (
                  <>
                    <Line
                      points={[sw / 2, 0, sw / 2, -12]}
                      stroke="#C5A880"
                      strokeWidth={1.4}
                      listening={false}
                    />
                    <Circle
                      x={sw / 2}
                      y={-14}
                      radius={5}
                      fill="#111111"
                      stroke="#C5A880"
                      strokeWidth={1.5}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        const nextRot = ((obj.rotation || 0) + 45) % 360;
                        updateFurniture(obj.id, { rotation: nextRot });
                        onStatusNotice(
                          `Rotated "${obj.name}" to ${nextRot}°.`
                        );
                      }}
                    />
                    {!isStair && (
                      <Rect
                        x={sw - 5}
                        y={sd - 5}
                        width={9}
                        height={9}
                        fill="#C5A880"
                        stroke="#111111"
                        strokeWidth={1}
                        draggable
                        onDragEnd={(e) => {
                          e.cancelBubble = true;
                          const newW = roundToPrecision(
                            Math.max(1.2, e.target.x() / PIXELS_PER_FOOT),
                            2
                          );
                          const newD = roundToPrecision(
                            Math.max(1.2, e.target.y() / PIXELS_PER_FOOT),
                            2
                          );
                          updateFurniture(obj.id, {
                            dimensions: {
                              ...obj.dimensions,
                              width: newW,
                              depth: newD,
                            },
                          });
                          onStatusNotice(
                            `Resized "${obj.name}" to ${formatArchitecturalLength(
                              newW,
                              displayUnit
                            )} × ${formatArchitecturalLength(newD, displayUnit)}.`
                          );
                        }}
                      />
                    )}
                  </>
                )}
              </Group>
            );
          })}

          {/* 7. Interactive Previews (Wall Draft, Room Draft, Opening Hover, Measure, Marquee) */}
          {activeTool === "wall" && wallDraftStartFt && wallDraftCurrentFt && (
            <Group listening={false}>
              <Line
                points={[
                  wallDraftStartFt.x * PIXELS_PER_FOOT,
                  wallDraftStartFt.y * PIXELS_PER_FOOT,
                  wallDraftCurrentFt.x * PIXELS_PER_FOOT,
                  wallDraftCurrentFt.y * PIXELS_PER_FOOT,
                ]}
                stroke="#C5A880"
                strokeWidth={Math.max(3, wallThicknessFt * PIXELS_PER_FOOT)}
                dash={[6, 4]}
              />
              <Text
                x={
                  ((wallDraftStartFt.x + wallDraftCurrentFt.x) / 2) *
                    PIXELS_PER_FOOT +
                  8
                }
                y={
                  ((wallDraftStartFt.y + wallDraftCurrentFt.y) / 2) *
                    PIXELS_PER_FOOT -
                  16
                }
                text={formatArchitecturalLength(
                  Math.hypot(
                    wallDraftCurrentFt.x - wallDraftStartFt.x,
                    wallDraftCurrentFt.y - wallDraftStartFt.y
                  ),
                  displayUnit
                )}
                fontSize={11}
                fontStyle="bold"
                fill="#111111"
              />
            </Group>
          )}

          {activeTool === "room" && roomDraftStartFt && roomDraftCurrentFt && (
            <Group listening={false}>
              <Rect
                x={
                  Math.min(roomDraftStartFt.x, roomDraftCurrentFt.x) *
                  PIXELS_PER_FOOT
                }
                y={
                  Math.min(roomDraftStartFt.y, roomDraftCurrentFt.y) *
                  PIXELS_PER_FOOT
                }
                width={
                  Math.abs(roomDraftCurrentFt.x - roomDraftStartFt.x) *
                  PIXELS_PER_FOOT
                }
                height={
                  Math.abs(roomDraftCurrentFt.y - roomDraftStartFt.y) *
                  PIXELS_PER_FOOT
                }
                fill="rgba(197, 168, 128, 0.18)"
                stroke="#C5A880"
                strokeWidth={1.8}
                dash={[5, 3]}
              />
              <Text
                x={
                  Math.min(roomDraftStartFt.x, roomDraftCurrentFt.x) *
                    PIXELS_PER_FOOT +
                  6
                }
                y={
                  Math.min(roomDraftStartFt.y, roomDraftCurrentFt.y) *
                    PIXELS_PER_FOOT +
                  6
                }
                text={`${ROOM_TYPE_DEFAULTS[activeRoomType].label}\n${formatArchitecturalLength(
                  Math.abs(roomDraftCurrentFt.x - roomDraftStartFt.x),
                  displayUnit
                )} × ${formatArchitecturalLength(
                  Math.abs(roomDraftCurrentFt.y - roomDraftStartFt.y),
                  displayUnit
                )}`}
                fontSize={10.5}
                fontStyle="bold"
                fill="#111111"
              />
            </Group>
          )}

          {(activeTool === "door" || activeTool === "window") &&
            openingPreview && (
              <Circle
                x={openingPreview.projectedPoint.x * PIXELS_PER_FOOT}
                y={openingPreview.projectedPoint.y * PIXELS_PER_FOOT}
                radius={7}
                fill={openingPreview.valid ? "#C5A880" : "#DC2626"}
                stroke="#FFFFFF"
                strokeWidth={2}
                listening={false}
              />
            )}

          {activeTool === "measure" && measureStartFt && measureEndFt && (
            <Group listening={false}>
              <Line
                points={[
                  measureStartFt.x * PIXELS_PER_FOOT,
                  measureStartFt.y * PIXELS_PER_FOOT,
                  measureEndFt.x * PIXELS_PER_FOOT,
                  measureEndFt.y * PIXELS_PER_FOOT,
                ]}
                stroke="#111111"
                strokeWidth={1.5}
                dash={[4, 3]}
              />
              <Circle
                x={measureStartFt.x * PIXELS_PER_FOOT}
                y={measureStartFt.y * PIXELS_PER_FOOT}
                radius={4}
                fill="#C5A880"
              />
              <Circle
                x={measureEndFt.x * PIXELS_PER_FOOT}
                y={measureEndFt.y * PIXELS_PER_FOOT}
                radius={4}
                fill="#C5A880"
              />
              <Text
                x={
                  ((measureStartFt.x + measureEndFt.x) / 2) * PIXELS_PER_FOOT +
                  6
                }
                y={
                  ((measureStartFt.y + measureEndFt.y) / 2) * PIXELS_PER_FOOT -
                  16
                }
                text={`MEASURE: ${formatArchitecturalLength(
                  Math.hypot(
                    measureEndFt.x - measureStartFt.x,
                    measureEndFt.y - measureStartFt.y
                  ),
                  displayUnit
                )}`}
                fontSize={11}
                fontStyle="bold"
                fill="#111111"
              />
            </Group>
          )}

          {activeTool === "select" && marqueeStartFt && marqueeCurrentFt && (
            <Rect
              x={
                Math.min(marqueeStartFt.x, marqueeCurrentFt.x) * PIXELS_PER_FOOT
              }
              y={
                Math.min(marqueeStartFt.y, marqueeCurrentFt.y) * PIXELS_PER_FOOT
              }
              width={
                Math.abs(marqueeCurrentFt.x - marqueeStartFt.x) *
                PIXELS_PER_FOOT
              }
              height={
                Math.abs(marqueeCurrentFt.y - marqueeStartFt.y) *
                PIXELS_PER_FOOT
              }
              fill="rgba(17, 17, 17, 0.04)"
              stroke="#111111"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}

          {/* Snap Endpoint Indicator */}
          {snappedIndicatorFt && (
            <Circle
              x={snappedIndicatorFt.x * PIXELS_PER_FOOT}
              y={snappedIndicatorFt.y * PIXELS_PER_FOOT}
              radius={5}
              stroke="#C5A880"
              strokeWidth={2}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

