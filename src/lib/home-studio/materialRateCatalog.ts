import { FinishQuality } from "../../types/homeStudio";
import { roundToPrecision } from "./units";

export type IndianMaterialUnit =
  | "50 kg bag"
  | "kg"
  | "piece"
  | "cubic ft"
  | "cubic metre"
  | "square ft"
  | "litre"
  | "metre"
  | "set"
  | "lump sum";

export type RateSourceType =
  | "Illustrative Default Benchmark (Development)"
  | "CPWD / State SOR Reference"
  | "User Verified Supplier Rate";

export interface RateSource {
  sourceType: RateSourceType;
  publisher: string;
  referenceCode: string;
  effectiveDate: string;
  lastUpdatedDate: string;
  notes: string;
}

export interface MaterialRate {
  materialId: string;
  materialName: string;
  category:
    | "cement"
    | "steel"
    | "bricks"
    | "sand"
    | "aggregate"
    | "concrete"
    | "tiles"
    | "marble"
    | "wood_flooring"
    | "paint"
    | "primer_putty"
    | "plumbing_pipes"
    | "electrical_wiring"
    | "doors"
    | "windows"
    | "waterproofing"
    | "sanitary_fittings"
    | "electrical_switchgear";
  unit: IndianMaterialUnit;
  rate: number; // INR per unit
  currency: "INR" | "USD";
  location: string; // e.g. "Bengaluru"
  state: string;    // e.g. "Karnataka"
  rateSource: RateSource;
  effectiveDate: string;
  lastUpdatedDate: string;
  finishTier: FinishQuality;
}

export type LabourTradeCategory =
  | "Excavation"
  | "Masonry"
  | "Concrete work"
  | "Plastering"
  | "Flooring"
  | "Painting"
  | "Plumbing"
  | "Electrical work"
  | "Carpentry"
  | "Finishing";

export interface LabourRate {
  tradeId: string;
  trade: LabourTradeCategory;
  unit: "cubic ft" | "square ft" | "kg" | "point" | "lump sum";
  rate: number; // INR per unit
  currency: "INR" | "USD";
  location: string;
  state: string;
  rateSource: RateSource;
  effectiveDate: string;
  lastUpdatedDate: string;
}

export interface CityConstructionLocationProfile {
  id: string;
  city: string;
  state: string;
  cityTier: "Tier 1 (Metro)" | "Tier 2 (Urban)" | "Tier 3 (Suburban)";
  materialIndexMultiplier: number;
  labourIndexMultiplier: number;
}

export const INDIAN_CONSTRUCTION_LOCATIONS: CityConstructionLocationProfile[] = [
  {
    id: "loc-mumbai-mh",
    city: "Mumbai",
    state: "Maharashtra",
    cityTier: "Tier 1 (Metro)",
    materialIndexMultiplier: 1.14,
    labourIndexMultiplier: 1.22,
  },
  {
    id: "loc-bengaluru-ka",
    city: "Bengaluru",
    state: "Karnataka",
    cityTier: "Tier 1 (Metro)",
    materialIndexMultiplier: 1.08,
    labourIndexMultiplier: 1.15,
  },
  {
    id: "loc-delhi-ncr",
    city: "New Delhi NCR",
    state: "Delhi",
    cityTier: "Tier 1 (Metro)",
    materialIndexMultiplier: 1.06,
    labourIndexMultiplier: 1.12,
  },
  {
    id: "loc-hyderabad-ts",
    city: "Hyderabad",
    state: "Telangana",
    cityTier: "Tier 1 (Metro)",
    materialIndexMultiplier: 1.02,
    labourIndexMultiplier: 1.05,
  },
  {
    id: "loc-pune-mh",
    city: "Pune",
    state: "Maharashtra",
    cityTier: "Tier 2 (Urban)",
    materialIndexMultiplier: 1.0,
    labourIndexMultiplier: 1.0,
  },
  {
    id: "loc-ahmedabad-gj",
    city: "Ahmedabad",
    state: "Gujarat",
    cityTier: "Tier 2 (Urban)",
    materialIndexMultiplier: 0.95,
    labourIndexMultiplier: 0.94,
  },
  {
    id: "loc-jaipur-rj",
    city: "Jaipur",
    state: "Rajasthan",
    cityTier: "Tier 2 (Urban)",
    materialIndexMultiplier: 0.92,
    labourIndexMultiplier: 0.9,
  },
  {
    id: "loc-indore-mp",
    city: "Indore",
    state: "Madhya Pradesh",
    cityTier: "Tier 3 (Suburban)",
    materialIndexMultiplier: 0.88,
    labourIndexMultiplier: 0.85,
  },
];

