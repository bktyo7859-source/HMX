/**
 * HMX Home Studio — Optional HMX Property Valuation Bridge (Phase 10.3 & 10.4)
 *
 * Maps a `BuildingProject` strictly to the original 12 Kaggle `Housing.csv` features
 * supported by `predictProperty()` (`src/services/predictionService.ts`) without
 * modifying `hmx_model.joblib`, `backend/model.py`, or `/predict`.
 *
 * Strictly separates:
 * - Construction Replacement Cost (physical building cost from Phase 8 costEngine)
 * - HMX ML Market Valuation (predicted market price from existing GradientBoostingRegressor)
 */

import { BuildingProject } from "../../types/homeStudio";
import { PredictionInput, PredictionResult } from "../../types/property";
import { predictProperty } from "../../services/predictionService";
import {
  calculateConstructionEstimate,
  ConstructionEstimate,
  CostCalculationOptions,
} from "./costEngine";
import { roundToPrecision } from "./units";

export interface Housing12FeaturePayload {
  area: number;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  mainroad: boolean;
  guestroom: boolean;
  basement: boolean;
  hotwaterheating: boolean;
  airconditioning: boolean;
  parking: number;
  prefarea: boolean;
  furnishingstatus: "furnished" | "semi-furnished" | "unfurnished";
}

export interface ValuationBridgeOverrides {
  mainroad?: boolean;
  guestroom?: boolean;
  hotwaterheating?: boolean;
  airconditioning?: boolean;
  parking?: number;
  prefarea?: boolean;
  furnishingstatus?: "furnished" | "semi-furnished" | "unfurnished";
}

export interface ValuationFeatureExtractionResult {
  features: Housing12FeaturePayload;
  missingRequiredFields: string[];
  userConfigurableSiteFields: string[];
  featureDerivationNotes: Record<keyof Housing12FeaturePayload, string>;
}

export interface ConstructionVsMarketValuationComparison {
  projectId: string;
  projectName: string;
  comparedAt: string;
  extractedFeatures: Housing12FeaturePayload;
  constructionEstimate: ConstructionEstimate;
  marketValuation: PredictionResult;

  // Side-by-Side Comparison Metrics (Phase 10.3 & 10.4)
  constructionReplacementCostINR: number;
  marketValuationINR: number;
  valuationMinusConstructionINR: number;
  constructionCostPerSqFtINR: number;
  marketValuePerSqFtINR: number | null;
  marketRangeLowerINR: number;
  marketRangeUpperINR: number;

  valuationDisclaimer: string;
  modelLimitations: string[];
}

export const HMX_VALUATION_BRIDGE_DISCLAIMER =
  "Construction Replacement Cost represents the estimated physical cost to construct the building (materials, labour, equipment, overheads, and contingency, excluding land value). HMX ML Market Valuation is an independent statistical estimate trained on the Kaggle Housing.csv dataset (N=545, 12 features) and is NOT a formal certified property appraisal.";

/**
 * Extracts ONLY the 12 supported `Housing.csv` features from `BuildingProject`
 * and flags any missing or site-configurable inputs.
 */
