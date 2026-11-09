import { BuildingProject, Floor } from "../../types/homeStudio";
import { computeWallLengthFt } from "./geometry2d";
import { computePolygonBoundsFt, roundToPrecision } from "./units";

export type QuantityDerivationType =
  | "geometry_derived"
  | "user_specified"
  | "assumption_based";

export type TakeoffCategoryCode =
  | "earthwork"
  | "concrete"
  | "reinforcement_steel"
  | "masonry"
  | "plastering"
  | "flooring"
  | "roofing_waterproofing"
  | "painting"
  | "doors_windows"
  | "electrical_plumbing";

export interface EstimationAssumptions {
  // A. Earthwork & Foundation Assumptions
  foundationDepthFt: number;
  foundationWidthFt: number;
  soilType: "hard_murrum" | "medium_clay_sand" | "black_cotton" | "rocky";
  backfillCompactionFactor: number;

  // B. Concrete Member Ratio Assumptions (Preliminary — not structural engineering design)
  footingConcreteRatioOfFootprint: number; // cu.ft per sq.ft of ground footprint
  columnConcreteRatioOfBuiltUp: number;    // cu.ft per sq.ft of built-up area
  beamConcreteRatioOfBuiltUp: number;      // cu.ft per sq.ft of built-up area

  // C. Reinforcement Steel Ratios (Preliminary kg per cubic metre of concrete)
  footingSteelKgPerCuM: number;
  columnBeamSteelKgPerCuM: number;
  slabStairSteelKgPerCuM: number;

  // D & F. Masonry & Flooring Allowances
  bricksPerCuFtMasonry: number;
  mortarRatioOfMasonryVolume: number;
  flooringWastagePercent: number;
  skirtingHeightFt: number;

  // J. MEP Allowances
  electricalPointsPer100SqFt: number;
  wiringMetresPerPoint: number;
  plumbingFixturesPerBathroom: number;
  waterSupplyPipeMetresPerWetRoom: number;
  drainagePipeMetresPerWetRoom: number;
}

export const DEFAULT_ESTIMATION_ASSUMPTIONS: EstimationAssumptions = {
  foundationDepthFt: 5.0,
  foundationWidthFt: 3.5,
  soilType: "medium_clay_sand",
  backfillCompactionFactor: 0.68,

  footingConcreteRatioOfFootprint: 0.55,
  columnConcreteRatioOfBuiltUp: 0.085,
  beamConcreteRatioOfBuiltUp: 0.11,

  footingSteelKgPerCuM: 95,
  columnBeamSteelKgPerCuM: 145,
  slabStairSteelKgPerCuM: 90,

  bricksPerCuFtMasonry: 13.5,
  mortarRatioOfMasonryVolume: 0.25,
  flooringWastagePercent: 7.0,
  skirtingHeightFt: 0.33, // 4 inches

  electricalPointsPer100SqFt: 4.5,
  wiringMetresPerPoint: 8.5,
  plumbingFixturesPerBathroom: 5,
  waterSupplyPipeMetresPerWetRoom: 18,
  drainagePipeMetresPerWetRoom: 14,
};

export interface TakeoffLineItem {
  id: string;
  categoryCode: TakeoffCategoryCode;
  categoryLabel: string;
  itemName: string;
  quantity: number;
  unit: string;
  derivationType: QuantityDerivationType;
  formulaUsed: string;
  engineeringNote: string;
  floorId?: string;
}

export interface FloorQuantitySummary {
  floorId: string;
  floorName: string;
  levelIndex: number;
  carpetAreaSqFt: number;
  builtUpAreaSqFt: number;
  externalWallLengthFt: number;
  internalWallLengthFt: number;
  grossWallVolumeCuFt: number;
  openingDeductionVolumeCuFt: number;
  netMasonryVolumeCuFt: number;
  slabConcreteVolumeCuFt: number;
  staircaseConcreteVolumeCuFt: number;
  doorCount: number;
  windowCount: number;
  doorAreaSqFt: number;
  windowAreaSqFt: number;
}

export interface ProjectQuantityTakeoffResult {
  projectId: string;
  calculatedAt: string;
  assumptionsUsed: EstimationAssumptions;
  floorSummaries: FloorQuantitySummary[];
  lineItems: TakeoffLineItem[];

  // Aggregated Engineering Metrics
  plotAreaSqFt: number;
  totalCarpetAreaSqFt: number;
  totalBuiltUpAreaSqFt: number;
  groundFootprintSqFt: number;

  // A. Earthwork
  sitePreparationAreaSqFt: number;
  excavationVolumeCuFt: number;
  backfillingVolumeCuFt: number;

  // B. Concrete (in both cu.ft and cu.m)
  foundationConcreteCuFt: number;
  footingConcreteCuFt: number;
  columnConcreteCuFt: number;
  beamConcreteCuFt: number;
  floorSlabConcreteCuFt: number;
  staircaseConcreteCuFt: number;
  roofSlabConcreteCuFt: number;
  totalConcreteCuFt: number;
  totalConcreteCuM: number;

  // C. Reinforcement Steel
  totalReinforcementSteelKg: number;

  // D. Masonry & Raw Materials
  externalWallVolumeCuFt: number;
  internalPartitionVolumeCuFt: number;
  openingVolumeDeductionCuFt: number;
  netMasonryVolumeCuFt: number;
  totalBricksPieces: number;
  mortarVolumeCuFt: number;
  totalCementBags50Kg: number;
  totalSandCuFt: number;
  totalAggregateCuFt: number;

  // E. Plastering
  internalPlasterAreaSqFt: number;
  externalPlasterAreaSqFt: number;
  ceilingPlasterAreaSqFt: number;
  plasterOpeningDeductionSqFt: number;

