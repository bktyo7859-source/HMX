import { Opening, Point2D, Room, Wall } from "../../types/homeStudio";
import { roundToPrecision } from "./units";

/**
 * Snaps a coordinate in feet to the nearest grid interval if grid snapping is enabled.
 */
export function snapValueToGrid(
  valueFt: number,
  gridSizeFt: number,
  enabled: boolean
): number {
  if (!enabled || gridSizeFt <= 0) {
    return roundToPrecision(valueFt, 2);
  }
  return roundToPrecision(Math.round(valueFt / gridSizeFt) * gridSizeFt, 2);
}

/**
 * Clamps a 2D point in feet within the plot boundaries `[0, plotWidth]` and `[0, plotLength]`.
 */
export function clampPointToPlot(
  pt: Point2D,
  plotWidthFt: number,
  plotLengthFt: number
): Point2D {
  return {
    x: roundToPrecision(Math.max(0, Math.min(plotWidthFt, pt.x)), 2),
    y: roundToPrecision(Math.max(0, Math.min(plotLengthFt, pt.y)), 2),
  };
}

/**
 * Snaps a 2D point in feet to existing wall endpoints (if within `snapRadiusFt`)
 * or to the architectural grid.
 */
export function snapPoint2D(
  rawPointFt: Point2D,
  options: {
    gridSizeFt: number;
    snapToGrid: boolean;
    snapToWall: boolean;
    walls: Wall[];
    rooms?: Room[];
    snapRadiusFt?: number;
    plotWidthFt?: number;
    plotLengthFt?: number;
  }
): { point: Point2D; snappedToEndpoint: boolean } {
  const radius = options.snapRadiusFt ?? 1.25;
  let candidate = { ...rawPointFt };

  if (options.plotWidthFt && options.plotLengthFt) {
    candidate = clampPointToPlot(
      candidate,
      options.plotWidthFt,
      options.plotLengthFt
    );
  }

  // 1. Check wall endpoints & room corners first if snapToWall is active
  if (options.snapToWall) {
    let bestDist = radius;
    let bestAnchor: Point2D | null = null;

    for (const wall of options.walls) {
      for (const anchor of [wall.startPoint, wall.endPoint]) {
        const d = Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y);
        if (d <= bestDist) {
          bestDist = d;
          bestAnchor = anchor;
        }
      }
    }

    if (options.rooms) {
      for (const room of options.rooms) {
        for (const corner of room.polygon) {
          const d = Math.hypot(candidate.x - corner.x, candidate.y - corner.y);
          if (d <= bestDist) {
            bestDist = d;
            bestAnchor = corner;
          }
        }
      }
    }

    if (bestAnchor) {
      return {
        point: {
          x: roundToPrecision(bestAnchor.x, 2),
          y: roundToPrecision(bestAnchor.y, 2),
        },
        snappedToEndpoint: true,
      };
    }
  }

  // 2. Otherwise snap to grid
  return {
    point: {
      x: snapValueToGrid(candidate.x, options.gridSizeFt, options.snapToGrid),
      y: snapValueToGrid(candidate.y, options.gridSizeFt, options.snapToGrid),
    },
    snappedToEndpoint: false,
  };
}

/**
 * Computes the length of a wall in feet.
 */
export function computeWallLengthFt(
  wall: Pick<Wall, "startPoint" | "endPoint">
): number {
  return roundToPrecision(
    Math.hypot(
      wall.endPoint.x - wall.startPoint.x,
      wall.endPoint.y - wall.startPoint.y
    ),
    2
  );
}

/**
 * Projects a 2D point in feet onto a wall segment and returns the normalized position `t` in `[0, 1]`,
 * perpendicular distance in feet, and world coordinates of the projected point.
 */
export function projectPointOntoWall(
  pt: Point2D,
  wall: Wall
): {
  t: number;
  distanceFt: number;
  projectedPoint: Point2D;
  wallLengthFt: number;
} {
  const dx = wall.endPoint.x - wall.startPoint.x;
  const dy = wall.endPoint.y - wall.startPoint.y;
  const lenSq = dx * dx + dy * dy;
  const wallLengthFt = Math.sqrt(lenSq);

  if (lenSq < 1e-6) {
    return {
      t: 0,
      distanceFt: Math.hypot(pt.x - wall.startPoint.x, pt.y - wall.startPoint.y),
      projectedPoint: { ...wall.startPoint },
      wallLengthFt: 0,
    };
  }

  const rawT =
    ((pt.x - wall.startPoint.x) * dx + (pt.y - wall.startPoint.y) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, rawT));

  const projectedPoint = {
    x: roundToPrecision(wall.startPoint.x + t * dx, 2),
    y: roundToPrecision(wall.startPoint.y + t * dy, 2),
  };

  const distanceFt = roundToPrecision(
    Math.hypot(pt.x - projectedPoint.x, pt.y - projectedPoint.y),
    2
  );

  return {
    t: roundToPrecision(t, 4),
    distanceFt,
    projectedPoint,
    wallLengthFt: roundToPrecision(wallLengthFt, 2),
  };
}