export const FINISH_TIER_MATERIAL_MULTIPLIERS: Record<FinishQuality, number> = {
  economy: 0.82,
  standard: 1.0,
  premium: 1.38,
};

const DEFAULT_ILLUSTRATIVE_SOURCE: RateSource = {
  sourceType: "Illustrative Default Benchmark (Development)",
  publisher: "HMX Engineering Reference Catalog (Non-Live)",
  referenceCode: "HMX-SOR-2026-V1",
  effectiveDate: "2026-01-01",
  lastUpdatedDate: "2026-11-01",
  notes:
    "Illustrative baseline development rates. Enter verified local supplier quotations before budgeting.",
};

/**
 * Base material rate definitions (Standard tier, index = 1.00, Pune/Baseline).
 */
const BASE_MATERIAL_CATALOG_DEFINITIONS: Array<{
  materialId: string;
  materialName: string;
  category: MaterialRate["category"];
  unit: IndianMaterialUnit;
  baseRateStandardINR: number;
  tierSensitivity: "structural" | "finishing";
}> = [
  {
    materialId: "rate-cement-opc53",
    materialName: "OPC 53 / PPC Grade Cement",
    category: "cement",
    unit: "50 kg bag",
    baseRateStandardINR: 390,
    tierSensitivity: "structural",
  },
  {
    materialId: "rate-steel-fe550d",
    materialName: "Fe550D TMT Reinforcement Steel",
    category: "steel",
    unit: "kg",
    baseRateStandardINR: 74,
    tierSensitivity: "structural",
  },
  {
    materialId: "rate-bricks-modular",
    materialName: "First-Class Red Clay / AAC Modular Bricks",
    category: "bricks",
    unit: "piece",
    baseRateStandardINR: 9.5,
    tierSensitivity: "structural",
  },
  {
    materialId: "rate-sand-msand",
    materialName: "Washed M-Sand / River Sand",
    category: "sand",
    unit: "cubic ft",
    baseRateStandardINR: 58,
    tierSensitivity: "structural",
  },
  {
    materialId: "rate-aggregate-20mm",
    materialName: "Crushed Stone Aggregate (20mm/10mm)",
    category: "aggregate",
    unit: "cubic ft",
    baseRateStandardINR: 46,
    tierSensitivity: "structural",
  },
  {
    materialId: "rate-concrete-rmc-m25",
    materialName: "Ready-Mix Concrete (RMC M25 Grade)",
    category: "concrete",
    unit: "cubic metre",
    baseRateStandardINR: 6200,
    tierSensitivity: "structural",
  },
  {
    materialId: "rate-tiles-vitrified",
    materialName: "Vitrified / Porcelain Flooring Tiles",
    category: "tiles",
    unit: "square ft",
    baseRateStandardINR: 115,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-marble-italian",
    materialName: "Natural Marble / Honed Travertine Slab",
    category: "marble",
    unit: "square ft",
    baseRateStandardINR: 340,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-wood-flooring",
    materialName: "Engineered Oak / Teak Timber Flooring",
    category: "wood_flooring",
    unit: "square ft",
    baseRateStandardINR: 265,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-paint-emulsion",
    materialName: "Low-VOC Architectural Emulsion Paint",
    category: "paint",
    unit: "litre",
    baseRateStandardINR: 360,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-primer-putty",
    materialName: "Acrylic Wall Putty & Alkali Primer",
    category: "primer_putty",
    unit: "kg",
    baseRateStandardINR: 38,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-plumbing-cpvc",
    materialName: "CPVC / UPVC Plumbing & Drainage Pipes",
    category: "plumbing_pipes",
    unit: "metre",
    baseRateStandardINR: 215,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-electrical-frls",
    materialName: "FRLS Copper Electrical Conduit Wiring",
    category: "electrical_wiring",
    unit: "metre",
    baseRateStandardINR: 92,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-doors-timber",
    materialName: "Flush / Solid Teak Door Shutter & Frame",
    category: "doors",
    unit: "square ft",
    baseRateStandardINR: 580,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-windows-upvc-al",
    materialName: "Anodized Aluminium / uPVC Glazed Windows",
    category: "windows",
    unit: "square ft",
    baseRateStandardINR: 460,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-waterproofing-membrane",
    materialName: "Polymer & Crystalline Waterproofing Coat",
    category: "waterproofing",
    unit: "square ft",
    baseRateStandardINR: 62,
    tierSensitivity: "structural",
  },
  {
    materialId: "rate-sanitary-bathroom-set",
    materialName: "Bathroom Sanitaryware & CP Fittings Allowance",
    category: "sanitary_fittings",
    unit: "set",
    baseRateStandardINR: 48000,
    tierSensitivity: "finishing",
  },
  {
    materialId: "rate-electrical-switchgear-point",
    materialName: "Modular Switches, Sockets & MCB Point Allowance",
    category: "electrical_switchgear",
    unit: "piece",
    baseRateStandardINR: 680,
    tierSensitivity: "finishing",
  },
];