  // F. Flooring (by material family + skirting)
  tileFlooringAreaSqFt: number;
  marbleFlooringAreaSqFt: number;
  woodenFlooringAreaSqFt: number;
  skirtingLinearFt: number;
  skirtingAreaSqFt: number;
  totalFlooringWithWastageSqFt: number;

  // G. Roofing & Waterproofing
  roofSurfaceAreaSqFt: number;
  terraceWaterproofingAreaSqFt: number;
  wetRoomWaterproofingAreaSqFt: number;
  totalWaterproofingAreaSqFt: number;

  // H. Painting
  interiorPaintAreaSqFt: number;
  exteriorPaintAreaSqFt: number;
  ceilingPaintAreaSqFt: number;
  paintQuantityLitres: number;
  primerQuantityLitres: number;
  puttyQuantityKg: number;

  // I. Doors & Windows
  totalDoorCount: number;
  totalWindowCount: number;
  totalDoorAreaSqFt: number;
  totalWindowGlassAreaSqFt: number;
  totalFrameLinearFt: number;
  hardwareAllowanceSets: number;

  // J. Electrical & Plumbing
  electricalPointsCount: number;
  modularSwitchesCount: number;
  electricalWiringMetres: number;
  distributionBoardsCount: number;
  plumbingFixturesCount: number;
  waterSupplyPipesMetres: number;
  drainagePipesMetres: number;
  bathroomFittingsSets: number;

  // Safeguard Diagnostics
  geometryDerivedPercentage: number;
  assumptionBasedPercentage: number;
  userSpecifiedPercentage: number;
  missingStructuralInformationWarnings: string[];
}

const CUFT_PER_CUM = 35.3147;

/**
 * Computes a comprehensive, transparent civil & architectural Quantity Takeoff
 * from a `BuildingProject` and configurable `EstimationAssumptions`.
 */
