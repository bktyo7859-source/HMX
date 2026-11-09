import { z } from "zod";
import {
  BuildingProject,
  FinishQuality,
} from "../../types/homeStudio";
import { ARCHITECTURAL_FURNITURE_CATALOG } from "./furnitureCatalog";
import {
  buildLabourRateCatalog,
  buildMaterialRateCatalog,
  LabourRate,
  LabourTradeCategory,
  MaterialRate,
  RateSource,
  resolveLocationProfile,
} from "./materialRateCatalog";
import {
  computeProjectQuantityTakeoff,
  DEFAULT_ESTIMATION_ASSUMPTIONS,
  EstimationAssumptions,
  ProjectQuantityTakeoffResult,
  QuantityDerivationType,
  TakeoffLineItem,
} from "./quantityTakeoff";
import { roundToPrecision } from "./units";

export type EstimateCategoryId =
  | "earthwork"
  | "concrete_structure"
  | "reinforcement_steel"
  | "masonry_brickwork"
  | "plastering"
  | "flooring_skirting"
  | "roofing_waterproofing"
  | "painting_finishes"
  | "doors_windows"
  | "electrical_plumbing"
  | "interior_furnishings";

export interface EstimateCategoryBreakdown {
  categoryId: EstimateCategoryId;
  categoryName: string;
  materialCostINR: number;
  labourCostINR: number;
  equipmentCostINR: number;
  totalCategoryCostINR: number;
  percentageOfSubtotal: number;
  derivationSummary: QuantityDerivationType;
}

export interface MaterialCostLineItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitRateINR: number;
  totalCostINR: number;
  rateSource: RateSource;
  derivationType: QuantityDerivationType;
  formulaUsed: string;
}

export interface LabourCostLineItem {
  tradeId: string;
  trade: LabourTradeCategory;
  quantity: number;
  unit: string;
  unitRateINR: number;
  totalCostINR: number;
  rateSource: RateSource;
  formulaUsed: string;
}

export interface FloorCostSummary {
  floorId: string;
  floorName: string;
  levelIndex: number;
  builtUpAreaSqFt: number;
  carpetAreaSqFt: number;
  materialCostINR: number;
  labourCostINR: number;
  interiorAssetsCostINR: number;
  totalFloorCostINR: number;
}

export interface ConstructionEstimate {
  projectId: string;
  projectName: string;
  calculationDate: string;
  rateVersion: string;
  currency: "INR" | "USD";
  location: string;
  state: string;
  finishTier: FinishQuality;
  assumptions: EstimationAssumptions;
  takeoff: ProjectQuantityTakeoffResult;

  // Core Financial Structure (Phase 8 Section 7)
  materialCostINR: number;
  labourCostINR: number;
  equipmentCostINR: number;
  interiorFurnishingsCostINR: number;
  subtotalINR: number; // Material + Labour + Equipment
  overheadPercentage: number;
  overheadsINR: number;
  contingencyPercentage: number;
  contingencyINR: number;
  finalEstimatedCostINR: number; // Subtotal + Overheads + Contingency (Excludes Taxes)
  costPerSqFtINR: number;

  // Separately Configurable Taxes (Never silently baked into Final Estimated Cost)
  taxPercentage: number;
  applicableTaxesINR: number;
  totalWithTaxesINR: number;

  // Detailed Schedules
  categoryBreakdowns: EstimateCategoryBreakdown[];
  materialSchedule: MaterialCostLineItem[];
  labourSchedule: LabourCostLineItem[];
  floorBreakdowns: FloorCostSummary[];

  // Safeguards & Limitations
  estimationConfidence: "Preliminary Architectural" | "User-Calibrated";
  disclaimer: string;
}

export interface EstimateScenarioInput {
  scenarioName: string;
  finishTier?: FinishQuality;
  location?: string;
  flooringMode?: "project_default" | "all_tiles" | "all_marble" | "all_wood";
  paintMultiplier?: number;
  windowMultiplier?: number;
  additionalRoomsCount?: number;
  additionalRoomAreaSqFt?: number;
  additionalFloorsCount?: number;
}

export interface EstimateScenarioComparison {
  scenarioName: string;
  baselineEstimate: ConstructionEstimate;
  scenarioEstimate: ConstructionEstimate;
  costDifferenceINR: number;
  percentageDelta: number;
  materialCostDeltaINR: number;
  labourCostDeltaINR: number;
  builtUpAreaDeltaSqFt: number;
  categoryDeltas: Array<{
    categoryId: EstimateCategoryId;
    categoryName: string;
    baselineINR: number;
    scenarioINR: number;
    deltaINR: number;
  }>;
}

