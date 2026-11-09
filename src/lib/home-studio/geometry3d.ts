import {
  BuildingProject,
  Floor,
  Opening,
  Point3D,
  Room,
  ViewMode3D,
  Wall,
} from "../../types/homeStudio";
import { computePolygonBoundsFt, roundToPrecision } from "./units";
import { computeWallLengthFt } from "./geometry2d";
import { generateProceduralFurnitureMeshes3D } from "./furnitureCatalog";

export type RoofStyle3D = "flat" | "parapet" | "gable" | "hip";

export interface BoxMeshSpec3D {
  id: string;
  sourceObjectId: string;
  floorId: string;
  kind:
    | "wall_solid"
    | "wall_header"
    | "wall_sill"
    | "door_frame"
    | "door_leaf"
    | "window_glass"
    | "window_frame"
    | "floor_slab"
    | "room_floor"
    | "ceiling_slab"
    | "roof"
    | "stair_step"
    | "furniture";
  position: Point3D; // center in Three.js world space (x = East/West ft, y = Up ft, z = North/South ft)
  dimensions: {
    width: number;  // local X (ft)
    height: number; // local Y (ft)
    depth: number;  // local Z (ft)
  };
  rotationYRad: number; // radians around Y axis
  color: string;
  opacity: number;
  roughness: number;
  metalness: number;
}

/**
 * Splits a single 2D/3D wall segment with 0 or more hosted openings into exact
 * non-overlapping 3D box meshes (left/right jamb segments, lintel headers above openings,
 * sill walls below windows, door/window frames, and door leaf / window glass meshes).
 */