const BASE_LABOUR_CATALOG_DEFINITIONS: Array<{
  tradeId: string;
  trade: LabourTradeCategory;
  unit: LabourRate["unit"];
  baseRateINR: number;
}> = [
  {
    tradeId: "lab-excavation",
    trade: "Excavation",
    unit: "cubic ft",
    baseRateINR: 24,
  },
  {
    tradeId: "lab-masonry",
    trade: "Masonry",
    unit: "cubic ft",
    baseRateINR: 52,
  },
  {
    tradeId: "lab-concrete",
    trade: "Concrete work",
    unit: "cubic ft",
    baseRateINR: 68,
  },
  {
    tradeId: "lab-plastering",
    trade: "Plastering",
    unit: "square ft",
    baseRateINR: 24,
  },
  {
    tradeId: "lab-flooring",
    trade: "Flooring",
    unit: "square ft",
    baseRateINR: 48,
  },
  {
    tradeId: "lab-painting",
    trade: "Painting",
    unit: "square ft",
    baseRateINR: 16,
  },
  {
    tradeId: "lab-plumbing",
    trade: "Plumbing",
    unit: "square ft",
    baseRateINR: 38,
  },
  {
    tradeId: "lab-electrical",
    trade: "Electrical work",
    unit: "square ft",
    baseRateINR: 42,
  },
  {
    tradeId: "lab-carpentry",
    trade: "Carpentry",
    unit: "square ft",
    baseRateINR: 115,
  },
  {
    tradeId: "lab-finishing",
    trade: "Finishing",
    unit: "square ft",
    baseRateINR: 34,
  },
];

export function resolveLocationProfile(
  locationString: string
): CityConstructionLocationProfile {
  const norm = (locationString || "").toLowerCase();
  const match = INDIAN_CONSTRUCTION_LOCATIONS.find(
    (loc) =>
      norm.includes(loc.city.toLowerCase()) ||
      norm.includes(loc.state.toLowerCase())
  );
  if (match) return match;

  return {
    id: "loc-custom",
    city: locationString.split(",")[0]?.trim() || "Bengaluru",
    state: locationString.split(",")[1]?.trim() || "Karnataka",
    cityTier: "Tier 1 (Metro)",
    materialIndexMultiplier: 1.05,
    labourIndexMultiplier: 1.08,
  };
}

/**
 * Generates the complete material rate catalog for a given location, finish tier,
 * and optional user-verified supplier rate overrides.
 */
