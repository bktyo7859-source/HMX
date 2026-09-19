export type PropertyType =
  | "Apartment"
  | "Villa"
  | "Independent House"
  | "Townhouse"
  | "Penthouse"
  | "Residential House"
  | "Other";

export type PropertyCondition =
  | "New"
  | "Good"
  | "Average"
  | "Needs Renovation";

export type FurnishingType =
  | "Fully Furnished"
  | "Semi Furnished"
  | "Unfurnished";

export type ModelReliability = "High" | "Medium" | "Standard" | "Low";

export interface Property {
  id: string;
  name: string;
  image: string;
  location: string;
  city: string;
  stateCountry: string;
  price: string;
  priceNumeric: number;
  currency: "USD" | "INR" | "EUR";
  bedrooms: number;
  bathrooms: number;
  area: number; // sq ft
  pricePerSqFt: number;
  propertyType: PropertyType;
  description: string;
  features: string[];
  latitude: number;
  longitude: number;
  mapsUrl: string;
  isDemo: boolean;
  yearBuilt?: number;
}

export interface PredictionInput {
  // Core Housing.csv Features (Used by Active ML Model)
  area?: number;
  area_sqft: number;
  bedrooms: number;
  bathrooms: number;
  stories?: number;
  floors?: number;
  parking: number;
  mainroad: boolean;
  guestroom: boolean;
  basement: boolean;
  hotwaterheating: boolean;
  airconditioning: boolean;
  prefarea: boolean;
  furnishingstatus?: "furnished" | "semi-furnished" | "unfurnished";
  furnishing?: FurnishingType | string;
  currency?: "INR" | "USD";

  // Optional Context & Future V2 Roadmap Fields (Preserved for presentation)
  city?: string;
  locality?: string;
  pincode?: string;
  property_type?: PropertyType;
  condition?: PropertyCondition;
  floor_number?: number;
  balcony?: boolean;
  garden?: boolean;
  pool?: boolean;
  lift?: boolean;
  security?: boolean;
  gym?: boolean;
}

export interface FeatureImpact {
  feature: string;
  impact: "High Impact" | "Medium Impact" | "Low Impact";
  percentage: number;
  description: string;
  direction: "positive" | "negative" | "neutral";
}

export interface MarketComparisonPoint {
  label: string;
  price: number;
  pricePerSqFt: number;
  isSubject?: boolean;
}

export interface PriceTrendPoint {
  year: string;
  pricePerSqFt: number;
  growthRate?: number;
}

export interface PredictionResult {
  predicted_price: number;
  currency: "INR" | "USD";
  price_per_sqft: number;
  lower_range: number;
  upper_range: number;
  reliability: ModelReliability;
  confidence_score?: number; // Model certainty score
  uncertainty_percentage?: number;
  is_demo_model: boolean;
  model_name: string;
  model_version: string;
  prediction_timestamp: string;
  input_summary: PredictionInput;
  feature_impacts: FeatureImpact[];
  market_comparison: {
    estimated_price: number;
    local_average?: number;
    locality_median?: number;
    suburb_upper?: number;
    comparison_points: MarketComparisonPoint[];
  };
  price_trend?: PriceTrendPoint[];
  location_data: {
    city: string;
    locality: string;
    mapsUrl: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface ModelMetadata {
  model_type: string;
  framework: string;
  dataset: string;
  metrics: {
    mae: number;
    rmse: number;
    r2_score: number;
  };
  training_samples: number;
  test_samples: number;
  total_samples: number;
  status: "active" | "demo";
}

export interface DatasetInsights {
  summary: {
    total_properties: number;
    avg_price: number;
    median_price: number;
    min_price: number;
    max_price: number;
    avg_price_per_sqft: number;
    q25_price: number;
    q50_price: number;
    q75_price: number;
  };
  by_bedrooms: Array<{ bedrooms: number; avg_price: number; count: number }>;
  by_bathrooms: Array<{ bathrooms: number; avg_price: number; count: number }>;
  by_stories: Array<{ stories: number; avg_price: number; count: number }>;
  by_furnishing: Array<{ furnishingstatus: string; avg_price: number; count: number }>;
  by_airconditioning: Array<{ airconditioning: string; avg_price: number; count: number }>;
  by_prefarea: Array<{ prefarea: string; avg_price: number; count: number }>;
  by_parking: Array<{ parking: number; avg_price: number; count: number }>;
  price_distribution: Array<{ range: string; min: number; max: number; count: number; percentage: number }>;
}