export function generateWallAndOpeningMeshes3D(
  wall: Wall,
  openingsOnWall: Opening[],
  floorElevationFt: number,
  wallColor: string = "#F9F8F6",
  sectionCutHeightFt?: number
): BoxMeshSpec3D[] {
  const wallLen = computeWallLengthFt(wall);
  if (wallLen < 0.25) return [];

  const dx = wall.endPoint.x - wall.startPoint.x;
  const dz = wall.endPoint.y - wall.startPoint.y;
  const angleRad = -Math.atan2(dz, dx); // Three.js Y-rotation for X-aligned box
  const ux = dx / wallLen;
  const uz = dz / wallLen;

  const effectiveWallHeight =
    sectionCutHeightFt !== undefined
      ? Math.max(0, Math.min(wall.height, sectionCutHeightFt - floorElevationFt))
      : wall.height;

  if (effectiveWallHeight <= 0.1) return [];

  const thickness = wall.thickness || 0.5;
  const meshes: BoxMeshSpec3D[] = [];

  // Sort openings along wall from startPoint (0) to endPoint (wallLen)
  const sortedOpenings = [...openingsOnWall]
    .map((op) => {
      const centerDist = Math.max(
        op.width / 2 + 0.25,
        Math.min(wallLen - op.width / 2 - 0.25, op.position * wallLen)
      );
      return {
        opening: op,
        startDist: roundToPrecision(centerDist - op.width / 2, 3),
        endDist: roundToPrecision(centerDist + op.width / 2, 3),
        centerDist: roundToPrecision(centerDist, 3),
      };
    })
    .filter((item) => item.endDist > item.startDist && item.endDist <= wallLen)
    .sort((a, b) => a.startDist - b.startDist);

  const makeSegmentWorldCenter = (
    distStart: number,
    distEnd: number,
    bottomY: number,
    topY: number
  ): { center: Point3D; segLen: number; segHeight: number } => {
    const midDist = (distStart + distEnd) / 2;
    const segLen = roundToPrecision(distEnd - distStart, 3);
    const segHeight = roundToPrecision(topY - bottomY, 3);
    return {
      center: {
        x: roundToPrecision(wall.startPoint.x + ux * midDist, 3),
        y: roundToPrecision(floorElevationFt + bottomY + segHeight / 2, 3),
        z: roundToPrecision(wall.startPoint.y + uz * midDist, 3),
      },
      segLen,
      segHeight,
    };
  };

  if (sortedOpenings.length === 0) {
    const full = makeSegmentWorldCenter(0, wallLen, 0, effectiveWallHeight);
    meshes.push({
      id: `${wall.id}-solid-full`,
      sourceObjectId: wall.id,
      floorId: wall.floorId,
      kind: "wall_solid",
      position: full.center,
      dimensions: {
        width: full.segLen,
        height: full.segHeight,
        depth: thickness,
      },
      rotationYRad: angleRad,
      color: wallColor,
      opacity: 1,
      roughness: 0.85,
      metalness: 0.02,
    });
    return meshes;
  }

  let cursorDist = 0;

  sortedOpenings.forEach((entry, idx) => {
    const { opening, startDist, endDist } = entry;

    // 1. Full-height solid wall segment before this opening
    if (startDist - cursorDist >= 0.15) {
      const solidSeg = makeSegmentWorldCenter(
        cursorDist,
        startDist,
        0,
        effectiveWallHeight
      );
      meshes.push({
        id: `${wall.id}-solid-${idx}`,
        sourceObjectId: wall.id,
        floorId: wall.floorId,
        kind: "wall_solid",
        position: solidSeg.center,
        dimensions: {
          width: solidSeg.segLen,
          height: solidSeg.segHeight,
          depth: thickness,
        },
        rotationYRad: angleRad,
        color: wallColor,
        opacity: 1,
        roughness: 0.85,
        metalness: 0.02,
      });
    }

    const sillTop = Math.min(effectiveWallHeight, opening.sillHeight || 0);
    const openingTop = Math.min(
      effectiveWallHeight,
      (opening.sillHeight || 0) + opening.height
    );

    // 2. Sill wall segment below window (if sillHeight > 0)
    if (sillTop >= 0.15) {
      const sillSeg = makeSegmentWorldCenter(startDist, endDist, 0, sillTop);
      meshes.push({
        id: `${wall.id}-sill-${opening.id}`,
        sourceObjectId: wall.id,
        floorId: wall.floorId,
        kind: "wall_sill",
        position: sillSeg.center,
        dimensions: {
          width: sillSeg.segLen,
          height: sillSeg.segHeight,
          depth: thickness,
        },
        rotationYRad: angleRad,
        color: wallColor,
        opacity: 1,
        roughness: 0.85,
        metalness: 0.02,
      });
    }

    // 3. Lintel header wall segment above opening (if openingTop < effectiveWallHeight)
    if (effectiveWallHeight - openingTop >= 0.15) {
      const headerSeg = makeSegmentWorldCenter(
        startDist,
        endDist,
        openingTop,
        effectiveWallHeight
      );
      meshes.push({
        id: `${wall.id}-header-${opening.id}`,
        sourceObjectId: wall.id,
        floorId: wall.floorId,
        kind: "wall_header",
        position: headerSeg.center,
        dimensions: {
          width: headerSeg.segLen,
          height: headerSeg.segHeight,
          depth: thickness,
        },
        rotationYRad: angleRad,
        color: wallColor,
        opacity: 1,
        roughness: 0.85,
        metalness: 0.02,
      });
    }

    // 4. Architectural Frame & Door Leaf / Window Glazing inside the opening void
    if (openingTop - sillTop >= 0.5) {
      const voidSeg = makeSegmentWorldCenter(
        startDist,
        endDist,
        sillTop,
        openingTop
      );
      const isDoor = opening.type.includes("door");

      // Perimeter Frame Mesh
      meshes.push({
        id: `opening-frame-${opening.id}`,
        sourceObjectId: opening.id,
        floorId: wall.floorId,
        kind: isDoor ? "door_frame" : "window_frame",
        position: voidSeg.center,
        dimensions: {
          width: voidSeg.segLen,
          height: voidSeg.segHeight,
          depth: roundToPrecision(thickness + 0.06, 3),
        },
        rotationYRad: angleRad,
        color: isDoor ? "#8B6947" : "#444440",
        opacity: 1,
        roughness: 0.55,
        metalness: isDoor ? 0.08 : 0.25,
      });

      // Inner Door Panel or Window Glass Pane
      meshes.push({
        id: `opening-mesh-${opening.id}`,
        sourceObjectId: opening.id,
        floorId: wall.floorId,
        kind: isDoor ? "door_leaf" : "window_glass",
        position: voidSeg.center,
        dimensions: {
          width: Math.max(0.4, roundToPrecision(voidSeg.segLen - 0.24, 3)),
          height: Math.max(0.4, roundToPrecision(voidSeg.segHeight - 0.2, 3)),
          depth: isDoor ? Math.min(0.22, thickness * 0.45) : 0.08,
        },
        rotationYRad: angleRad,
        color: isDoor ? "#B6916B" : "#C8E0EC",
        opacity: isDoor ? 0.96 : 0.36,
        roughness: isDoor ? 0.42 : 0.08,
        metalness: isDoor ? 0.05 : 0.18,
      });
    }

    cursorDist = Math.max(cursorDist, endDist);
  });

  // 5. Trailing full-height wall segment after last opening
  if (wallLen - cursorDist >= 0.15) {
    const tailSeg = makeSegmentWorldCenter(
      cursorDist,
      wallLen,
      0,
      effectiveWallHeight
    );
    meshes.push({
      id: `${wall.id}-solid-tail`,
      sourceObjectId: wall.id,
      floorId: wall.floorId,
      kind: "wall_solid",
      position: tailSeg.center,
      dimensions: {
        width: tailSeg.segLen,
        height: tailSeg.segHeight,
        depth: thickness,
      },
      rotationYRad: angleRad,
      color: wallColor,
      opacity: 1,
      roughness: 0.85,
      metalness: 0.02,
    });
  }

  return meshes;
}