export function buildMaterialRateCatalog(params: {
  location: string;
  finishTier: FinishQuality;
  currency?: "INR" | "USD";
  customMaterialRates?: Record<string, number>;
  rateUpdateDate?: string;
}): MaterialRate[] {
  const locProfile = resolveLocationProfile(params.location);
  const finishMult = FINISH_TIER_MATERIAL_MULTIPLIERS[params.finishTier] ?? 1.0;
  const currency = params.currency || "INR";
  const updatedDate = params.rateUpdateDate || "2026-11-01";

  return BASE_MATERIAL_CATALOG_DEFINITIONS.map((def) => {
    const userOverride = params.customMaterialRates?.[def.materialId];
    const hasOverride =
      typeof userOverride === "number" &&
      Number.isFinite(userOverride) &&
      userOverride > 0;

    // Structural materials scale by location index; finishing materials scale by both location and finish tier
    const tierFactor =
      def.tierSensitivity === "finishing"
        ? finishMult
        : params.finishTier === "premium"
        ? 1.06
        : params.finishTier === "economy"
        ? 0.96
        : 1.0;

    const computedRate = hasOverride
      ? roundToPrecision(userOverride, 2)
      : roundToPrecision(
          def.baseRateStandardINR *
            locProfile.materialIndexMultiplier *
            tierFactor,
          2
        );

    return {
      materialId: def.materialId,
      materialName: def.materialName,
      category: def.category,
      unit: def.unit,
      rate: computedRate,
      currency,
      location: locProfile.city,
      state: locProfile.state,
      rateSource: hasOverride
        ? {
            sourceType: "User Verified Supplier Rate",
            publisher: "User Custom Supplier Entry",
            referenceCode: "USER-OVERRIDE",
            effectiveDate: updatedDate,
            lastUpdatedDate: updatedDate,
            notes: "Verified local supplier rate entered by workspace user.",
          }
        : DEFAULT_ILLUSTRATIVE_SOURCE,
      effectiveDate: DEFAULT_ILLUSTRATIVE_SOURCE.effectiveDate,
      lastUpdatedDate: updatedDate,
      finishTier: params.finishTier,
    };
  });
}

/**
 * Generates the complete 10-trade labour rate schedule for a given location
 * and optional custom labour overrides.
 */
export function buildLabourRateCatalog(params: {
  location: string;
  finishTier: FinishQuality;
  currency?: "INR" | "USD";
  customLabourRates?: Record<string, number>;
  rateUpdateDate?: string;
}): LabourRate[] {
  const locProfile = resolveLocationProfile(params.location);
  const tierLabourMult =
    params.finishTier === "premium"
      ? 1.18
      : params.finishTier === "economy"
      ? 0.92
      : 1.0;
  const currency = params.currency || "INR";
  const updatedDate = params.rateUpdateDate || "2026-11-01";

  return BASE_LABOUR_CATALOG_DEFINITIONS.map((def) => {
    const userOverride = params.customLabourRates?.[def.tradeId];
    const hasOverride =
      typeof userOverride === "number" &&
      Number.isFinite(userOverride) &&
      userOverride > 0;

    const computedRate = hasOverride
      ? roundToPrecision(userOverride, 2)
      : roundToPrecision(
          def.baseRateINR * locProfile.labourIndexMultiplier * tierLabourMult,
          2
        );

    return {
      tradeId: def.tradeId,
      trade: def.trade,
      unit: def.unit,
      rate: computedRate,
      currency,
      location: locProfile.city,
      state: locProfile.state,
      rateSource: hasOverride
        ? {
            sourceType: "User Verified Supplier Rate",
            publisher: "User Custom Contractor Rate",
            referenceCode: "USER-LABOUR-OVERRIDE",
            effectiveDate: updatedDate,
            lastUpdatedDate: updatedDate,
            notes: "Custom local contractor rate entered by workspace user.",
          }
        : DEFAULT_ILLUSTRATIVE_SOURCE,
      effectiveDate: DEFAULT_ILLUSTRATIVE_SOURCE.effectiveDate,
      lastUpdatedDate: updatedDate,
    };
  });
}