export function extractHousing12FeaturesFromProject(
  project: BuildingProject,
  overrides?: ValuationBridgeOverrides
): ValuationFeatureExtractionResult {
  const estimate = calculateConstructionEstimate(project);
  const builtUpAreaSqFt = Math.round(estimate.takeoff.totalBuiltUpAreaSqFt);

  let bedroomCount = 0;
  let bathroomCount = 0;
  let garageCount = 0;
  let hasBasementFloor = false;
  let totalFurnitureItems = 0;

  for (const flr of project.floors) {
    if (flr.type === "basement" || flr.levelIndex < 0) {
      hasBasementFloor = true;
    }
    totalFurnitureItems += flr.objects.filter(
      (o) => o.category !== "staircases"
    ).length;

    for (const rm of flr.rooms) {
      if (rm.type === "bedroom" || rm.type === "master_bedroom") {
        bedroomCount += 1;
      } else if (rm.type === "bathroom") {
        bathroomCount += 1;
      } else if (rm.type === "garage") {
        garageCount += 1;
      }
    }
  }

  const aboveGradeStories = Math.max(
    1,
    project.floors.filter((f) => f.type !== "basement" && f.levelIndex >= 0)
      .length
  );

  const inferredFurnishing: "furnished" | "semi-furnished" | "unfurnished" =
    totalFurnitureItems >= 8
      ? "furnished"
      : totalFurnitureItems >= 2
      ? "semi-furnished"
      : "unfurnished";

  const missingRequiredFields: string[] = [];
  if (builtUpAreaSqFt <= 0) {
    missingRequiredFields.push("area (Built-up area must be > 0 sq.ft)");
  }
  if (bedroomCount === 0) {
    missingRequiredFields.push(
      "bedrooms (No bedroom room polygons detected on floor plan)"
    );
  }
  if (bathroomCount === 0) {
    missingRequiredFields.push(
      "bathrooms (No bathroom room polygons detected on floor plan)"
    );
  }

  const userConfigurableSiteFields: string[] = [];
  if (overrides?.hotwaterheating === undefined) {
    userConfigurableSiteFields.push("hotwaterheating");
  }
  if (overrides?.airconditioning === undefined) {
    userConfigurableSiteFields.push("airconditioning");
  }
  if (overrides?.prefarea === undefined) {
    userConfigurableSiteFields.push("prefarea");
  }

  const features: Housing12FeaturePayload = {
    area: Math.max(300, builtUpAreaSqFt),
    bedrooms: Math.max(1, bedroomCount),
    bathrooms: Math.max(1, bathroomCount),
    stories: aboveGradeStories,
    mainroad: overrides?.mainroad ?? Boolean(project.plot.roadFacing),
    guestroom: overrides?.guestroom ?? bedroomCount >= 3,
    basement: hasBasementFloor,
    hotwaterheating: overrides?.hotwaterheating ?? false,
    airconditioning: overrides?.airconditioning ?? true,
    parking: overrides?.parking ?? Math.max(1, garageCount),
    prefarea: overrides?.prefarea ?? true,
    furnishingstatus: overrides?.furnishingstatus ?? inferredFurnishing,
  };

  const featureDerivationNotes: Record<keyof Housing12FeaturePayload, string> =
    {
      area: `Derived from total built-up area (${builtUpAreaSqFt.toLocaleString(
        "en-IN"
      )} sq.ft)`,
      bedrooms:
        bedroomCount > 0
          ? `Counted ${bedroomCount} bedroom(s) in floor plan`
          : "Defaulted to 1 (no bedroom polygon drawn yet)",
      bathrooms:
        bathroomCount > 0
          ? `Counted ${bathroomCount} bathroom(s) in floor plan`
          : "Defaulted to 1 (no bathroom polygon drawn yet)",
      stories: `${aboveGradeStories} above-grade floor(s)`,
      mainroad: `Plot road-facing edge: ${project.plot.roadFacing}`,
      guestroom:
        overrides?.guestroom !== undefined
          ? "User specified"
          : bedroomCount >= 3
          ? "Inferred from >= 3 bedrooms"
          : "Not detected",
      basement: hasBasementFloor
        ? "Basement floor present in Floor Manager"
        : "No basement floor",
      hotwaterheating:
        overrides?.hotwaterheating !== undefined
          ? "User specified"
          : "Configurable MEP site attribute",
      airconditioning:
        overrides?.airconditioning !== undefined
          ? "User specified"
          : "Configurable HVAC site attribute",
      parking:
        overrides?.parking !== undefined
          ? "User specified parking bays"
          : garageCount > 0
          ? `Counted ${garageCount} garage room(s)`
          : "Defaulted to 1 bay",
      prefarea:
        overrides?.prefarea !== undefined
          ? "User specified locality preference"
          : "Configurable locality attribute",
      furnishingstatus:
        overrides?.furnishingstatus !== undefined
          ? "User specified furnishing tier"
          : `Inferred from ${totalFurnitureItems} placed furniture item(s)`,
    };

  return {
    features,
    missingRequiredFields,
    userConfigurableSiteFields,
    featureDerivationNotes,
  };
}

/**
 * Evaluates both the Phase 8 Construction Estimate and the existing HMX ML Market Valuation
 * using strictly the 12 supported `Housing.csv` features.
 */
export async function evaluateProjectValuationBridge(
  project: BuildingProject,
  overrides?: ValuationBridgeOverrides,
  costOptions?: CostCalculationOptions
): Promise<ConstructionVsMarketValuationComparison> {
  const extraction = extractHousing12FeaturesFromProject(project, overrides);
  const constructionEstimate = calculateConstructionEstimate(
    project,
    costOptions
  );

  // Build strict 12-feature payload for existing predictProperty service
  const strictPredictionInput: PredictionInput = {
    area: extraction.features.area,
    area_sqft: extraction.features.area,
    bedrooms: extraction.features.bedrooms,
    bathrooms: extraction.features.bathrooms,
    stories: extraction.features.stories,
    floors: extraction.features.stories,
    mainroad: extraction.features.mainroad,
    guestroom: extraction.features.guestroom,
    basement: extraction.features.basement,
    hotwaterheating: extraction.features.hotwaterheating,
    airconditioning: extraction.features.airconditioning,
    parking: extraction.features.parking,
    prefarea: extraction.features.prefarea,
    furnishingstatus: extraction.features.furnishingstatus,
    currency: "INR",
  };

  const marketValuation = await predictProperty(strictPredictionInput);

  const constructionReplacementCostINR =
    constructionEstimate.finalEstimatedCostINR;
  const marketValuationINR = Math.round(marketValuation.predicted_price);
  const valuationMinusConstructionINR =
    marketValuationINR - constructionReplacementCostINR;

  const marketValuePerSqFtINR =
    typeof marketValuation.price_per_sqft === "number" &&
    marketValuation.price_per_sqft > 0
      ? Math.round(marketValuation.price_per_sqft)
      : extraction.features.area > 0
      ? roundToPrecision(marketValuationINR / extraction.features.area, 0)
      : null;

  return {
    projectId: project.id,
    projectName: project.name,
    comparedAt: new Date().toISOString(),
    extractedFeatures: extraction.features,
    constructionEstimate,
    marketValuation,
    constructionReplacementCostINR,
    marketValuationINR,
    valuationMinusConstructionINR,
    constructionCostPerSqFtINR: constructionEstimate.costPerSqFtINR,
    marketValuePerSqFtINR,
    marketRangeLowerINR: Math.round(marketValuation.lower_range),
    marketRangeUpperINR: Math.round(marketValuation.upper_range),
    valuationDisclaimer: HMX_VALUATION_BRIDGE_DISCLAIMER,
    modelLimitations: [
      "The HMX ML Valuation Engine is trained on the Kaggle Housing.csv dataset (545 residential records, 12 tabular features).",
      "Only the 12 supported tabular features are transmitted to the ML model; custom 3D geometry, architectural finishes, and lighting presets do not alter ML model weights.",
      "Construction replacement cost measures physical building construction only (excluding land value), whereas market valuation reflects total property transaction pricing in the training dataset.",
    ],
  };
}