/**
 * Generates the complete synchronized 3D mesh list for a `BuildingProject`
 * according to the active 3D view mode (`orbit`, `dollhouse`, `floor_isolation`, `section`, `walkthrough`, `top_ortho`).
 */
export function deriveBuildingSceneMeshes3D(
  project: BuildingProject,
  options: {
    viewMode: ViewMode3D;
    selectedFloorId: string;
    sectionCutHeightFt?: number;
    explodedFloorGapFt?: number;
    showCeilings?: boolean;
    roofStyle?: RoofStyle3D;
  }
): BoxMeshSpec3D[] {
  const meshes: BoxMeshSpec3D[] = [];
  const materialMap = new Map(project.materials.map((m) => [m.id, m]));
  const isDollhouse =
    options.viewMode === "dollhouse" || options.viewMode === "top_ortho";
  const isIsolation = options.viewMode === "floor_isolation";
  const isSection = options.viewMode === "section";
  const cutHeight = isSection
    ? options.sectionCutHeightFt ?? project.settings.sectionCutHeight
    : undefined;
  const explodedGap = Math.max(0, options.explodedFloorGapFt || 0);
  const roofStyle: RoofStyle3D = options.roofStyle || "parapet";

  const sortedFloors = [...project.floors].sort(
    (a, b) => a.levelIndex - b.levelIndex
  );

  const sb = project.plot.setbacks;
  const envW = Math.max(12, project.plot.width - sb.left - sb.right);
  const envL = Math.max(12, project.plot.length - sb.front - sb.back);
  const envCenterX = roundToPrecision(sb.left + envW / 2, 2);
  const envCenterZ = roundToPrecision(sb.front + envL / 2, 2);

  sortedFloors.forEach((floor, stackIdx) => {
    if (!floor.visible) return;
    if (isIsolation && floor.id !== options.selectedFloorId) return;

    const effectiveElevation = roundToPrecision(
      floor.elevation + stackIdx * explodedGap,
      2
    );
    if (cutHeight !== undefined && effectiveElevation >= cutHeight) return;

    const slabThick = Math.max(0.35, floor.floorHeight || 0.5);

    // 1. Structural Floor Base Slab
    meshes.push({
      id: `structural-slab-${floor.id}`,
      sourceObjectId: floor.id,
      floorId: floor.id,
      kind: "floor_slab",
      position: {
        x: envCenterX,
        y: roundToPrecision(effectiveElevation - slabThick / 2, 2),
        z: envCenterZ,
      },
      dimensions: {
        width: envW,
        height: slabThick,
        depth: envL,
      },
      rotationYRad: 0,
      color: "#EAE6DF",
      opacity: 1,
      roughness: 0.78,
      metalness: 0.02,
    });

    // 2. Room Floor Finish Slabs
    for (const room of floor.rooms) {
      const bounds = computePolygonBoundsFt(room.polygon);
      if (bounds.width < 1 || bounds.length < 1) continue;
      const mat = materialMap.get(room.floorMaterialId);

      meshes.push({
        id: `room-slab-${room.id}`,
        sourceObjectId: room.id,
        floorId: floor.id,
        kind: "room_floor",
        position: {
          x: roundToPrecision(bounds.minX + bounds.width / 2, 2),
          y: roundToPrecision(effectiveElevation + 0.04, 2),
          z: roundToPrecision(bounds.minY + bounds.length / 2, 2),
        },
        dimensions: {
          width: bounds.width,
          height: 0.08,
          depth: bounds.length,
        },
        rotationYRad: 0,
        color: mat?.color || room.color || "#F2EFE9",
        opacity: 1,
        roughness: mat?.roughness ?? 0.35,
        metalness: mat?.metalness ?? 0.05,
      });

      // Optional Ceiling Slab
      if (
        options.showCeilings &&
        !isDollhouse &&
        !isSection &&
        !isIsolation
      ) {
        const ceilMat = materialMap.get(
          room.ceilingMaterialId || room.wallMaterialId
        );
        meshes.push({
          id: `room-ceiling-${room.id}`,
          sourceObjectId: room.id,
          floorId: floor.id,
          kind: "ceiling_slab",
          position: {
            x: roundToPrecision(bounds.minX + bounds.width / 2, 2),
            y: roundToPrecision(
              effectiveElevation + floor.ceilingHeight - 0.05,
              2
            ),
            z: roundToPrecision(bounds.minY + bounds.length / 2, 2),
          },
          dimensions: {
            width: bounds.width,
            height: 0.1,
            depth: bounds.length,
          },
          rotationYRad: 0,
          color: ceilMat?.color || "#FBFBF9",
          opacity: 0.96,
          roughness: ceilMat?.roughness ?? 0.85,
          metalness: ceilMat?.metalness ?? 0.01,
        });
      }
    }

    // 3. Walls & Hosted Openings
    const wallCutHeight = isDollhouse
      ? effectiveElevation + Math.min(floor.ceilingHeight * 0.45, 4.5)
      : cutHeight;

    for (const wall of floor.walls) {
      const mat = materialMap.get(wall.materialId);
      const wallOpenings = floor.openings.filter((o) => o.wallId === wall.id);
      const wallMeshes = generateWallAndOpeningMeshes3D(
        wall,
        wallOpenings,
        effectiveElevation,
        mat?.color || "#F9F8F6",
        wallCutHeight
      );
      meshes.push(...wallMeshes);
    }

    // 4. Staircases & Interior Furniture Objects
    for (const obj of floor.objects) {
      if (obj.category === "staircases") {
        const risers = obj.stairMetadata?.riserCount || 14;
        const stepCount = Math.min(20, Math.max(6, risers));
        const totalRise = obj.dimensions.height || floor.ceilingHeight;
        const stepRise = totalRise / stepCount;
        const stairType = obj.stairMetadata?.stairType || "straight";
        const baseRotRad = ((obj.rotation || 0) * Math.PI) / 180;

        for (let s = 0; s < stepCount; s++) {
          const stepY = effectiveElevation + (s + 0.5) * stepRise;
          if (cutHeight !== undefined && stepY > cutHeight) break;

          let stepX = obj.position.x + obj.dimensions.width / 2;
          let stepZ =
            obj.position.z + (s + 0.5) * (obj.dimensions.depth / stepCount);
          let stepRot = baseRotRad;
          let stepW = obj.dimensions.width;
          let stepD = Math.max(0.75, obj.dimensions.depth / stepCount);

          if (stairType === "spiral") {
            const radius = Math.max(2.5, obj.dimensions.width * 0.42);
            const theta = (s / stepCount) * Math.PI * 1.75 + baseRotRad;
            stepX = obj.position.x + obj.dimensions.width / 2 + Math.cos(theta) * (radius * 0.5);
            stepZ = obj.position.z + obj.dimensions.depth / 2 + Math.sin(theta) * (radius * 0.5);
            stepRot = -theta;
            stepW = radius;
            stepD = 1.1;
          } else if (stairType === "u_shaped") {
            const half = Math.floor(stepCount / 2);
            const flightW = Math.max(2.5, obj.dimensions.width * 0.44);
            stepW = flightW;
            if (s < half) {
              stepX = obj.position.x + flightW / 2;
              stepZ =
                obj.position.z + (s + 0.5) * ((obj.dimensions.depth * 0.8) / half);
            } else {
              const rem = s - half;
              stepX = obj.position.x + obj.dimensions.width - flightW / 2;
              stepZ =
                obj.position.z +
                obj.dimensions.depth * 0.8 -
                (rem + 0.5) * ((obj.dimensions.depth * 0.8) / Math.max(1, stepCount - half));
            }
          }

          meshes.push({
            id: `${obj.id}-step-${s}`,
            sourceObjectId: obj.id,
            floorId: floor.id,
            kind: "stair_step",
            position: {
              x: roundToPrecision(stepX, 2),
              y: roundToPrecision(stepY, 2),
              z: roundToPrecision(stepZ, 2),
            },
            dimensions: {
              width: roundToPrecision(stepW, 2),
              height: roundToPrecision(stepRise * 0.9, 2),
              depth: roundToPrecision(stepD * 0.95, 2),
            },
            rotationYRad: stepRot,
            color: obj.color || "#C8A986",
            opacity: 1,
            roughness: 0.45,
            metalness: 0.05,
          });
        }
      } else {
        const furnMat = materialMap.get(obj.materialId);
        const furnMeshes = generateProceduralFurnitureMeshes3D(
          obj,
          effectiveElevation,
          furnMat?.color || obj.color || "#C5A880",
          furnMat?.roughness ?? 0.48,
          furnMat?.metalness ?? 0.08
        );
        meshes.push(
          ...furnMeshes.filter(
            (fm) => cutHeight === undefined || fm.position.y <= cutHeight
          )
        );
      }
    }
  });

  // 5. Optional Roof Geometry (shown when showRoof3D is true and not in Dollhouse/Section/Isolation mode)
  if (
    project.settings.showRoof3D &&
    !isDollhouse &&
    !isIsolation &&
    !isSection &&
    sortedFloors.length > 0
  ) {
    const topIdx = sortedFloors.length - 1;
    const topFloor = sortedFloors[topIdx];
    const roofBaseY =
      topFloor.elevation +
      topIdx * explodedGap +
      topFloor.ceilingHeight +
      0.35;

    // Base Roof Slab
    meshes.push({
      id: "building-roof-slab",
      sourceObjectId: topFloor.id,
      floorId: topFloor.id,
      kind: "roof",
      position: {
        x: envCenterX,
        y: roundToPrecision(roofBaseY, 2),
        z: envCenterZ,
      },
      dimensions: {
        width: envW + 1.5,
        height: 0.7,
        depth: envL + 1.5,
      },
      rotationYRad: 0,
      color: "#EAE6DF",
      opacity: 0.96,
      roughness: 0.7,
      metalness: 0.05,
    });

    if (roofStyle === "parapet") {
      const parapetH = 2.8;
      const pThick = 0.6;
      const pY = roundToPrecision(roofBaseY + 0.35 + parapetH / 2, 2);
      // North & South parapet walls
      meshes.push(
        {
          id: "roof-parapet-north",
          sourceObjectId: topFloor.id,
          floorId: topFloor.id,
          kind: "roof",
          position: { x: envCenterX, y: pY, z: roundToPrecision(sb.front, 2) },
          dimensions: { width: envW + 1.5, height: parapetH, depth: pThick },
          rotationYRad: 0,
          color: "#F4F1EA",
          opacity: 1,
          roughness: 0.8,
          metalness: 0.02,
        },
        {
          id: "roof-parapet-south",
          sourceObjectId: topFloor.id,
          floorId: topFloor.id,
          kind: "roof",
          position: {
            x: envCenterX,
            y: pY,
            z: roundToPrecision(sb.front + envL, 2),
          },
          dimensions: { width: envW + 1.5, height: parapetH, depth: pThick },
          rotationYRad: 0,
          color: "#F4F1EA",
          opacity: 1,
          roughness: 0.8,
          metalness: 0.02,
        }
      );
    } else if (roofStyle === "gable" || roofStyle === "hip") {
      // Tiered architectural pitched roof crown
      const tiers = 3;
      for (let t = 1; t <= tiers; t++) {
        const scale = 1 - t * 0.22;
        meshes.push({
          id: `roof-crown-tier-${t}`,
          sourceObjectId: topFloor.id,
          floorId: topFloor.id,
          kind: "roof",
          position: {
            x: envCenterX,
            y: roundToPrecision(roofBaseY + t * 1.1, 2),
            z: envCenterZ,
          },
          dimensions: {
            width: roundToPrecision(envW * scale, 2),
            height: 1.1,
            depth: roundToPrecision(
              roofStyle === "gable" ? envL : envL * scale,
              2
            ),
          },
          rotationYRad: 0,
          color: "#D8CFC2",
          opacity: 0.96,
          roughness: 0.65,
          metalness: 0.06,
        });
      }
    }
  }

  return meshes;
}