export function computeProjectQuantityTakeoff(
  project: BuildingProject,
  customAssumptions?: Partial<EstimationAssumptions>
): ProjectQuantityTakeoffResult {
  const assumptions: EstimationAssumptions = {
    ...DEFAULT_ESTIMATION_ASSUMPTIONS,
    ...(customAssumptions || {}),
  };

  const hasUserAssumptions =
    customAssumptions && Object.keys(customAssumptions).length > 0;
  const materialMap = new Map(project.materials.map((m) => [m.id, m]));
  const sortedFloors = [...project.floors].sort(
    (a, b) => a.levelIndex - b.levelIndex
  );

  const plotAreaSqFt = roundToPrecision(
    project.plot.width * project.plot.length,
    2
  );

  let totalCarpetAreaSqFt = 0;
  let totalBuiltUpAreaSqFt = 0;
  let externalWallVolumeCuFt = 0;
  let internalPartitionVolumeCuFt = 0;
  let openingVolumeDeductionCuFt = 0;
  let floorSlabConcreteCuFt = 0;
  let staircaseConcreteCuFt = 0;

  let internalWallGrossAreaSqFt = 0;
  let externalWallGrossAreaSqFt = 0;
  let plasterOpeningDeductionSqFt = 0;

  let tileFlooringRawSqFt = 0;
  let marbleFlooringRawSqFt = 0;
  let woodenFlooringRawSqFt = 0;
  let skirtingLinearFt = 0;
  let wetRoomWaterproofingAreaSqFt = 0;

  let totalDoorCount = 0;
  let totalWindowCount = 0;
  let totalDoorAreaSqFt = 0;
  let totalWindowGlassAreaSqFt = 0;
  let totalFrameLinearFt = 0;

  let bathroomCount = 0;
  let wetRoomCount = 0;

  const floorSummaries: FloorQuantitySummary[] = [];

  for (let idx = 0; idx < sortedFloors.length; idx++) {
    const floor = sortedFloors[idx];
    let floorCarpet = 0;

    for (const room of floor.rooms) {
      const area = Math.max(0, room.dimensions?.area || 0);
      floorCarpet += area;

      const b = computePolygonBoundsFt(room.polygon);
      const roomPerim = 2 * (b.width + b.length);
      skirtingLinearFt += roomPerim;

      const mat = materialMap.get(room.floorMaterialId);
      const cat = mat?.category || "tiles";
      const matIdLower = (room.floorMaterialId || "").toLowerCase();
      const matNameLower = (mat?.name || "").toLowerCase();
      if (
        cat === "marble" ||
        cat === "granite" ||
        cat === "stone" ||
        matIdLower.includes("marble") ||
        matIdLower.includes("granite") ||
        matIdLower.includes("stone") ||
        matIdLower.includes("terrazzo") ||
        matNameLower.includes("marble") ||
        matNameLower.includes("granite")
      ) {
        marbleFlooringRawSqFt += area;
      } else if (
        cat === "wooden_flooring" ||
        cat === "wood" ||
        cat === "laminate" ||
        matIdLower.includes("wood") ||
        matIdLower.includes("oak") ||
        matIdLower.includes("walnut") ||
        matIdLower.includes("teak") ||
        matNameLower.includes("wood") ||
        matNameLower.includes("oak") ||
        matNameLower.includes("walnut")
      ) {
        woodenFlooringRawSqFt += area;
      } else {
        tileFlooringRawSqFt += area;
      }

      if (room.type === "bathroom") {
        bathroomCount += 1;
        wetRoomCount += 1;
        wetRoomWaterproofingAreaSqFt += area + roomPerim * 3.0; // sunken slab + 3ft wall splash zone
      } else if (room.type === "balcony") {
        wetRoomWaterproofingAreaSqFt += area * 1.15;
      } else if (room.type === "kitchen" || room.type === "utility_room") {
        wetRoomCount += 1;
        wetRoomWaterproofingAreaSqFt += area * 0.5;
      }
    }

    let floorExtWallLen = 0;
    let floorIntWallLen = 0;
    let floorExtWallVol = 0;
    let floorIntWallVol = 0;
    let floorWallFootprint = 0;

    for (const wall of floor.walls) {
      const len = computeWallLengthFt(wall);
      const thick = Math.max(0.25, wall.thickness || 0.5);
      const h = Math.max(1, wall.height || floor.ceilingHeight || 10);
      const vol = len * thick * h;
      floorWallFootprint += len * thick;

      const isExt = Boolean(wall.isExterior || thick >= 0.65);
      if (isExt) {
        floorExtWallLen += len;
        floorExtWallVol += vol;
        externalWallGrossAreaSqFt += len * h; // outer face
        internalWallGrossAreaSqFt += len * h; // inner face
      } else {
        floorIntWallLen += len;
        floorIntWallVol += vol;
        internalWallGrossAreaSqFt += len * h * 2; // both faces of interior partition
      }
    }

    let floorOpeningVol = 0;
    let floorDoorCount = 0;
    let floorWinCount = 0;
    let floorDoorArea = 0;
    let floorWinArea = 0;

    for (const op of floor.openings) {
      const hostWall = floor.walls.find((w) => w.id === op.wallId);
      const wallThick = hostWall?.thickness || 0.75;
      const opArea = Math.max(0, op.width * op.height);
      const opVol = opArea * wallThick;

      floorOpeningVol += opVol;
      plasterOpeningDeductionSqFt += opArea; // one face deducted, jambs offset second face

      const isDoor = op.type.includes("door");
      if (isDoor) {
        floorDoorCount += 1;
        floorDoorArea += opArea;
        totalFrameLinearFt += 2 * op.height + op.width;
      } else {
        floorWinCount += 1;
        floorWinArea += opArea;
        totalFrameLinearFt += 2 * (op.width + op.height);
      }
    }

    const floorGrossWallVol = floorExtWallVol + floorIntWallVol;
    const floorNetMasonryVol = Math.max(0, floorGrossWallVol - floorOpeningVol);

    // Deduct openings proportionally from external vs internal wall volumes
    const extShare =
      floorGrossWallVol > 0 ? floorExtWallVol / floorGrossWallVol : 0.6;
    externalWallVolumeCuFt += Math.max(
      0,
      floorExtWallVol - floorOpeningVol * extShare
    );
    internalPartitionVolumeCuFt += Math.max(
      0,
      floorIntWallVol - floorOpeningVol * (1 - extShare)
    );
    openingVolumeDeductionCuFt += floorOpeningVol;

    const floorBuiltUp = roundToPrecision(
      Math.max(floorCarpet * 1.12, floorCarpet + floorWallFootprint),
      2
    );
    const slabThickness = Math.max(0.35, floor.floorHeight || 0.5);
    const floorSlabVol = floorBuiltUp * slabThickness;

    // Staircase concrete from placed staircases on this floor (or standard flight assumption on multi-floor buildings)
    let floorStairVol = 0;
    for (const obj of floor.objects) {
      if (obj.category === "staircases" || Boolean(obj.stairMetadata)) {
        const w = obj.dimensions.width || 3.5;
        const d = obj.dimensions.depth || 11;
        const waistVol = w * Math.hypot(d, floor.ceilingHeight || 10) * 0.55;
        floorStairVol += waistVol;
      }
    }
    if (floorStairVol === 0 && sortedFloors.length > 1 && idx < sortedFloors.length - 1) {
      floorStairVol = 3.5 * Math.hypot(11, floor.ceilingHeight || 10) * 0.55;
    }

    totalCarpetAreaSqFt += floorCarpet;
    totalBuiltUpAreaSqFt += floorBuiltUp;
    floorSlabConcreteCuFt += floorSlabVol;
    staircaseConcreteCuFt += floorStairVol;
    totalDoorCount += floorDoorCount;
    totalWindowCount += floorWinCount;
    totalDoorAreaSqFt += floorDoorArea;
    totalWindowGlassAreaSqFt += floorWinArea;

    floorSummaries.push({
      floorId: floor.id,
      floorName: floor.name,
      levelIndex: floor.levelIndex,
      carpetAreaSqFt: roundToPrecision(floorCarpet, 2),
      builtUpAreaSqFt: roundToPrecision(floorBuiltUp, 2),
      externalWallLengthFt: roundToPrecision(floorExtWallLen, 2),
      internalWallLengthFt: roundToPrecision(floorIntWallLen, 2),
      grossWallVolumeCuFt: roundToPrecision(floorGrossWallVol, 2),
      openingDeductionVolumeCuFt: roundToPrecision(floorOpeningVol, 2),
      netMasonryVolumeCuFt: roundToPrecision(floorNetMasonryVol, 2),
      slabConcreteVolumeCuFt: roundToPrecision(floorSlabVol, 2),
      staircaseConcreteVolumeCuFt: roundToPrecision(floorStairVol, 2),
      doorCount: floorDoorCount,
      windowCount: floorWinCount,
      doorAreaSqFt: roundToPrecision(floorDoorArea, 2),
      windowAreaSqFt: roundToPrecision(floorWinArea, 2),
    });
  }

  // Fallback built-up if rooms are empty but walls exist
  if (totalBuiltUpAreaSqFt < 20 && sortedFloors.some((f) => f.walls.length > 0)) {
    const fallbackWallLen = sortedFloors.reduce(
      (s, f) => s + f.walls.reduce((ws, w) => ws + computeWallLengthFt(w), 0),
      0
    );
    totalBuiltUpAreaSqFt = roundToPrecision(fallbackWallLen * 5, 2);
  }

  const groundFloor =
    sortedFloors.find((f) => f.type === "ground") || sortedFloors[0];
  const groundSummary = floorSummaries.find(
    (fs) => fs.floorId === groundFloor?.id
  );
  const groundFootprintSqFt = roundToPrecision(
    Math.max(
      100,
      groundSummary?.builtUpAreaSqFt ||
        totalBuiltUpAreaSqFt / Math.max(1, sortedFloors.length)
    ),
    2
  );
  const hasBasement = sortedFloors.some((f) => f.type === "basement");

  // A. EARTHWORK
  const sitePreparationAreaSqFt = roundToPrecision(
    Math.min(plotAreaSqFt, groundFootprintSqFt * 1.25),
    2
  );
  const foundationTrenchLengthFt = Math.max(
    40,
    (groundSummary?.externalWallLengthFt || 0) +
      (groundSummary?.internalWallLengthFt || 0) * 0.65 ||
      Math.sqrt(groundFootprintSqFt) * 4
  );
  const soilFactor =
    assumptions.soilType === "black_cotton"
      ? 1.25
      : assumptions.soilType === "rocky"
      ? 0.85
      : 1.0;

  const foundationExcavationCuFt =
    foundationTrenchLengthFt *
    assumptions.foundationWidthFt *
    assumptions.foundationDepthFt *
    soilFactor;
  const basementExcavationCuFt = hasBasement ? groundFootprintSqFt * 10.0 : 0;
  const excavationVolumeCuFt = roundToPrecision(
    foundationExcavationCuFt + basementExcavationCuFt,
    2
  );

  // B. CONCRETE
  const foundationConcreteCuFt = roundToPrecision(
    foundationTrenchLengthFt * assumptions.foundationWidthFt * 0.5, // 6-inch PCC leveling course
    2
  );
  const footingConcreteCuFt = roundToPrecision(
    groundFootprintSqFt *
      assumptions.footingConcreteRatioOfFootprint *
      Math.max(1, sortedFloors.length * 0.65),
    2
  );
  const columnConcreteCuFt = roundToPrecision(
    totalBuiltUpAreaSqFt * assumptions.columnConcreteRatioOfBuiltUp,
    2
  );
  const beamConcreteCuFt = roundToPrecision(
    totalBuiltUpAreaSqFt * assumptions.beamConcreteRatioOfBuiltUp,
    2
  );
  const roofStyleFactor =
    project.settings.RoofStyle === "gable" ||
    project.settings.RoofStyle === "hip"
      ? 1.22
      : 1.0;
  const roofSlabConcreteCuFt = roundToPrecision(
    groundFootprintSqFt * 0.45 * roofStyleFactor,
    2
  );

  const backfillingVolumeCuFt = roundToPrecision(
    Math.max(
      0,
      (foundationExcavationCuFt -
        foundationConcreteCuFt -
        footingConcreteCuFt) *
        assumptions.backfillCompactionFactor
    ),
    2
  );

  const totalConcreteCuFt = roundToPrecision(
    foundationConcreteCuFt +
      footingConcreteCuFt +
      columnConcreteCuFt +
      beamConcreteCuFt +
      floorSlabConcreteCuFt +
      staircaseConcreteCuFt +
      roofSlabConcreteCuFt,
    2
  );
  const totalConcreteCuM = roundToPrecision(
    totalConcreteCuFt / CUFT_PER_CUM,
    2
  );

  // C. REINFORCEMENT STEEL
  const footingSteelKg =
    (footingConcreteCuFt / CUFT_PER_CUM) * assumptions.footingSteelKgPerCuM;
  const colBeamSteelKg =
    ((columnConcreteCuFt + beamConcreteCuFt) / CUFT_PER_CUM) *
    assumptions.columnBeamSteelKgPerCuM;
  const slabStairSteelKg =
    ((floorSlabConcreteCuFt +
      staircaseConcreteCuFt +
      roofSlabConcreteCuFt) /
      CUFT_PER_CUM) *
    assumptions.slabStairSteelKgPerCuM;
  const totalReinforcementSteelKg = roundToPrecision(
    footingSteelKg + colBeamSteelKg + slabStairSteelKg,
    1
  );

  // D. MASONRY & RAW AGGREGATES
  const netMasonryVolumeCuFt = roundToPrecision(
    externalWallVolumeCuFt + internalPartitionVolumeCuFt,
    2
  );
  const totalBricksPieces = Math.round(
    netMasonryVolumeCuFt * assumptions.bricksPerCuFtMasonry
  );
  const mortarVolumeCuFt = roundToPrecision(
    netMasonryVolumeCuFt * assumptions.mortarRatioOfMasonryVolume,
    2
  );

  // E. PLASTERING
  const internalPlasterAreaSqFt = roundToPrecision(
    Math.max(0, internalWallGrossAreaSqFt - plasterOpeningDeductionSqFt * 0.6),
    2
  );
  const externalPlasterAreaSqFt = roundToPrecision(
    Math.max(0, externalWallGrossAreaSqFt - plasterOpeningDeductionSqFt * 0.4),
    2
  );
  const ceilingPlasterAreaSqFt = roundToPrecision(totalCarpetAreaSqFt, 2);

  // Raw Cement (50kg bags), Sand (cu.ft), Aggregate (cu.ft)
  const totalPlasterArea =
    internalPlasterAreaSqFt + externalPlasterAreaSqFt + ceilingPlasterAreaSqFt;
  const totalCementBags50Kg = Math.round(
    totalConcreteCuFt * 0.22 +
      netMasonryVolumeCuFt * 0.065 +
      totalPlasterArea * 0.018
  );
  const totalSandCuFt = roundToPrecision(
    totalConcreteCuFt * 0.44 +
      mortarVolumeCuFt * 0.95 +
      totalPlasterArea * 0.06,
    1
  );
  const totalAggregateCuFt = roundToPrecision(totalConcreteCuFt * 0.88, 1);

  // F. FLOORING & SKIRTING
  const wastageMult = 1 + (assumptions.flooringWastagePercent || 0) / 100;
  const tileFlooringAreaSqFt = roundToPrecision(
    tileFlooringRawSqFt * wastageMult,
    2
  );
  const marbleFlooringAreaSqFt = roundToPrecision(
    marbleFlooringRawSqFt * wastageMult,
    2
  );
  const woodenFlooringAreaSqFt = roundToPrecision(
    woodenFlooringRawSqFt * wastageMult,
    2
  );
  const skirtingAreaSqFt = roundToPrecision(
    skirtingLinearFt * assumptions.skirtingHeightFt * wastageMult,
    2
  );
  const totalFlooringWithWastageSqFt = roundToPrecision(
    tileFlooringAreaSqFt +
      marbleFlooringAreaSqFt +
      woodenFlooringAreaSqFt +
      skirtingAreaSqFt,
    2
  );

  // G. ROOFING & WATERPROOFING
  const roofSurfaceAreaSqFt = roundToPrecision(
    groundFootprintSqFt * roofStyleFactor,
    2
  );
  const terraceWaterproofingAreaSqFt = roundToPrecision(
    groundFootprintSqFt * 1.1,
    2
  );
  const totalWaterproofingAreaSqFt = roundToPrecision(
    terraceWaterproofingAreaSqFt + wetRoomWaterproofingAreaSqFt,
    2
  );

  // H. PAINTING
  const interiorPaintAreaSqFt = internalPlasterAreaSqFt;
  const exteriorPaintAreaSqFt = externalPlasterAreaSqFt;
  const ceilingPaintAreaSqFt = ceilingPlasterAreaSqFt;
  const totalPaintableSqFt =
    interiorPaintAreaSqFt + exteriorPaintAreaSqFt + ceilingPaintAreaSqFt;
  const paintQuantityLitres = roundToPrecision(totalPaintableSqFt / 110, 1); // 2 coats @ ~110 sq.ft/litre
  const primerQuantityLitres = roundToPrecision(totalPaintableSqFt / 140, 1);
  const puttyQuantityKg = roundToPrecision(
    (interiorPaintAreaSqFt + ceilingPaintAreaSqFt) / 18,
    1
  );

  // I. DOORS & WINDOWS
  const hardwareAllowanceSets = totalDoorCount + totalWindowCount;

  // J. ELECTRICAL & PLUMBING
  const electricalPointsCount = Math.max(
    8,
    Math.round(
      (totalBuiltUpAreaSqFt / 100) * assumptions.electricalPointsPer100SqFt
    )
  );
  const modularSwitchesCount = Math.round(electricalPointsCount * 1.25);
  const electricalWiringMetres = roundToPrecision(
    electricalPointsCount * assumptions.wiringMetresPerPoint,
    1
  );
  const distributionBoardsCount = Math.max(1, sortedFloors.length);

  const effectiveWetRooms = Math.max(1, wetRoomCount);
  const effectiveBathrooms = Math.max(1, bathroomCount);
  const plumbingFixturesCount =
    effectiveBathrooms * assumptions.plumbingFixturesPerBathroom +
    Math.max(1, effectiveWetRooms - effectiveBathrooms) * 2;
  const waterSupplyPipesMetres = roundToPrecision(
    effectiveWetRooms * assumptions.waterSupplyPipeMetresPerWetRoom,
    1
  );
  const drainagePipesMetres = roundToPrecision(
    effectiveWetRooms * assumptions.drainagePipeMetresPerWetRoom,
    1
  );
  const bathroomFittingsSets = effectiveBathrooms;

  const assumptionDerivType: QuantityDerivationType = hasUserAssumptions
    ? "user_specified"
    : "assumption_based";

  const lineItems: TakeoffLineItem[] = [
    // A. Earthwork
    {
      id: "qto-site-prep",
      categoryCode: "earthwork",
      categoryLabel: "A. Earthwork",
      itemName: "Site Clearance & Surface Grading",
      quantity: sitePreparationAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Min(Plot ${plotAreaSqFt}, Ground Footprint ${groundFootprintSqFt} × 1.25)`,
      engineeringNote: "Derived directly from ground floor footprint and plot bounds.",
    },
    {
      id: "qto-excavation",
      categoryCode: "earthwork",
      categoryLabel: "A. Earthwork",
      itemName: `Foundation Trench & Basement Excavation (${assumptions.soilType.replace(/_/g, " ")})`,
      quantity: excavationVolumeCuFt,
      unit: "cubic ft",
      derivationType: assumptionDerivType,
      formulaUsed: `Trench ${roundToPrecision(foundationTrenchLengthFt, 1)}' × ${assumptions.foundationWidthFt}' × ${assumptions.foundationDepthFt}'`,
      engineeringNote: "Preliminary trench depth/width assumption; requires geotechnical soil test.",
    },
    {
      id: "qto-backfill",
      categoryCode: "earthwork",
      categoryLabel: "A. Earthwork",
      itemName: "Compacted Earth Backfilling around Footings",
      quantity: backfillingVolumeCuFt,
      unit: "cubic ft",
      derivationType: assumptionDerivType,
      formulaUsed: `(Excavation - Substructure Concrete) × ${assumptions.backfillCompactionFactor}`,
      engineeringNote: "Assumed compaction factor; depends on excavated soil reuse.",
    },

    // B. Concrete
    {
      id: "qto-pcc-foundation",
      categoryCode: "concrete",
      categoryLabel: "B. Concrete",
      itemName: "Foundation Leveling Course (PCC 1:4:8)",
      quantity: foundationConcreteCuFt,
      unit: "cubic ft",
      derivationType: assumptionDerivType,
      formulaUsed: `Trench Length ${roundToPrecision(foundationTrenchLengthFt, 1)}' × ${assumptions.foundationWidthFt}' × 0.5'`,
      engineeringNote: "Preliminary 6-inch PCC bed assumption.",
    },
    {
      id: "qto-rcc-footing",
      categoryCode: "concrete",
      categoryLabel: "B. Concrete",
      itemName: "Isolated / Strip Footing RCC (M25)",
      quantity: footingConcreteCuFt,
      unit: "cubic ft",
      derivationType: assumptionDerivType,
      formulaUsed: `Footprint ${groundFootprintSqFt} sq.ft × ${assumptions.footingConcreteRatioOfFootprint} ratio`,
      engineeringNote: "Preliminary footing volume ratio; not a structural design.",
    },
    {
      id: "qto-rcc-columns",
      categoryCode: "concrete",
      categoryLabel: "B. Concrete",
      itemName: "Structural Columns RCC (M25)",
      quantity: columnConcreteCuFt,
      unit: "cubic ft",
      derivationType: assumptionDerivType,
      formulaUsed: `Built-Up ${totalBuiltUpAreaSqFt} sq.ft × ${assumptions.columnConcreteRatioOfBuiltUp}`,
      engineeringNote: "Assumed column volume ratio; column sizes cannot be inferred from floor plan alone.",
    },
    {
      id: "qto-rcc-beams",
      categoryCode: "concrete",
      categoryLabel: "B. Concrete",
      itemName: "Plinth, Floor & Lintel Beams RCC (M25)",
      quantity: beamConcreteCuFt,
      unit: "cubic ft",
      derivationType: assumptionDerivType,
      formulaUsed: `Built-Up ${totalBuiltUpAreaSqFt} sq.ft × ${assumptions.beamConcreteRatioOfBuiltUp}`,
      engineeringNote: "Assumed beam span/depth allowance.",
    },
    {
      id: "qto-rcc-slabs",
      categoryCode: "concrete",
      categoryLabel: "B. Concrete",
      itemName: "Suspended Floor Slabs RCC (M25)",
      quantity: roundToPrecision(floorSlabConcreteCuFt, 2),
      unit: "cubic ft",
      derivationType: "geometry_derived",
      formulaUsed: `Sum(Floor Built-Up Area × Floor Slab Thickness)`,
      engineeringNote: "Measured from each floor's built-up footprint and configured slab thickness.",
    },
    {
      id: "qto-rcc-stairs",
      categoryCode: "concrete",
      categoryLabel: "B. Concrete",
      itemName: "Staircase Waist Slab & Steps RCC",
      quantity: roundToPrecision(staircaseConcreteCuFt, 2),
      unit: "cubic ft",
      derivationType: "geometry_derived",
      formulaUsed: `Derived from placed staircase width, run & total rise`,
      engineeringNote: "Measured from staircase geometry on each floor.",
    },
    {
      id: "qto-rcc-roof",
      categoryCode: "concrete",
      categoryLabel: "B. Concrete",
      itemName: `Roof Slab RCC (${project.settings.RoofStyle.toUpperCase()})`,
      quantity: roofSlabConcreteCuFt,
      unit: "cubic ft",
      derivationType: "geometry_derived",
      formulaUsed: `Footprint ${groundFootprintSqFt} sq.ft × 0.45' × ${roofStyleFactor}x`,
      engineeringNote: "Derived from top floor footprint and roof style.",
    },

    // C. Reinforcement Steel
    {
      id: "qto-steel-total",
      categoryCode: "reinforcement_steel",
      categoryLabel: "C. Reinforcement Steel",
      itemName: "Fe550D TMT Reinforcement Steel Bars",
      quantity: totalReinforcementSteelKg,
      unit: "kg",
      derivationType: assumptionDerivType,
      formulaUsed: `Footing (${assumptions.footingSteelKgPerCuM} kg/m³) + Col/Beam (${assumptions.columnBeamSteelKgPerCuM} kg/m³) + Slab (${assumptions.slabStairSteelKgPerCuM} kg/m³)`,
      engineeringNote: "Preliminary reinforcement ratio assumption; requires licensed structural bar-bending schedule.",
    },

    // D. Masonry
    {
      id: "qto-masonry-ext",
      categoryCode: "masonry",
      categoryLabel: "D. Masonry",
      itemName: "External Wall Brickwork (Net of Openings)",
      quantity: roundToPrecision(externalWallVolumeCuFt, 2),
      unit: "cubic ft",
      derivationType: "geometry_derived",
      formulaUsed: `Gross Exterior Walls - Exterior Door/Window Deductions`,
      engineeringNote: "Measured directly from 2D/3D exterior wall lengths, heights, thicknesses, and openings.",
    },
    {
      id: "qto-masonry-int",
      categoryCode: "masonry",
      categoryLabel: "D. Masonry",
      itemName: "Internal Partition Brickwork (Net of Openings)",
      quantity: roundToPrecision(internalPartitionVolumeCuFt, 2),
      unit: "cubic ft",
      derivationType: "geometry_derived",
      formulaUsed: `Gross Interior Walls - Interior Door/Window Deductions`,
      engineeringNote: "Measured directly from interior partition walls and hosted openings.",
    },
    {
      id: "qto-bricks-count",
      categoryCode: "masonry",
      categoryLabel: "D. Masonry",
      itemName: "Modular Masonry Bricks Requirement",
      quantity: totalBricksPieces,
      unit: "piece",
      derivationType: "geometry_derived",
      formulaUsed: `${netMasonryVolumeCuFt} cu.ft × ${assumptions.bricksPerCuFtMasonry} bricks/cu.ft`,
      engineeringNote: "Net wall volume after deducting ${roundToPrecision(openingVolumeDeductionCuFt, 1)} cu.ft of openings.",
    },

    // E. Plastering
    {
      id: "qto-plaster-int",
      categoryCode: "plastering",
      categoryLabel: "E. Plastering",
      itemName: "12mm Internal Wall Cement Plaster",
      quantity: internalPlasterAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Internal Wall Faces - Opening Deductions`,
      engineeringNote: "Measured from wall lengths and heights on all floors.",
    },
    {
      id: "qto-plaster-ext",
      categoryCode: "plastering",
      categoryLabel: "E. Plastering",
      itemName: "20mm External Double-Coat Weather Plaster",
      quantity: externalPlasterAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `External Wall Faces - Exterior Opening Deductions`,
      engineeringNote: "Measured from exterior perimeter walls.",
    },
    {
      id: "qto-plaster-ceiling",
      categoryCode: "plastering",
      categoryLabel: "E. Plastering",
      itemName: "6mm Ceiling Soffit Plaster",
      quantity: ceilingPlasterAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Total Room Carpet Area (${totalCarpetAreaSqFt} sq.ft)`,
      engineeringNote: "Measured from room polygon areas.",
    },

    // F. Flooring
    {
      id: "qto-flooring-tiles",
      categoryCode: "flooring",
      categoryLabel: "F. Flooring",
      itemName: `Vitrified / Ceramic Tile Flooring (+${assumptions.flooringWastagePercent}% wastage)`,
      quantity: tileFlooringAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Tile Room Areas × ${wastageMult.toFixed(2)}`,
      engineeringNote: "Measured from rooms assigned tile/porcelain/ceramic finishes.",
    },
    {
      id: "qto-flooring-marble",
      categoryCode: "flooring",
      categoryLabel: "F. Flooring",
      itemName: `Natural Marble / Stone Slab Flooring (+${assumptions.flooringWastagePercent}% wastage)`,
      quantity: marbleFlooringAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Marble/Stone Room Areas × ${wastageMult.toFixed(2)}`,
      engineeringNote: "Measured from rooms assigned marble, travertine, or granite finishes.",
    },
    {
      id: "qto-flooring-wood",
      categoryCode: "flooring",
      categoryLabel: "F. Flooring",
      itemName: `Engineered Wood / Timber Flooring (+${assumptions.flooringWastagePercent}% wastage)`,
      quantity: woodenFlooringAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Timber Room Areas × ${wastageMult.toFixed(2)}`,
      engineeringNote: "Measured from rooms assigned oak, teak, or laminate flooring.",
    },
    {
      id: "qto-flooring-skirting",
      categoryCode: "flooring",
      categoryLabel: "F. Flooring",
      itemName: "Perimeter Room Skirting (4-inch height)",
      quantity: skirtingAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Room Perimeter ${roundToPrecision(skirtingLinearFt, 1)}' × ${assumptions.skirtingHeightFt}'`,
      engineeringNote: "Derived from room bounding perimeters.",
    },

    // G. Roofing & Waterproofing
    {
      id: "qto-roofing-area",
      categoryCode: "roofing_waterproofing",
      categoryLabel: "G. Roofing & Waterproofing",
      itemName: "Roof Surface & Thermal Screed Treatment",
      quantity: roofSurfaceAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Top Footprint ${groundFootprintSqFt} sq.ft × ${roofStyleFactor}x`,
      engineeringNote: "Derived from top floor footprint and roof style.",
    },
    {
      id: "qto-waterproofing-area",
      categoryCode: "roofing_waterproofing",
      categoryLabel: "G. Roofing & Waterproofing",
      itemName: "Terrace, Bathroom & Balcony Waterproofing Membrane",
      quantity: totalWaterproofingAreaSqFt,
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Terrace (${terraceWaterproofingAreaSqFt} sq.ft) + Wet Rooms (${roundToPrecision(wetRoomWaterproofingAreaSqFt, 1)} sq.ft)`,
      engineeringNote: "Measured from bathroom, balcony, and terrace floor areas.",
    },

    // H. Painting
    {
      id: "qto-paint-litres",
      categoryCode: "painting",
      categoryLabel: "H. Painting",
      itemName: "Interior & Exterior Architectural Emulsion Paint",
      quantity: paintQuantityLitres,
      unit: "litre",
      derivationType: "geometry_derived",
      formulaUsed: `Total Paintable Surface (${roundToPrecision(totalPaintableSqFt, 0)} sq.ft) ÷ 110 sq.ft/L`,
      engineeringNote: "Derived from net internal, external, and ceiling plaster areas.",
    },
    {
      id: "qto-putty-primer",
      categoryCode: "painting",
      categoryLabel: "H. Painting",
      itemName: "Acrylic Wall Putty & Primer",
      quantity: roundToPrecision(puttyQuantityKg + primerQuantityLitres, 1),
      unit: "kg",
      derivationType: "geometry_derived",
      formulaUsed: `Putty (${puttyQuantityKg} kg) + Primer (${primerQuantityLitres} L)`,
      engineeringNote: "2 coats putty + 1 coat primer on interior walls and ceilings.",
    },

    // I. Doors & Windows
    {
      id: "qto-doors-schedule",
      categoryCode: "doors_windows",
      categoryLabel: "I. Doors & Windows",
      itemName: `Architectural Doors Schedule (${totalDoorCount} doors)`,
      quantity: roundToPrecision(totalDoorAreaSqFt, 2),
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Exact sum of ${totalDoorCount} placed door openings`,
      engineeringNote: "Measured directly from floor plan door openings.",
    },
    {
      id: "qto-windows-schedule",
      categoryCode: "doors_windows",
      categoryLabel: "I. Doors & Windows",
      itemName: `Glazed Windows Schedule (${totalWindowCount} windows)`,
      quantity: roundToPrecision(totalWindowGlassAreaSqFt, 2),
      unit: "square ft",
      derivationType: "geometry_derived",
      formulaUsed: `Exact sum of ${totalWindowCount} placed window openings`,
      engineeringNote: "Measured directly from floor plan window openings.",
    },

    // J. Electrical & Plumbing
    {
      id: "qto-elec-wiring",
      categoryCode: "electrical_plumbing",
      categoryLabel: "J. Electrical & Plumbing",
      itemName: `Concealed Copper Electrical Wiring (${electricalPointsCount} points)`,
      quantity: electricalWiringMetres,
      unit: "metre",
      derivationType: assumptionDerivType,
      formulaUsed: `${electricalPointsCount} points × ${assumptions.wiringMetresPerPoint} m/point`,
      engineeringNote: "Preliminary MEP allowance based on built-up area.",
    },
    {
      id: "qto-plumbing-pipes",
      categoryCode: "electrical_plumbing",
      categoryLabel: "J. Electrical & Plumbing",
      itemName: `CPVC Water Supply & UPVC Drainage Piping (${effectiveWetRooms} wet rooms)`,
      quantity: roundToPrecision(waterSupplyPipesMetres + drainagePipesMetres, 1),
      unit: "metre",
      derivationType: assumptionDerivType,
      formulaUsed: `${effectiveWetRooms} wet zones × (${assumptions.waterSupplyPipeMetresPerWetRoom}m supply + ${assumptions.drainagePipeMetresPerWetRoom}m drain)`,
      engineeringNote: "Preliminary plumbing run allowance based on bathroom/kitchen count.",
    },
  ];

  const geomCount = lineItems.filter(
    (i) => i.derivationType === "geometry_derived"
  ).length;
  const userCount = lineItems.filter(
    (i) => i.derivationType === "user_specified"
  ).length;
  const assumpCount = lineItems.filter(
    (i) => i.derivationType === "assumption_based"
  ).length;
  const totalCount = Math.max(1, lineItems.length);

  const missingStructuralInformationWarnings: string[] = [
    "Soil bearing capacity (SBC) and water table depth are not available from a floor plan; foundation depth (5.0 ft) is a preliminary assumption.",
    "Structural column grid sizes, beam depths, and bar-bending schedules (BBS) use preliminary volume/steel ratios and are NOT structurally approved engineering designs.",
    "MEP conduit routing and external municipal sewer/power hookup distances use standard residential per-room allowances.",
  ];

  return {
    projectId: project.id,
    calculatedAt: new Date().toISOString(),
    assumptionsUsed: assumptions,
    floorSummaries,
    lineItems,
    plotAreaSqFt,
    totalCarpetAreaSqFt: roundToPrecision(totalCarpetAreaSqFt, 2),
    totalBuiltUpAreaSqFt: roundToPrecision(totalBuiltUpAreaSqFt, 2),
    groundFootprintSqFt,
    sitePreparationAreaSqFt,
    excavationVolumeCuFt,
    backfillingVolumeCuFt,
    foundationConcreteCuFt,
    footingConcreteCuFt,
    columnConcreteCuFt,
    beamConcreteCuFt,
    floorSlabConcreteCuFt: roundToPrecision(floorSlabConcreteCuFt, 2),
    staircaseConcreteCuFt: roundToPrecision(staircaseConcreteCuFt, 2),
    roofSlabConcreteCuFt,
    totalConcreteCuFt,
    totalConcreteCuM,
    totalReinforcementSteelKg,
    externalWallVolumeCuFt: roundToPrecision(externalWallVolumeCuFt, 2),
    internalPartitionVolumeCuFt: roundToPrecision(
      internalPartitionVolumeCuFt,
      2
    ),
    openingVolumeDeductionCuFt: roundToPrecision(openingVolumeDeductionCuFt, 2),
    netMasonryVolumeCuFt,
    totalBricksPieces,
    mortarVolumeCuFt,
    totalCementBags50Kg,
    totalSandCuFt,
    totalAggregateCuFt,
    internalPlasterAreaSqFt,
    externalPlasterAreaSqFt,
    ceilingPlasterAreaSqFt,
    plasterOpeningDeductionSqFt: roundToPrecision(
      plasterOpeningDeductionSqFt,
      2
    ),
    tileFlooringAreaSqFt,
    marbleFlooringAreaSqFt,
    woodenFlooringAreaSqFt,
    skirtingLinearFt: roundToPrecision(skirtingLinearFt, 2),
    skirtingAreaSqFt,
    totalFlooringWithWastageSqFt,
    roofSurfaceAreaSqFt,
    terraceWaterproofingAreaSqFt,
    wetRoomWaterproofingAreaSqFt: roundToPrecision(
      wetRoomWaterproofingAreaSqFt,
      2
    ),
    totalWaterproofingAreaSqFt,
    interiorPaintAreaSqFt,
    exteriorPaintAreaSqFt,
    ceilingPaintAreaSqFt,
    paintQuantityLitres,
    primerQuantityLitres,
    puttyQuantityKg,
    totalDoorCount,
    totalWindowCount,
    totalDoorAreaSqFt: roundToPrecision(totalDoorAreaSqFt, 2),
    totalWindowGlassAreaSqFt: roundToPrecision(totalWindowGlassAreaSqFt, 2),
    totalFrameLinearFt: roundToPrecision(totalFrameLinearFt, 2),
    hardwareAllowanceSets,
    electricalPointsCount,
    modularSwitchesCount,
    electricalWiringMetres,
    distributionBoardsCount,
    plumbingFixturesCount,
    waterSupplyPipesMetres,
    drainagePipesMetres,
    bathroomFittingsSets,
    geometryDerivedPercentage: roundToPrecision(
      (geomCount / totalCount) * 100,
      1
    ),
    userSpecifiedPercentage: roundToPrecision(
      (userCount / totalCount) * 100,
      1
    ),
    assumptionBasedPercentage: roundToPrecision(
      (assumpCount / totalCount) * 100,
      1
    ),
    missingStructuralInformationWarnings,
  };
}
