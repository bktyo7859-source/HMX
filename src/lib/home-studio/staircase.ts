import {
  BuildingProject,
  Floor,
  FurnitureItem,
  Point2D,
  StaircaseMetadata,
  StaircaseType,
} from "../../types/homeStudio";
import { roundToPrecision } from "./units";

export interface StaircaseDesignInput {
  stairType: StaircaseType;
  widthFt: number;
  treadDepthInches: number;
  startingFloor: Floor;
  destinationFloor?: Floor;
  landingDepthFt?: number;
  headroomClearanceFt?: number;
}

export interface StaircaseValidationDiagnostic {
  severity: "warning" | "error" | "ok";
  code: string;
  message: string;
}

export interface ComputedStaircaseSpec {
  metadata: StaircaseMetadata;
  footprintWidthFt: number;
  footprintDepthFt: number;
  diagnostics: StaircaseValidationDiagnostic[];
  disclaimer: string;
}

export const STAIRCASE_ENGINEERING_DISCLAIMER =
  "Architectural layout guide only — not certified structural engineering approval. Actual stair framing, slab cutouts, and code compliance must be verified by a licensed structural engineer.";

/**
 * Computes riser count, riser height, tread run, bounding footprint, and architectural
 * clearance diagnostics for Straight, L-shaped, U-shaped, and Spiral staircases.
 */
export function computeStaircaseSpecification(
  input: StaircaseDesignInput
): ComputedStaircaseSpec {
  const totalRiseFt = input.destinationFloor
    ? Math.max(
        6,
        roundToPrecision(
          Math.abs(input.destinationFloor.elevation - input.startingFloor.elevation),
          2
        )
      )
    : roundToPrecision(
        input.startingFloor.ceilingHeight + input.startingFloor.floorHeight,
        2
      );

  const totalRiseInches = totalRiseFt * 12;
  // Target ideal residential riser height ~ 6.75" to 7.25"
  const riserCount = Math.max(4, Math.round(totalRiseInches / 7.0));
  const riserHeightInches = roundToPrecision(totalRiseInches / riserCount, 2);
  const treadDepthInches = Math.max(8, input.treadDepthInches || 10.5);
  const treadDepthFt = roundToPrecision(treadDepthInches / 12, 2);
  const widthFt = Math.max(2.5, roundToPrecision(input.widthFt || 3.5, 2));
  const landingDepthFt = roundToPrecision(
    input.landingDepthFt ?? widthFt,
    2
  );
  const headroomClearanceFt = roundToPrecision(
    input.headroomClearanceFt ?? Math.max(7.0, input.startingFloor.ceilingHeight - 1.5),
    2
  );

  let footprintWidthFt = widthFt;
  let footprintDepthFt = roundToPrecision((riserCount - 1) * treadDepthFt, 2);

  if (input.stairType === "l_shaped") {
    const halfTreads = Math.ceil((riserCount - 1) / 2);
    footprintWidthFt = roundToPrecision(widthFt + landingDepthFt + 3, 2);
    footprintDepthFt = roundToPrecision(
      halfTreads * treadDepthFt + landingDepthFt,
      2
    );
  } else if (input.stairType === "u_shaped") {
    const halfTreads = Math.ceil((riserCount - 1) / 2);
    footprintWidthFt = roundToPrecision(widthFt * 2 + 1.0, 2); // Two parallel flights + 1 ft well gap
    footprintDepthFt = roundToPrecision(
      halfTreads * treadDepthFt + landingDepthFt,
      2
    );
  } else if (input.stairType === "spiral") {
    const diameter = Math.max(5.0, roundToPrecision(widthFt * 1.6, 2));
    footprintWidthFt = diameter;
    footprintDepthFt = diameter;
  }

  const diagnostics: StaircaseValidationDiagnostic[] = [];

  // 1. Riser height check (standard residential comfort: 6.0" - 7.75")
  if (riserHeightInches > 7.75) {
    diagnostics.push({
      severity: "warning",
      code: "RISER_TOO_STEEP",
      message: `Riser height (${riserHeightInches}") exceeds 7.75" residential comfort threshold.`,
    });
  } else if (riserHeightInches < 5.5) {
    diagnostics.push({
      severity: "warning",
      code: "RISER_TOO_SHALLOW",
      message: `Riser height (${riserHeightInches}") is unusually shallow (< 5.5").`,
    });
  }

  // 2. Tread depth check (minimum 10" for straight/L/U stairs)
  if (input.stairType !== "spiral" && treadDepthInches < 10) {
    diagnostics.push({
      severity: "warning",
      code: "TREAD_TOO_NARROW",
      message: `Tread depth (${treadDepthInches}") is less than recommended 10" minimum.`,
    });
  }

  // 3. Width check (minimum 3' 0" for primary residential stairs)
  if (widthFt < 3.0) {
    diagnostics.push({
      severity: "warning",
      code: "STAIR_WIDTH_NARROW",
      message: `Stair flight width (${widthFt}') is narrower than 3' 0" standard clearance.`,
    });
  }

  // 4. Headroom clearance check (minimum 6' 8" = 6.67 ft)
  if (headroomClearanceFt < 6.67) {
    diagnostics.push({
      severity: "error",
      code: "INSUFFICIENT_HEADROOM",
      message: `Headroom clearance (${headroomClearanceFt}') is below the 6' 8" (6.67') minimum vertical clearance.`,
    });
  }

  // 5. Floor connection check
  if (
    input.destinationFloor &&
    input.destinationFloor.id === input.startingFloor.id
  ) {
    diagnostics.push({
      severity: "error",
      code: "INVALID_FLOOR_CONNECTION",
      message: "Starting floor and destination floor cannot be identical.",
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      severity: "ok",
      code: "STAIR_GEOMETRY_VALID",
      message: `Staircase geometry verified: ${riserCount} risers @ ${riserHeightInches}" rise, ${treadDepthInches}" tread.`,
    });
  }

  const metadata: StaircaseMetadata = {
    stairType: input.stairType,
    widthFt,
    totalRiseFt,
    riserCount,
    riserHeightInches,
    treadDepthInches,
    startingFloorId: input.startingFloor.id,
    destinationFloorId: input.destinationFloor?.id || input.startingFloor.id,
    landingDepthFt,
    headroomClearanceFt,
  };

  return {
    metadata,
    footprintWidthFt,
    footprintDepthFt,
    diagnostics,
    disclaimer: STAIRCASE_ENGINEERING_DISCLAIMER,
  };
}