/**
 * Finds the nearest wall to a given point in feet within `maxDistanceFt`.
 */
export function findNearestWall(
  pt: Point2D,
  walls: Wall[],
  maxDistanceFt: number = 3.0
): {
  wall: Wall;
  t: number;
  distanceFt: number;
  projectedPoint: Point2D;
  wallLengthFt: number;
} | null {
  let best: {
    wall: Wall;
    t: number;
    distanceFt: number;
    projectedPoint: Point2D;
    wallLengthFt: number;
  } | null = null;

  for (const wall of walls) {
    const proj = projectPointOntoWall(pt, wall);
    if (proj.distanceFt <= maxDistanceFt) {
      if (!best || proj.distanceFt < best.distanceFt) {
        best = { wall, ...proj };
      }
    }
  }

  return best;
}

/**
 * Validates whether an opening of `openingWidthFt` can be placed or moved to normalized `position`
 * (`0` to `1`) along `wall` without extending beyond wall corners or colliding with other openings.
 */
export function validateOpeningOnWall(
  wall: Wall,
  existingOpeningsOnWall: Opening[],
  position: number,
  openingWidthFt: number,
  ignoreOpeningId?: string
): {
  valid: boolean;
  clampedPosition: number;
  offsetFromStartFt: number;
  reason?: string;
} {
  const wallLen = computeWallLengthFt(wall);
  const minMarginFt = 0.5; // 6-inch structural jamb margin from wall ends

  if (openingWidthFt + minMarginFt * 2 > wallLen) {
    return {
      valid: false,
      clampedPosition: 0.5,
      offsetFromStartFt: wallLen / 2,
      reason: `Opening width (${openingWidthFt}') plus structural jamb margin exceeds wall length (${wallLen}').`,
    };
  }

  const halfWidthRatio = openingWidthFt / 2 / wallLen;
  const marginRatio = minMarginFt / wallLen;
  const minT = halfWidthRatio + marginRatio;
  const maxT = 1 - halfWidthRatio - marginRatio;

  const clampedPosition = roundToPrecision(
    Math.max(minT, Math.min(maxT, position)),
    4
  );
  const centerOffsetFt = roundToPrecision(clampedPosition * wallLen, 2);
  const startFt = centerOffsetFt - openingWidthFt / 2;
  const endFt = centerOffsetFt + openingWidthFt / 2;

  for (const other of existingOpeningsOnWall) {
    if (other.id === ignoreOpeningId) continue;
    const otherCenterFt = other.position * wallLen;
    const otherStartFt = otherCenterFt - other.width / 2;
    const otherEndFt = otherCenterFt + other.width / 2;

    if (startFt < otherEndFt + 0.25 && endFt > otherStartFt - 0.25) {
      return {
        valid: false,
        clampedPosition,
        offsetFromStartFt: roundToPrecision(startFt, 2),
        reason: `Opening overlaps with existing "${other.name}" on this wall.`,
      };
    }
  }

  return {
    valid: true,
    clampedPosition,
    offsetFromStartFt: roundToPrecision(startFt, 2),
  };
}

/**
 * Applies orthogonal (horizontal or vertical) axis lock relative to `anchorFt`
 * when the angle is within `angleToleranceDeg` (default 10 degrees) or when `forceOrtho` is true.
 */
export function snapOrthogonalPoint(
  anchorFt: Point2D,
  targetFt: Point2D,
  options?: { forceOrtho?: boolean; angleToleranceDeg?: number }
): { point: Point2D; axis: "horizontal" | "vertical" | "free" } {
  const dx = targetFt.x - anchorFt.x;
  const dy = targetFt.y - anchorFt.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.01) {
    return { point: { ...targetFt }, axis: "free" };
  }

  const tolDeg = options?.angleToleranceDeg ?? 8;
  const angleDeg = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;

  if (options?.forceOrtho) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      return {
        point: { x: roundToPrecision(targetFt.x, 2), y: anchorFt.y },
        axis: "horizontal",
      };
    } else {
      return {
        point: { x: anchorFt.x, y: roundToPrecision(targetFt.y, 2) },
        axis: "vertical",
      };
    }
  }

  if (angleDeg <= tolDeg) {
    return {
      point: { x: roundToPrecision(targetFt.x, 2), y: anchorFt.y },
      axis: "horizontal",
    };
  }
  if (90 - angleDeg <= tolDeg) {
    return {
      point: { x: anchorFt.x, y: roundToPrecision(targetFt.y, 2) },
      axis: "vertical",
    };
  }

  return { point: { ...targetFt }, axis: "free" };
}

/**
 * Converts canonical architectural coordinates (feet) to canvas stage coordinates (pixels).
 */
