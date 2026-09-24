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

export interface LocationAnalyticsEntry {
  location: string;
  prefarea: "yes" | "no";
  count: number;
  percentage: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  avg_price_per_sqft: number;
  median_price_per_sqft: number;
  avg_area: number;
}

export interface PricePerSqFtStats {
  avg: number;
  median: number;
  min: number;
  max: number;
  std: number;
  q25: number;
  q75: number;
}

export interface ErrorDiagnostics {
  mean_error: number;
  median_error: number;
  max_error: number;
  mae: number;
  rmse: number;
  mape: number;
  underpredicted_count: number;
  underpredicted_pct: number;
  overpredicted_count: number;
  overpredicted_pct: number;
  within_10_pct: number;
  within_20_pct: number;
  within_30_pct: number;
}

export interface HousingDatasetRecord {
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  mainroad: string;
  guestroom: string;
  basement: string;
  hotwaterheating: string;
  airconditioning: string;
  parking: number;
  prefarea: string;
  furnishingstatus: string;
  price_per_sqft?: number;
}

export interface DatasetInsights {
  summary: {
    total_properties: number;
    avg_price: number;
    median_price: number;
    min_price: number;
    max_price: number;
    avg_price_per_sqft: number;
    median_price_per_sqft?: number;
    min_price_per_sqft?: number;
    max_price_per_sqft?: number;
    avg_area?: number;
    median_area?: number;
    min_area?: number;
    max_area?: number;
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
  area_distribution?: Array<{ range: string; min: number; max: number; count: number; percentage: number }>;
  location_analytics?: LocationAnalyticsEntry[];
  price_per_sqft_stats?: PricePerSqFtStats;
}

export interface ModelBenchmark {
  model_name: string;
  algorithm: string;
  description: string;
  is_active: boolean;
  test_r2: number;
  test_mae: number;
  test_rmse: number;
  test_mape: number;
  train_r2: number;
  cv_r2_mean: number;
  cv_r2_std: number;
}

export interface FeatureImportanceEntry {
  feature: string;
  importance_percentage: number;
  raw_weight: number;
}

export interface ResidualBin {
  bin: string;
  min_error: number;
  max_error: number;
  count: number;
  percentage: number;
}

export interface PredictionVsActualEntry {
  index?: number;
  actual: number;
  predicted: number;
  residual: number;
  abs_error?: number;
  pct_error: number;
}

export interface CorrelationEntry {
  feature: string;
  correlation: number;
  direction: "positive" | "negative";
  strength: "strong" | "moderate" | "weak";
}

export interface NumericDriftBound {
  type: "numeric";
  min: number;
  max: number;
  mean: number;
  std: number;
  p25: number;
  p75: number;
}

export interface CategoricalDriftBound {
  type: "categorical";
  categories: string[];
  proportions: Record<string, number>;
}

export interface MLAnalyticsKPIs {
  dataset_size: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  avg_price_per_sqft: number;
  median_price_per_sqft?: number;
  avg_area: number;
  median_area: number;
  num_features: number;
  active_model_name: string;
  test_r2?: number;
  test_mae?: number;
  test_rmse?: number;
  test_mape?: number;
  train_r2?: number;
  train_mae?: number;
  cv_mean?: number;
  cv_std?: number;
  within_10_pct?: number;
  within_20_pct?: number;
  within_30_pct?: number;
}

export interface MLAnalyticsData {
  status: "online" | "fallback" | "offline";
  model_loaded: boolean;
  trained_at: string;
  version: string;
  base_currency: "INR";
  model_metadata: {
    name: string;
    algorithm: string;
    framework: string;
    dataset_name: string;
    dataset_rows: number;
    train_samples: number;
    test_samples: number;
    features_count: number;
    hyperparameters: {
      n_estimators: number;
      learning_rate: number;
      max_depth: number;
      subsample: number;
      random_state: number;
      lower_quantile_alpha?: number;
      upper_quantile_alpha?: number;
    };
    interval_type: string;
  };
  kpis: MLAnalyticsKPIs;
  metrics: {
    mae?: number;
    rmse?: number;
    r2_score?: number;
    mape?: number;
    train_mae?: number;
    train_rmse?: number;
    train_r2_score?: number;
    train_mape?: number;
    cv_r2_mean?: number;
    cv_r2_std?: number;
    cv_scores?: number[];
    within_10_pct?: number;
    within_20_pct?: number;
    within_30_pct?: number;
  };
  model_comparison: ModelBenchmark[];
  feature_importance: {
    sorted: FeatureImportanceEntry[];
    grouped: Record<string, number>;
    raw: Record<string, number>;
  };
  residual_analysis: {
    distribution: ResidualBin[];
    actual_vs_predicted: PredictionVsActualEntry[];
    error_diagnostics?: ErrorDiagnostics;
    tolerance_bands: {
      within_10_pct?: number;
      within_20_pct?: number;
      within_30_pct?: number;
    };
  };
  correlations: CorrelationEntry[];
  drift_bounds: Record<string, NumericDriftBound | CategoricalDriftBound>;
  dataset_insights: DatasetInsights;
  dataset_records?: HousingDatasetRecord[];
  system_health: {
    api_reachable: boolean;
    model_loaded: boolean;
    dataset_available: boolean;
    inference_latency_ms: number;
    memory_resident: boolean;
    null_values_count: number;
    status_code: string;
  };
}