/**
 * Checks vertical alignment of staircases across consecutive floors in a project.
 */
export function auditProjectStaircaseAlignment(
  project: BuildingProject
): {
  totalStaircases: number;
  alignedPairsCount: number;
  misalignedWarnings: string[];
} {
  const sortedFloors = [...project.floors].sort(
    (a, b) => a.levelIndex - b.levelIndex
  );
  const stairsByFloor = sortedFloors.map((flr) => ({
    floor: flr,
    stairs: flr.objects.filter((o) => o.category === "staircases"),
  }));

  const totalStaircases = stairsByFloor.reduce(
    (acc, entry) => acc + entry.stairs.length,
    0
  );
  let alignedPairsCount = 0;
  const misalignedWarnings: string[] = [];

  for (let i = 0; i < stairsByFloor.length - 1; i++) {
    const lower = stairsByFloor[i];
    const upper = stairsByFloor[i + 1];
    if (lower.stairs.length === 0 || upper.stairs.length === 0) continue;

    for (const sLow of lower.stairs) {
      const matchingUpper = upper.stairs.find(
        (sUp) =>
          Math.hypot(
            sUp.position.x - sLow.position.x,
            sUp.position.z - sLow.position.z
          ) <= 1.5
      );
      if (matchingUpper) {
        alignedPairsCount++;
      } else {
        misalignedWarnings.push(
          `Staircase "${sLow.name}" on ${lower.floor.name} has no vertically aligned continuation on ${upper.floor.name} within 1.5' tolerance.`
        );
      }
    }
  }

  return {
    totalStaircases,
    alignedPairsCount,
    misalignedWarnings,
  };
}