export const CONSTRUCTION_COST_DISCLAIMER =
  "Preliminary residential construction estimate generated from architectural floor plan geometry and configurable engineering assumptions. This is NOT a structural engineering design or contractor quotation, and is completely distinct from HMX AI Property Market Valuation.";

// Zod Validation Schemas for Phase 8 Section 12
export const EstimationAssumptionsSchema = z.object({
  foundationDepthFt: z.number().positive().max(30),
  foundationWidthFt: z.number().positive().max(15),
  soilType: z.enum([
    "hard_murrum",
    "medium_clay_sand",
    "black_cotton",
    "rocky",
  ]),
  backfillCompactionFactor: z.number().min(0.1).max(1.0),
  footingConcreteRatioOfFootprint: z.number().positive().max(5),
  columnConcreteRatioOfBuiltUp: z.number().positive().max(2),
  beamConcreteRatioOfBuiltUp: z.number().positive().max(2),
  footingSteelKgPerCuM: z.number().positive().max(400),
  columnBeamSteelKgPerCuM: z.number().positive().max(450),
  slabStairSteelKgPerCuM: z.number().positive().max(350),
  bricksPerCuFtMasonry: z.number().positive().max(30),
  mortarRatioOfMasonryVolume: z.number().min(0.05).max(0.6),
  flooringWastagePercent: z.number().min(0).max(30),
  skirtingHeightFt: z.number().min(0).max(2),
  electricalPointsPer100SqFt: z.number().positive().max(25),
  wiringMetresPerPoint: z.number().positive().max(50),
  plumbingFixturesPerBathroom: z.number().int().min(1).max(20),
  waterSupplyPipeMetresPerWetRoom: z.number().positive().max(100),
  drainagePipeMetresPerWetRoom: z.number().positive().max(100),
});

export interface CostCalculationOptions {
  assumptions?: Partial<EstimationAssumptions>;
  customMaterialRates?: Record<string, number>;
  customLabourRates?: Record<string, number>;
  overheadPercentage?: number;
  contingencyPercentage?: number;
  equipmentPercentageOfMaterialLabour?: number;
  taxPercentage?: number;
  locationOverride?: string;
  finishTierOverride?: FinishQuality;
}

/**
 * Calculates a complete, transparent `ConstructionEstimate` from a `BuildingProject`
 * without mutating the input project.
 */