export function worldFeetToCanvasPx(
  pointFt: Point2D,
  pixelsPerFoot: number = 12
): Point2D {
  return {
    x: roundToPrecision(pointFt.x * pixelsPerFoot, 2),
    y: roundToPrecision(pointFt.y * pixelsPerFoot, 2),
  };
}

/**
 * Converts canvas stage coordinates (pixels) to canonical architectural coordinates (feet).
 */
export function canvasPxToWorldFeet(
  pointPx: Point2D,
  pixelsPerFoot: number = 12
): Point2D {
  if (pixelsPerFoot <= 0) return { x: 0, y: 0 };
  return {
    x: roundToPrecision(pointPx.x / pixelsPerFoot, 2),
    y: roundToPrecision(pointPx.y / pixelsPerFoot, 2),
  };
}

/**
 * Checks if two axis-aligned room bounding boxes overlap significantly (more than `toleranceFt`).
 */
export function checkRoomOverlap(
  candidatePolygon: Point2D[],
  existingRooms: Room[],
  ignoreRoomId?: string,
  toleranceFt: number = 0.25
): { overlaps: boolean; overlappingRoomName?: string } {
  const cXs = candidatePolygon.map((p) => p.x);
  const cYs = candidatePolygon.map((p) => p.y);
  const cMinX = Math.min(...cXs) + toleranceFt;
  const cMaxX = Math.max(...cXs) - toleranceFt;
  const cMinY = Math.min(...cYs) + toleranceFt;
  const cMaxY = Math.max(...cYs) - toleranceFt;

  if (cMaxX <= cMinX || cMaxY <= cMinY) {
    return { overlaps: false };
  }

  for (const room of existingRooms) {
    if (room.id === ignoreRoomId) continue;
    const rXs = room.polygon.map((p) => p.x);
    const rYs = room.polygon.map((p) => p.y);
    const rMinX = Math.min(...rXs);
    const rMaxX = Math.max(...rXs);
    const rMinY = Math.min(...rYs);
    const rMaxY = Math.max(...rYs);

    const overlapX = cMinX < rMaxX && cMaxX > rMinX;
    const overlapY = cMinY < rMaxY && cMaxY > rMinY;
    if (overlapX && overlapY) {
      return { overlaps: true, overlappingRoomName: room.name };
    }
  }

  return { overlaps: false };
}

/**
 * Detects simple rectangular enclosed regions bounded by connected horizontal and vertical walls.
 */
export function detectEnclosedRectanglesFromWalls(
  walls: Wall[],
  toleranceFt: number = 0.5
): Point2D[][] {
  const horiz: { y: number; x1: number; x2: number }[] = [];
  const vert: { x: number; y1: number; y2: number }[] = [];

  for (const w of walls) {
    const dx = Math.abs(w.endPoint.x - w.startPoint.x);
    const dy = Math.abs(w.endPoint.y - w.startPoint.y);
    if (dy <= toleranceFt && dx >= 3) {
      horiz.push({
        y: roundToPrecision((w.startPoint.y + w.endPoint.y) / 2, 1),
        x1: Math.min(w.startPoint.x, w.endPoint.x),
        x2: Math.max(w.startPoint.x, w.endPoint.x),
      });
    } else if (dx <= toleranceFt && dy >= 3) {
      vert.push({
        x: roundToPrecision((w.startPoint.x + w.endPoint.x) / 2, 1),
        y1: Math.min(w.startPoint.y, w.endPoint.y),
        y2: Math.max(w.startPoint.y, w.endPoint.y),
      });
    }
  }

  const detected: Point2D[][] = [];
  for (let i = 0; i < horiz.length; i++) {
    for (let j = i + 1; j < horiz.length; j++) {
      const top = horiz[i].y < horiz[j].y ? horiz[i] : horiz[j];
      const bot = horiz[i].y < horiz[j].y ? horiz[j] : horiz[i];
      if (bot.y - top.y < 4) continue;

      for (let u = 0; u < vert.length; u++) {
        for (let v = u + 1; v < vert.length; v++) {
          const left = vert[u].x < vert[v].x ? vert[u] : vert[v];
          const right = vert[u].x < vert[v].x ? vert[v] : vert[u];
          if (right.x - left.x < 4) continue;

          const coversHoriz =
            top.x1 <= left.x + toleranceFt &&
            top.x2 >= right.x - toleranceFt &&
            bot.x1 <= left.x + toleranceFt &&
            bot.x2 >= right.x - toleranceFt;
          const coversVert =
            left.y1 <= top.y + toleranceFt &&
            left.y2 >= bot.y - toleranceFt &&
            right.y1 <= top.y + toleranceFt &&
            right.y2 >= bot.y - toleranceFt;

          if (coversHoriz && coversVert) {
            detected.push([
              { x: left.x, y: top.y },
              { x: right.x, y: top.y },
              { x: right.x, y: bot.y },
              { x: left.x, y: bot.y },
            ]);
          }
        }
      }
    }
  }

  return detected;
}