export interface FloorStatistics {
  floorId: string;
  floorName: string;
  floorType: Floor["type"];
  levelIndex: number;
  elevationFt: number;
  ceilingHeightFt: number;
  slabThicknessFt: number;
  roomCount: number;
  wallCount: number;
  openingCount: number;
  staircaseCount: number;
  carpetAreaSqFt: number;
  builtUpAreaSqFt: number;
}

export interface BuildingMultiFloorSummary {
  totalFloors: number;
  visibleFloors: number;
  totalRooms: number;
  totalWalls: number;
  totalOpenings: number;
  totalStaircases: number;
  totalCarpetAreaSqFt: number;
  totalBuiltUpAreaSqFt: number;
  totalBuildingHeightFt: number;
  floorStats: FloorStatistics[];
}

/**
 * Computes detailed per-floor and building-wide statistics directly from canonical floor geometry.
 */
export function computeMultiFloorStatistics(
  project: BuildingProject
): BuildingMultiFloorSummary {
  const buildableW = Math.max(
    0,
    project.plot.width - project.plot.setbacks.left - project.plot.setbacks.right
  );
  const buildableL = Math.max(
    0,
    project.plot.length -
      project.plot.setbacks.front -
      project.plot.setbacks.back
  );
  const defaultEnvelopeSqFt = roundToPrecision(buildableW * buildableL, 2);

  const sortedFloors = [...project.floors].sort(
    (a, b) => a.levelIndex - b.levelIndex
  );

  const floorStats: FloorStatistics[] = sortedFloors.map((flr) => {
    const carpetAreaSqFt = roundToPrecision(
      flr.rooms.reduce((sum, r) => sum + (r.dimensions?.area || 0), 0),
      2
    );
    // Built-up area includes wall thickness allowance (~12% over carpet area, or envelope if rooms present)
    const builtUpAreaSqFt =
      carpetAreaSqFt > 0
        ? roundToPrecision(carpetAreaSqFt * 1.12, 2)
        : defaultEnvelopeSqFt;

    const staircaseCount = flr.objects.filter(
      (o) => o.category === "staircases"
    ).length;

    return {
      floorId: flr.id,
      floorName: flr.name,
      floorType: flr.type,
      levelIndex: flr.levelIndex,
      elevationFt: flr.elevation,
      ceilingHeightFt: flr.ceilingHeight,
      slabThicknessFt: flr.floorHeight,
      roomCount: flr.rooms.length,
      wallCount: flr.walls.length,
      openingCount: flr.openings.length,
      staircaseCount,
      carpetAreaSqFt,
      builtUpAreaSqFt,
    };
  });

  const highestFloor = sortedFloors[sortedFloors.length - 1];
  const lowestFloor = sortedFloors[0];
  const totalBuildingHeightFt = highestFloor
    ? roundToPrecision(
        highestFloor.elevation +
          highestFloor.ceilingHeight +
          highestFloor.floorHeight -
          Math.min(0, lowestFloor?.elevation || 0),
        2
      )
    : 0;

  return {
    totalFloors: floorStats.length,
    visibleFloors: sortedFloors.filter((f) => f.visible).length,
    totalRooms: floorStats.reduce((s, f) => s + f.roomCount, 0),
    totalWalls: floorStats.reduce((s, f) => s + f.wallCount, 0),
    totalOpenings: floorStats.reduce((s, f) => s + f.openingCount, 0),
    totalStaircases: floorStats.reduce((s, f) => s + f.staircaseCount, 0),
    totalCarpetAreaSqFt: roundToPrecision(
      floorStats.reduce((s, f) => s + f.carpetAreaSqFt, 0),
      2
    ),
    totalBuiltUpAreaSqFt: roundToPrecision(
      floorStats.reduce((s, f) => s + f.builtUpAreaSqFt, 0),
      2
    ),
    totalBuildingHeightFt,
    floorStats,
  };
}