export function calculateConstructionEstimate(
  project: BuildingProject,
  options?: CostCalculationOptions
): ConstructionEstimate {
  const cfg = project.settings.costConfig;
  const finishTier: FinishQuality =
    options?.finishTierOverride || cfg.finishQuality || "standard";
  const locationStr =
    options?.locationOverride || cfg.location || project.location || "Bengaluru, Karnataka";
  const locProfile = resolveLocationProfile(locationStr);

  const takeoff = computeProjectQuantityTakeoff(project, options?.assumptions);

  const mergedCustomMatRates = {
    ...(cfg.customRates || {}),
    ...(options?.customMaterialRates || {}),
  };

  const materialRates = buildMaterialRateCatalog({
    location: locationStr,
    finishTier,
    currency: cfg.currency || "INR",
    customMaterialRates: mergedCustomMatRates,
  });

  const labourRates = buildLabourRateCatalog({
    location: locationStr,
    finishTier,
    currency: cfg.currency || "INR",
    customLabourRates: options?.customLabourRates,
  });

  const matRateMap = new Map<string, MaterialRate>(
    materialRates.map((m) => [m.materialId, m])
  );
  const labRateMap = new Map<string, LabourRate>(
    labourRates.map((l) => [l.tradeId, l])
  );

  const getMat = (id: string): MaterialRate =>
    matRateMap.get(id) || materialRates[0];
  const getLab = (id: string): LabourRate =>
    labRateMap.get(id) || labourRates[0];

  // Build Material Cost Schedule (Connecting project ArchitecturalMaterials for flooring/paint where applicable)
  const projectMaterialsMap = new Map(
    project.materials.map((m) => [m.id, m])
  );

  // Compute weighted room flooring rate overrides from project's actual assigned room materials
  let customTileRateSum = 0;
  let customTileCount = 0;
  let customMarbleRateSum = 0;
  let customMarbleCount = 0;
  let customWoodRateSum = 0;
  let customWoodCount = 0;

  for (const flr of project.floors) {
    for (const rm of flr.rooms) {
      const m = projectMaterialsMap.get(rm.floorMaterialId);
      if (!m) continue;
      if (m.category === "marble" || m.category === "granite" || m.category === "stone") {
        customMarbleRateSum += m.unitCostPerSqFt;
        customMarbleCount++;
      } else if (
        m.category === "wooden_flooring" ||
        m.category === "wood" ||
        m.category === "laminate"
      ) {
        customWoodRateSum += m.unitCostPerSqFt;
        customWoodCount++;
      } else {
        customTileRateSum += m.unitCostPerSqFt;
        customTileCount++;
      }
    }
  }

  const makeMatLine = (
    rateObj: MaterialRate,
    quantity: number,
    derivationType: QuantityDerivationType,
    formulaUsed: string,
    overrideRateINR?: number
  ): MaterialCostLineItem => {
    const q = Math.max(0, roundToPrecision(quantity, 2));
    const r = Math.max(
      0,
      roundToPrecision(
        overrideRateINR !== undefined ? overrideRateINR : rateObj.rate,
        2
      )
    );
    return {
      materialId: rateObj.materialId,
      materialName: rateObj.materialName,
      quantity: q,
      unit: rateObj.unit,
      unitRateINR: r,
      totalCostINR: Math.round(q * r),
      rateSource: rateObj.rateSource,
      derivationType,
      formulaUsed,
    };
  };

  const tierMult =
    finishTier === "premium" ? 1.3 : finishTier === "economy" ? 0.85 : 1.0;

  const effectiveTileRate =
    mergedCustomMatRates["rate-tiles-vitrified"] ||
    (customTileCount > 0
      ? (customTileRateSum / customTileCount) * tierMult
      : getMat("rate-tiles-vitrified").rate);

  const effectiveMarbleRate =
    mergedCustomMatRates["rate-marble-italian"] ||
    (customMarbleCount > 0
      ? (customMarbleRateSum / customMarbleCount) * tierMult
      : getMat("rate-marble-italian").rate);

  const effectiveWoodRate =
    mergedCustomMatRates["rate-wood-flooring"] ||
    (customWoodCount > 0
      ? (customWoodRateSum / customWoodCount) * tierMult
      : getMat("rate-wood-flooring").rate);

  const materialSchedule: MaterialCostLineItem[] = [
    makeMatLine(
      getMat("rate-cement-opc53"),
      takeoff.totalCementBags50Kg,
      "assumption_based",
      `Concrete (${takeoff.totalConcreteCuFt} cu.ft) + Masonry (${takeoff.netMasonryVolumeCuFt} cu.ft) + Plastering`
    ),
    makeMatLine(
      getMat("rate-steel-fe550d"),
      takeoff.totalReinforcementSteelKg,
      "assumption_based",
      `Total RCC Concrete (${takeoff.totalConcreteCuM} m³) × preliminary steel ratios`
    ),
    makeMatLine(
      getMat("rate-bricks-modular"),
      takeoff.totalBricksPieces,
      "geometry_derived",
      `Net Masonry (${takeoff.netMasonryVolumeCuFt} cu.ft) × ${takeoff.assumptionsUsed.bricksPerCuFtMasonry} pcs/cu.ft`
    ),
    makeMatLine(
      getMat("rate-sand-msand"),
      takeoff.totalSandCuFt,
      "assumption_based",
      `Concrete fine aggregate + Masonry mortar + Plastering sand`
    ),
    makeMatLine(
      getMat("rate-aggregate-20mm"),
      takeoff.totalAggregateCuFt,
      "assumption_based",
      `Coarse aggregate for ${takeoff.totalConcreteCuFt} cu.ft RCC/PCC`
    ),
    makeMatLine(
      getMat("rate-concrete-rmc-m25"),
      roundToPrecision(takeoff.totalConcreteCuM * 0.45, 2), // Ready-mix slab pump share
      "geometry_derived",
      `45% RMC pumped share of ${takeoff.totalConcreteCuM} m³ total concrete`
    ),
    makeMatLine(
      getMat("rate-tiles-vitrified"),
      takeoff.tileFlooringAreaSqFt + takeoff.skirtingAreaSqFt,
      "geometry_derived",
      `Tile rooms (${takeoff.tileFlooringAreaSqFt} sq.ft) + Skirting (${takeoff.skirtingAreaSqFt} sq.ft)`,
      effectiveTileRate
    ),
    makeMatLine(
      getMat("rate-marble-italian"),
      takeoff.marbleFlooringAreaSqFt,
      "geometry_derived",
      `Marble/Stone rooms (${takeoff.marbleFlooringAreaSqFt} sq.ft incl. wastage)`,
      effectiveMarbleRate
    ),
    makeMatLine(
      getMat("rate-wood-flooring"),
      takeoff.woodenFlooringAreaSqFt,
      "geometry_derived",
      `Timber/Oak rooms (${takeoff.woodenFlooringAreaSqFt} sq.ft incl. wastage)`,
      effectiveWoodRate
    ),
    makeMatLine(
      getMat("rate-paint-emulsion"),
      takeoff.paintQuantityLitres,
      "geometry_derived",
      `Interior + Exterior + Ceiling paintable area ÷ 110 sq.ft/L`
    ),
    makeMatLine(
      getMat("rate-primer-putty"),
      roundToPrecision(takeoff.puttyQuantityKg + takeoff.primerQuantityLitres, 1),
      "geometry_derived",
      `Wall putty (${takeoff.puttyQuantityKg} kg) + Primer (${takeoff.primerQuantityLitres} L)`
    ),
    makeMatLine(
      getMat("rate-doors-timber"),
      Math.max(21, takeoff.totalDoorAreaSqFt),
      "geometry_derived",
      `${takeoff.totalDoorCount} doors from floor plan opening schedule`
    ),
    makeMatLine(
      getMat("rate-windows-upvc-al"),
      Math.max(16, takeoff.totalWindowGlassAreaSqFt),
      "geometry_derived",
      `${takeoff.totalWindowCount} windows from floor plan opening schedule`
    ),
    makeMatLine(
      getMat("rate-waterproofing-membrane"),
      takeoff.totalWaterproofingAreaSqFt,
      "geometry_derived",
      `Terrace (${takeoff.terraceWaterproofingAreaSqFt} sq.ft) + Wet rooms (${takeoff.wetRoomWaterproofingAreaSqFt} sq.ft)`
    ),
    makeMatLine(
      getMat("rate-plumbing-cpvc"),
      roundToPrecision(
        takeoff.waterSupplyPipesMetres + takeoff.drainagePipesMetres,
        1
      ),
      "assumption_based",
      `Supply (${takeoff.waterSupplyPipesMetres} m) + Drainage (${takeoff.drainagePipesMetres} m)`
    ),
    makeMatLine(
      getMat("rate-sanitary-bathroom-set"),
      takeoff.bathroomFittingsSets,
      "geometry_derived",
      `${takeoff.bathroomFittingsSets} bathroom sanitaryware & CP fixture set(s)`
    ),
    makeMatLine(
      getMat("rate-electrical-frls"),
      takeoff.electricalWiringMetres,
      "assumption_based",
      `${takeoff.electricalPointsCount} electrical points × ${takeoff.assumptionsUsed.wiringMetresPerPoint} m/pt`
    ),
    makeMatLine(
      getMat("rate-electrical-switchgear-point"),
      takeoff.modularSwitchesCount,
      "assumption_based",
      `${takeoff.modularSwitchesCount} modular switches, sockets & MCB points`
    ),
  ];

  // Build 10-Trade Labour Cost Schedule (Kept strictly separate from Material Cost)
  const makeLabLine = (
    rateObj: LabourRate,
    quantity: number,
    formulaUsed: string
  ): LabourCostLineItem => {
    const q = Math.max(0, roundToPrecision(quantity, 2));
    const r = Math.max(0, roundToPrecision(rateObj.rate, 2));
    return {
      tradeId: rateObj.tradeId,
      trade: rateObj.trade,
      quantity: q,
      unit: rateObj.unit,
      unitRateINR: r,
      totalCostINR: Math.round(q * r),
      rateSource: rateObj.rateSource,
      formulaUsed,
    };
  };

  const totalPlasterArea =
    takeoff.internalPlasterAreaSqFt +
    takeoff.externalPlasterAreaSqFt +
    takeoff.ceilingPlasterAreaSqFt;

  const labourSchedule: LabourCostLineItem[] = [
    makeLabLine(
      getLab("lab-excavation"),
      takeoff.excavationVolumeCuFt + takeoff.backfillingVolumeCuFt,
      `Excavation (${takeoff.excavationVolumeCuFt} cu.ft) + Backfill (${takeoff.backfillingVolumeCuFt} cu.ft)`
    ),
    makeLabLine(
      getLab("lab-masonry"),
      takeoff.netMasonryVolumeCuFt,
      `Net Brickwork Volume (${takeoff.netMasonryVolumeCuFt} cu.ft)`
    ),
    makeLabLine(
      getLab("lab-concrete"),
      takeoff.totalConcreteCuFt,
      `Shuttering, bar-bending & pouring for ${takeoff.totalConcreteCuFt} cu.ft RCC/PCC`
    ),
    makeLabLine(
      getLab("lab-plastering"),
      totalPlasterArea,
      `Internal, External & Ceiling Plaster (${roundToPrecision(totalPlasterArea, 0)} sq.ft)`
    ),
    makeLabLine(
      getLab("lab-flooring"),
      takeoff.totalFlooringWithWastageSqFt,
      `Tile, Marble, Wood & Skirting laying (${takeoff.totalFlooringWithWastageSqFt} sq.ft)`
    ),
    makeLabLine(
      getLab("lab-painting"),
      totalPlasterArea,
      `Putty, Primer & 2-Coat Paint labour (${roundToPrecision(totalPlasterArea, 0)} sq.ft)`
    ),
    makeLabLine(
      getLab("lab-plumbing"),
      takeoff.totalBuiltUpAreaSqFt,
      `Plumbing & sanitary installation across ${takeoff.totalBuiltUpAreaSqFt} sq.ft`
    ),
    makeLabLine(
      getLab("lab-electrical"),
      takeoff.totalBuiltUpAreaSqFt,
      `Conduit chasing, wiring &DB installation across ${takeoff.totalBuiltUpAreaSqFt} sq.ft`
    ),
    makeLabLine(
      getLab("lab-carpentry"),
      Math.max(37, takeoff.totalDoorAreaSqFt + takeoff.totalWindowGlassAreaSqFt),
      `Door & Window frame/shutter installation (${roundToPrecision(
        takeoff.totalDoorAreaSqFt + takeoff.totalWindowGlassAreaSqFt,
        1
      )} sq.ft)`
    ),
    makeLabLine(
      getLab("lab-finishing"),
      takeoff.totalBuiltUpAreaSqFt,
      `Site cleaning, curing, waterproofing & final handover (${takeoff.totalBuiltUpAreaSqFt} sq.ft)`
    ),
  ];

  // Placed Interior Furniture Cost (separate from civil material/labour)
  const catalogAssetMap = new Map(
    ARCHITECTURAL_FURNITURE_CATALOG.map((a) => [a.assetId, a])
  );
  let interiorFurnishingsCostINR = 0;
  for (const flr of project.floors) {
    for (const obj of flr.objects) {
      if (obj.category === "staircases") continue; // Staircase concrete is already in civil RCC
      const catAsset = catalogAssetMap.get(obj.assetId);
      if (catAsset) {
        interiorFurnishingsCostINR += Math.round(
          catAsset.estimatedUnitCostInr * tierMult
        );
      } else {
        interiorFurnishingsCostINR += Math.round(35000 * tierMult);
      }
    }
  }

  // Exact Phase 8 Section 7 Calculation Structure
  const civilMaterialCostINR = materialSchedule.reduce(
    (s, m) => s + m.totalCostINR,
    0
  );
  const materialCostINR = civilMaterialCostINR + interiorFurnishingsCostINR;
  const labourCostINR = labourSchedule.reduce((s, l) => s + l.totalCostINR, 0);

  const equipPct = options?.equipmentPercentageOfMaterialLabour ?? 2.5;
  const equipmentCostINR = Math.round(
    (civilMaterialCostINR + labourCostINR) * (equipPct / 100)
  );

  const subtotalINR = materialCostINR + labourCostINR + equipmentCostINR;

  const rawOverheadPct =
    options?.overheadPercentage ?? cfg.architecturalFeePercentage ?? 6.0;
  const overheadPercentage = Math.max(
    0,
    Math.min(35, Number.isFinite(rawOverheadPct) ? rawOverheadPct : 6.0)
  );
  const overheadsINR = Math.round(subtotalINR * (overheadPercentage / 100));

  const rawContingencyPct =
    options?.contingencyPercentage ?? cfg.contingencyPercentage ?? 5.0;
  const contingencyPercentage = Math.max(
    0,
    Math.min(35, Number.isFinite(rawContingencyPct) ? rawContingencyPct : 5.0)
  );
  const contingencyINR = Math.round(
    subtotalINR * (contingencyPercentage / 100)
  );

  const finalEstimatedCostINR = subtotalINR + overheadsINR + contingencyINR;

  const costPerSqFtINR =
    takeoff.totalBuiltUpAreaSqFt > 0
      ? Math.round(finalEstimatedCostINR / takeoff.totalBuiltUpAreaSqFt)
      : 0;

  // Separately Configurable Taxes (Never silently included in Final Estimated Cost)
  const taxPercentage = options?.taxPercentage ?? 12.0;
  const applicableTaxesINR = Math.round(
    finalEstimatedCostINR * (taxPercentage / 100)
  );
  const totalWithTaxesINR = finalEstimatedCostINR + applicableTaxesINR;

  // Category Breakdowns
  const findMatCost = (id: string) =>
    materialSchedule.find((m) => m.materialId === id)?.totalCostINR || 0;
  const findLabCost = (id: string) =>
    labourSchedule.find((l) => l.tradeId === id)?.totalCostINR || 0;

  const rawCategories: Array<{
    categoryId: EstimateCategoryId;
    categoryName: string;
    mat: number;
    lab: number;
    eq: number;
    deriv: QuantityDerivationType;
  }> = [
    {
      categoryId: "earthwork",
      categoryName: "Earthwork & Excavation",
      mat: 0,
      lab: findLabCost("lab-excavation"),
      eq: Math.round(equipmentCostINR * 0.35),
      deriv: "assumption_based",
    },
    {
      categoryId: "concrete_structure",
      categoryName: "Concrete Substructure & Superstructure",
      mat:
        Math.round(findMatCost("rate-cement-opc53") * 0.62) +
        Math.round(findMatCost("rate-sand-msand") * 0.55) +
        findMatCost("rate-aggregate-20mm") +
        findMatCost("rate-concrete-rmc-m25"),
      lab: findLabCost("lab-concrete"),
      eq: Math.round(equipmentCostINR * 0.45),
      deriv: "geometry_derived",
    },
    {
      categoryId: "reinforcement_steel",
      categoryName: "Reinforcement Steel (TMT)",
      mat: findMatCost("rate-steel-fe550d"),
      lab: 0,
      eq: 0,
      deriv: "assumption_based",
    },
    {
      categoryId: "masonry_brickwork",
      categoryName: "Masonry & Brickwork",
      mat:
        findMatCost("rate-bricks-modular") +
        Math.round(findMatCost("rate-cement-opc53") * 0.22) +
        Math.round(findMatCost("rate-sand-msand") * 0.25),
      lab: findLabCost("lab-masonry"),
      eq: 0,
      deriv: "geometry_derived",
    },
    {
      categoryId: "plastering",
      categoryName: "Internal & External Plastering",
      mat:
        Math.round(findMatCost("rate-cement-opc53") * 0.16) +
        Math.round(findMatCost("rate-sand-msand") * 0.2),
      lab: findLabCost("lab-plastering"),
      eq: 0,
      deriv: "geometry_derived",
    },
    {
      categoryId: "flooring_skirting",
      categoryName: "Flooring & Skirting",
      mat:
        findMatCost("rate-tiles-vitrified") +
        findMatCost("rate-marble-italian") +
        findMatCost("rate-wood-flooring"),
      lab: findLabCost("lab-flooring"),
      eq: 0,
      deriv: "geometry_derived",
    },
    {
      categoryId: "roofing_waterproofing",
      categoryName: "Roofing & Waterproofing",
      mat: findMatCost("rate-waterproofing-membrane"),
      lab: Math.round(findLabCost("lab-finishing") * 0.5),
      eq: Math.round(equipmentCostINR * 0.2),
      deriv: "geometry_derived",
    },
    {
      categoryId: "painting_finishes",
      categoryName: "Painting, Primer & Wall Putty",
      mat:
        findMatCost("rate-paint-emulsion") + findMatCost("rate-primer-putty"),
      lab: findLabCost("lab-painting"),
      eq: 0,
      deriv: "geometry_derived",
    },
    {
      categoryId: "doors_windows",
      categoryName: "Doors, Windows & Glazing",
      mat:
        findMatCost("rate-doors-timber") + findMatCost("rate-windows-upvc-al"),
      lab: findLabCost("lab-carpentry"),
      eq: 0,
      deriv: "geometry_derived",
    },
    {
      categoryId: "electrical_plumbing",
      categoryName: "Electrical, Plumbing & Sanitary",
      mat:
        findMatCost("rate-plumbing-cpvc") +
        findMatCost("rate-sanitary-bathroom-set") +
        findMatCost("rate-electrical-frls") +
        findMatCost("rate-electrical-switchgear-point"),
      lab:
        findLabCost("lab-plumbing") +
        findLabCost("lab-electrical") +
        Math.round(findLabCost("lab-finishing") * 0.5),
      eq: 0,
      deriv: "assumption_based",
    },
    {
      categoryId: "interior_furnishings",
      categoryName: "Placed Interior Furnishings & Luminaires",
      mat: interiorFurnishingsCostINR,
      lab: 0,
      eq: 0,
      deriv: "geometry_derived",
    },
  ];

  const categoryBreakdowns: EstimateCategoryBreakdown[] = rawCategories.map(
    (c) => {
      const total = c.mat + c.lab + c.eq;
      return {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        materialCostINR: c.mat,
        labourCostINR: c.lab,
        equipmentCostINR: c.eq,
        totalCategoryCostINR: total,
        percentageOfSubtotal:
          subtotalINR > 0 ? roundToPrecision((total / subtotalINR) * 100, 1) : 0,
        derivationSummary: c.deriv,
      };
    }
  );

  // Floor-wise Cost Breakdown
  const totalAreaForShare = Math.max(1, takeoff.totalBuiltUpAreaSqFt);
  const floorBreakdowns: FloorCostSummary[] = takeoff.floorSummaries.map(
    (fs) => {
      const share = fs.builtUpAreaSqFt / totalAreaForShare;
      const flrObj = project.floors.find((f) => f.id === fs.floorId);
      let flrInteriors = 0;
      if (flrObj) {
        for (const obj of flrObj.objects) {
          if (obj.category === "staircases") continue;
          const catAsset = catalogAssetMap.get(obj.assetId);
          flrInteriors += Math.round(
            (catAsset ? catAsset.estimatedUnitCostInr : 35000) * tierMult
          );
        }
      }
      const flrMat = Math.round(civilMaterialCostINR * share);
      const flrLab = Math.round(labourCostINR * share);
      return {
        floorId: fs.floorId,
        floorName: fs.floorName,
        levelIndex: fs.levelIndex,
        builtUpAreaSqFt: fs.builtUpAreaSqFt,
        carpetAreaSqFt: fs.carpetAreaSqFt,
        materialCostINR: flrMat,
        labourCostINR: flrLab,
        interiorAssetsCostINR: flrInteriors,
        totalFloorCostINR: flrMat + flrLab + flrInteriors,
      };
    }
  );

  const hasUserOverrides =
    Object.keys(mergedCustomMatRates).length > 0 ||
    Boolean(options?.customLabourRates && Object.keys(options.customLabourRates).length > 0);

  return {
    projectId: project.id,
    projectName: project.name,
    calculationDate: new Date().toISOString(),
    rateVersion: "HMX-SOR-2026-V1",
    currency: cfg.currency || "INR",
    location: locProfile.city,
    state: locProfile.state,
    finishTier,
    assumptions: takeoff.assumptionsUsed,
    takeoff,
    materialCostINR,
    labourCostINR,
    equipmentCostINR,
    interiorFurnishingsCostINR,
    subtotalINR,
    overheadPercentage,
    overheadsINR,
    contingencyPercentage,
    contingencyINR,
    finalEstimatedCostINR,
    costPerSqFtINR,
    taxPercentage,
    applicableTaxesINR,
    totalWithTaxesINR,
    categoryBreakdowns,
    materialSchedule,
    labourSchedule,
    floorBreakdowns,
    estimationConfidence: hasUserOverrides
      ? "User-Calibrated"
      : "Preliminary Architectural",
    disclaimer: CONSTRUCTION_COST_DISCLAIMER,
  };
}

