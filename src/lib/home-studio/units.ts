import { Point2D, UnitSystem } from "../../types/homeStudio";

export const FEET_TO_METRES = 0.3048;
export const METRES_TO_FEET = 1 / FEET_TO_METRES; // ~3.280839895
export const SQFT_TO_SQM = 0.09290304;
export const SQM_TO_SQFT = 1 / SQFT_TO_SQM; // ~10.7639104

/**
 * Rounds a number to a fixed decimal precision to prevent floating point drift.
 */
export function roundToPrecision(value: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Converts canonical feet to metres.
 */
export function feetToMetres(feet: number, decimals: number = 4): number {
  return roundToPrecision(feet * FEET_TO_METRES, decimals);
}

/**
 * Converts metres to canonical feet.
 */
export function metresToFeet(metres: number, decimals: number = 4): number {
  return roundToPrecision(metres * METRES_TO_FEET, decimals);
}

/**
 * Converts feet and inches to canonical decimal feet.
 */
export function feetInchesToDecimalFeet(feet: number, inches: number = 0): number {
  return roundToPrecision(feet + inches / 12, 4);
}

/**
 * Decomposes decimal feet into whole feet and rounded inches (0 - 11).
 */
export function decimalFeetToFeetInches(decimalFeet: number): {
  feet: number;
  inches: number;
} {
  const sign = decimalFeet < 0 ? -1 : 1;
  const abs = Math.abs(decimalFeet);
  let wholeFeet = Math.floor(abs);
  let inches = Math.round((abs - wholeFeet) * 12);

  if (inches >= 12) {
    wholeFeet += 1;
    inches = 0;
  }

  return {
    feet: wholeFeet * sign,
    inches,
  };
}

/**
 * Converts square feet to square metres.
 */
export function sqFtToSqM(sqFt: number, decimals: number = 2): number {
  return roundToPrecision(sqFt * SQFT_TO_SQM, decimals);
}

/**
 * Converts square metres to square feet.
 */
export function sqMToSqFt(sqM: number, decimals: number = 2): number {
  return roundToPrecision(sqM * SQM_TO_SQFT, decimals);
}

/**
 * Formats a linear measurement stored in canonical feet for display in `ft` (e.g. `14' 6"`) or `m` (e.g. `4.42 m`).
 */
export function formatArchitecturalLength(
  valueFt: number,
  unit: UnitSystem = "ft"
): string {
  if (unit === "m") {
    return `${feetToMetres(valueFt, 2).toFixed(2)} m`;
  }
  const { feet, inches } = decimalFeetToFeetInches(valueFt);
  return `${feet}' ${inches}"`;
}

/**
 * Formats an area stored in canonical square feet for display in `ft` (`sq ft`) or `m` (`sq m`).
 */
export function formatArchitecturalArea(
  areaSqFt: number,
  unit: UnitSystem = "ft"
): string {
  if (unit === "m") {
    const sqm = sqFtToSqM(areaSqFt, 1);
    return `${sqm.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq m`;
  }
  return `${Math.round(areaSqFt).toLocaleString()} sq ft`;
}

/**
 * Computes polygon area in square feet using the Shoelace formula.
 */
export function computePolygonAreaSqFt(vertices: Point2D[]): number {
  if (vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    sum += curr.x * next.y - next.x * curr.y;
  }
  return roundToPrecision(Math.abs(sum) / 2, 2);
}

/**
 * Computes bounding box width and length of a polygon in feet.
 */
export function computePolygonBoundsFt(vertices: Point2D[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  length: number;
} {
  if (vertices.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, length: 0 };
  }
  const xs = vertices.map((p) => p.x);
  const ys = vertices.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: roundToPrecision(maxX - minX, 2),
    length: roundToPrecision(maxY - minY, 2),
  };
}