/**
 * Non-destructively evaluates a What-If Scenario against a baseline `BuildingProject`
 * without mutating the original project in memory or store.
 */
export function simulateWhatIfScenario(
  baselineProject: BuildingProject,
  scenarioInput: EstimateScenarioInput,
  baseOptions?: CostCalculationOptions
): EstimateScenarioComparison {
  const baselineEstimate = calculateConstructionEstimate(
    baselineProject,
    baseOptions
  );

  // Deep clone the project so the original is never mutated
  const cloned: BuildingProject = JSON.parse(JSON.stringify(baselineProject));

  if (scenarioInput.finishTier) {
    cloned.settings.costConfig.finishQuality = scenarioInput.finishTier;
  }
  if (scenarioInput.location) {
    cloned.settings.costConfig.location = scenarioInput.location;
    cloned.location = scenarioInput.location;
  }

  // Flooring swap across all rooms in cloned scenario
  if (
    scenarioInput.flooringMode &&
    scenarioInput.flooringMode !== "project_default"
  ) {
    const targetMatId =
      scenarioInput.flooringMode === "all_marble"
        ? "mat-floor-marble-statuario"
        : scenarioInput.flooringMode === "all_wood"
        ? "mat-wood-oak"
        : "mat-floor-vitrified-matte";

    for (const flr of cloned.floors) {
      for (const rm of flr.rooms) {
        rm.floorMaterialId = targetMatId;
      }
    }
  }

  // Additional rooms simulation
  if (
    scenarioInput.additionalRoomsCount &&
    scenarioInput.additionalRoomsCount > 0
  ) {
    const extraCount = scenarioInput.additionalRoomsCount;
    const areaEach = scenarioInput.additionalRoomAreaSqFt || 150;
    const side = roundToPrecision(Math.sqrt(areaEach), 2);
    const targetFloor = cloned.floors[0];
    for (let i = 0; i < extraCount; i++) {
      targetFloor.rooms.push({
        id: `sim-room-${i}`,
        floorId: targetFloor.id,
        type: "bedroom",
        name: `Simulated Room ${i + 1}`,
        polygon: [
          { x: 5, y: 5 },
          { x: 5 + side, y: 5 },
          { x: 5 + side, y: 5 + side },
          { x: 5, y: 5 + side },
        ],
        dimensions: {
          width: side,
          length: side,
          area: areaEach,
        },
        floorMaterialId:
          targetFloor.rooms[0]?.floorMaterialId || "mat-floor-italian-marble",
        wallMaterialId: "mat-wall-plaster-white",
        color: "#EFECE6",
      });
      targetFloor.walls.push({
        id: `sim-wall-${i}`,
        floorId: targetFloor.id,
        startPoint: { x: 5, y: 5 },
        endPoint: { x: 5 + side * 2.5, y: 5 },
        height: targetFloor.ceilingHeight || 10,
        thickness: 0.5,
        materialId: "mat-wall-plaster-white",
        isExterior: false,
      });
    }
  }

  // Additional floors simulation
  if (
    scenarioInput.additionalFloorsCount &&
    scenarioInput.additionalFloorsCount > 0
  ) {
    const templateFloor = cloned.floors[cloned.floors.length - 1];
    for (let f = 0; f < scenarioInput.additionalFloorsCount; f++) {
      const dupFloor = JSON.parse(JSON.stringify(templateFloor));
      dupFloor.id = `sim-floor-${f}`;
      dupFloor.name = `Simulated Upper Floor ${f + 1}`;
      dupFloor.levelIndex = templateFloor.levelIndex + f + 1;
      dupFloor.elevation =
        templateFloor.elevation + (f + 1) * (templateFloor.ceilingHeight + 0.5);
      cloned.floors.push(dupFloor);
    }
  }

  const scenarioCustomMatRates = {
    ...(baseOptions?.customMaterialRates || {}),
  };
  if (scenarioInput.paintMultiplier && scenarioInput.paintMultiplier !== 1) {
    const basePaint = baselineEstimate.materialSchedule.find(
      (m) => m.materialId === "rate-paint-emulsion"
    )?.unitRateINR || 360;
    scenarioCustomMatRates["rate-paint-emulsion"] = roundToPrecision(
      basePaint * scenarioInput.paintMultiplier,
      2
    );
  }
  if (scenarioInput.windowMultiplier && scenarioInput.windowMultiplier !== 1) {
    const baseWin = baselineEstimate.materialSchedule.find(
      (m) => m.materialId === "rate-windows-upvc-al"
    )?.unitRateINR || 460;
    scenarioCustomMatRates["rate-windows-upvc-al"] = roundToPrecision(
      baseWin * scenarioInput.windowMultiplier,
      2
    );
  }

  const scenarioEstimate = calculateConstructionEstimate(cloned, {
    ...baseOptions,
    finishTierOverride: scenarioInput.finishTier,
    locationOverride: scenarioInput.location,
    customMaterialRates: scenarioCustomMatRates,
  });

  const costDifferenceINR =
    scenarioEstimate.finalEstimatedCostINR -
    baselineEstimate.finalEstimatedCostINR;
  const percentageDelta =
    baselineEstimate.finalEstimatedCostINR > 0
      ? roundToPrecision(
          (costDifferenceINR / baselineEstimate.finalEstimatedCostINR) * 100,
          2
        )
      : 0;

  const categoryDeltas = baselineEstimate.categoryBreakdowns.map((bCat) => {
    const sCat = scenarioEstimate.categoryBreakdowns.find(
      (c) => c.categoryId === bCat.categoryId
    );
    const sCost = sCat?.totalCategoryCostINR || 0;
    return {
      categoryId: bCat.categoryId,
      categoryName: bCat.categoryName,
      baselineINR: bCat.totalCategoryCostINR,
      scenarioINR: sCost,
      deltaINR: sCost - bCat.totalCategoryCostINR,
    };
  });

  return {
    scenarioName: scenarioInput.scenarioName,
    baselineEstimate,
    scenarioEstimate,
    costDifferenceINR,
    percentageDelta,
    materialCostDeltaINR:
      scenarioEstimate.materialCostINR - baselineEstimate.materialCostINR,
    labourCostDeltaINR:
      scenarioEstimate.labourCostINR - baselineEstimate.labourCostINR,
    builtUpAreaDeltaSqFt: roundToPrecision(
      scenarioEstimate.takeoff.totalBuiltUpAreaSqFt -
        baselineEstimate.takeoff.totalBuiltUpAreaSqFt,
      2
    ),
    categoryDeltas,
  };
}

/**
 * Formats an INR amount into USD or INR display string (`₹1.42 Cr`, `₹84.50 L`, or `$168,400`).
 */
export function formatConstructionCurrency(
  amountINR: number,
  currency: "INR" | "USD" = "INR"
): string {
  const sign = amountINR < 0 ? "-" : "";
  const abs = Math.abs(amountINR);
  if (currency === "USD") {
    const usd = Math.round(abs / 84);
    return `${sign}$${usd.toLocaleString("en-US")}`;
  }
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}
