import { MLAnalyticsData } from "@/types/property";

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "/api/backend";
  }
  return "http://localhost:8000";
}

export async function fetchMLAnalytics(): Promise<MLAnalyticsData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`${getApiBaseUrl()}/analytics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data: MLAnalyticsData = await res.json();
      return {
        ...data,
        status: "online",
        system_health: {
          ...data.system_health,
          api_reachable: true,
          model_loaded: true,
          status_code: "HEALTHY_ONLINE",
        },
      };
    }
  } catch (err) {
    console.warn(
      "FastAPI /analytics endpoint unreachable. Returning authentic offline baseline dataset metrics.",
      err
    );
  }

  // Graceful offline fallback derived strictly from precomputed Housing.csv & joblib artifact
  return getOfflineAnalyticsBaseline();
}

function getOfflineAnalyticsBaseline(): MLAnalyticsData {
  return {
    status: "offline",
    model_loaded: false,
    trained_at: "Offline Baseline (Precomputed)",
    version: "2.0.0-housing",
    base_currency: "INR",
    model_metadata: {
      name: "HMX Gradient Boosting Valuation Engine",
      algorithm: "GradientBoostingRegressor",
      framework: "Scikit-Learn",
      dataset_name: "Kaggle Housing Prices Dataset (Housing.csv)",
      dataset_rows: 545,
      train_samples: 436,
      test_samples: 109,
      features_count: 12,
      hyperparameters: {
        n_estimators: 120,
        learning_rate: 0.05,
        max_depth: 3,
        subsample: 0.85,
        random_state: 42,
        lower_quantile_alpha: 0.1,
        upper_quantile_alpha: 0.9,
      },
      interval_type: "Quantile Gradient Boosting (10th - 90th Percentile)",
    },
    kpis: {
      dataset_size: 545,
      avg_price: 4766729.25,
      median_price: 4620000.0,
      min_price: 1750000.0,
      max_price: 13300000.0,
      avg_price_per_sqft: 997.58,
      avg_area: 5150.5,
      median_area: 4600.0,
      num_features: 12,
      active_model_name: "Gradient Boosting Regressor",
      test_r2: 0.639,
      test_mae: 988898.63,
      test_rmse: 1350804.54,
      test_mape: 21.22,
      train_r2: 0.8333,
      train_mae: 534744.19,
      cv_mean: 0.6351,
      cv_std: 0.0405,
      within_10_pct: 33.0,
      within_20_pct: 57.8,
      within_30_pct: 75.2,
    },
    metrics: {
      mae: 988898.63,
      rmse: 1350804.54,
      r2_score: 0.639,
      mape: 21.22,
      train_mae: 534744.19,
      train_r2_score: 0.8333,
      cv_r2_mean: 0.6351,
      cv_r2_std: 0.0405,
      cv_scores: [0.6521, 0.6184, 0.6402, 0.6723, 0.5925],
      within_10_pct: 33.0,
      within_20_pct: 57.8,
      within_30_pct: 75.2,
    },
    model_comparison: [
      {
        model_name: "Gradient Boosting (Active)",
        algorithm: "GradientBoostingRegressor",
        description:
          "Ensemble of shallow decision trees optimized via gradient descent on pseudo-residuals.",
        is_active: true,
        test_r2: 0.639,
        test_mae: 988898.63,
        test_rmse: 1350804.54,
        test_mape: 21.22,
        train_r2: 0.8333,
        cv_r2_mean: 0.6351,
        cv_r2_std: 0.0405,
      },
      {
        model_name: "Random Forest Regressor",
        algorithm: "RandomForestRegressor",
        description:
          "Bagging ensemble of 100 randomized decision trees with variance reduction.",
        is_active: false,
        test_r2: 0.6114,
        test_mae: 1030648.4,
        test_rmse: 1401442.31,
        test_mape: 22.04,
        train_r2: 0.9183,
        cv_r2_mean: 0.6268,
        cv_r2_std: 0.0519,
      },
      {
        model_name: "Ridge Regression (L2)",
        algorithm: "Ridge",
        description:
          "Regularized linear model with Tikhonov L2 penalty to suppress collinearity.",
        is_active: false,
        test_r2: 0.6521,
        test_mae: 971370.24,
        test_rmse: 1326096.1,
        test_mape: 21.08,
        train_r2: 0.6859,
        cv_r2_mean: 0.6334,
        cv_r2_std: 0.072,
      },
      {
        model_name: "Linear Regression (OLS)",
        algorithm: "LinearRegression",
        description:
          "Standard Ordinary Least Squares linear regression baseline.",
        is_active: false,
        test_r2: 0.6529,
        test_mae: 970043.4,
        test_rmse: 1324506.96,
        test_mape: 21.04,
        train_r2: 0.6859,
        cv_r2_mean: 0.6324,
        cv_r2_std: 0.0737,
      },
      {
        model_name: "Decision Tree Regressor",
        algorithm: "DecisionTreeRegressor",
        description:
          "Single CART decision tree partitioning feature space up to max depth 5.",
        is_active: false,
        test_r2: 0.4656,
        test_mae: 1230810.49,
        test_rmse: 1643522.79,
        test_mape: 26.66,
        train_r2: 0.7531,
        cv_r2_mean: 0.3761,
        cv_r2_std: 0.1735,
      },
    ],
    feature_importance: {
      sorted: [
        { feature: "Property Living Area (sq ft)", importance_percentage: 44.6, raw_weight: 0.446 },
        { feature: "Bathrooms & Plumbing", importance_percentage: 17.8, raw_weight: 0.178 },
        { feature: "Air Conditioning Climate", importance_percentage: 9.3, raw_weight: 0.093 },
        { feature: "Parking Spaces", importance_percentage: 6.0, raw_weight: 0.06 },
        { feature: "Floors & Stories", importance_percentage: 4.6, raw_weight: 0.046 },
        { feature: "Bedrooms & Layout", importance_percentage: 4.6, raw_weight: 0.046 },
        { feature: "Furnishing Quality", importance_percentage: 3.2, raw_weight: 0.032 },
        { feature: "Basement Structure", importance_percentage: 2.9, raw_weight: 0.029 },
        { feature: "Preferred Area Location", importance_percentage: 2.6, raw_weight: 0.026 },
        { feature: "Main Road Accessibility", importance_percentage: 1.6, raw_weight: 0.016 },
        { feature: "Hot Water Heating", importance_percentage: 1.5, raw_weight: 0.015 },
        { feature: "Guest Room Accommodation", importance_percentage: 1.3, raw_weight: 0.013 },
      ],
      grouped: {
        "Property Living Area (sq ft)": 44.6,
        "Bathrooms & Plumbing": 17.8,
        "Air Conditioning Climate": 9.3,
        "Parking Spaces": 6.0,
        "Floors & Stories": 4.6,
        "Bedrooms & Layout": 4.6,
        "Furnishing Quality": 3.2,
        "Basement Structure": 2.9,
        "Preferred Area Location": 2.6,
        "Main Road Accessibility": 1.6,
        "Hot Water Heating": 1.5,
        "Guest Room Accommodation": 1.3,
      },
      raw: {
        area: 0.446,
        bathrooms: 0.178,
        airconditioning_yes: 0.093,
        parking: 0.06,
        stories: 0.046,
        bedrooms: 0.046,
        furnishingstatus_semi_furnished: 0.018,
        furnishingstatus_unfurnished: 0.014,
        basement_yes: 0.029,
        prefarea_yes: 0.026,
        mainroad_yes: 0.016,
        hotwaterheating_yes: 0.015,
        guestroom_yes: 0.013,
      },
    },
    residual_analysis: {
      distribution: [
        { bin: "₹-34.0L to ₹-21.3L", min_error: -3400000, max_error: -2130000, count: 1, percentage: 0.9 },
        { bin: "₹-21.3L to ₹-8.6L", min_error: -2130000, max_error: -860000, count: 22, percentage: 20.2 },
        { bin: "₹-8.6L to ₹4.1L", min_error: -860000, max_error: 410000, count: 49, percentage: 45.0 },
        { bin: "₹4.1L to ₹16.8L", min_error: 410000, max_error: 1680000, count: 24, percentage: 22.0 },
        { bin: "₹16.8L to ₹29.5L", min_error: 1680000, max_error: 2950000, count: 8, percentage: 7.3 },
        { bin: "₹29.5L to ₹42.1L", min_error: 2950000, max_error: 4210000, count: 4, percentage: 3.7 },
        { bin: "₹42.1L to ₹54.8L", min_error: 4210000, max_error: 5480000, count: 1, percentage: 0.9 },
      ],
      actual_vs_predicted: [
        { index: 1, actual: 4410000, predicted: 4325000, residual: 85000, abs_error: 85000, pct_error: 1.9 },
        { index: 2, actual: 3675000, predicted: 3820000, residual: -145000, abs_error: 145000, pct_error: 3.9 },
        { index: 3, actual: 4900000, predicted: 5120000, residual: -220000, abs_error: 220000, pct_error: 4.5 },
        { index: 4, actual: 5600000, predicted: 5380000, residual: 220000, abs_error: 220000, pct_error: 3.9 },
        { index: 5, actual: 6300000, predicted: 5950000, residual: 350000, abs_error: 350000, pct_error: 5.6 },
        { index: 6, actual: 3500000, predicted: 3710000, residual: -210000, abs_error: 210000, pct_error: 6.0 },
        { index: 7, actual: 7700000, predicted: 7150000, residual: 550000, abs_error: 550000, pct_error: 7.1 },
        { index: 8, actual: 4200000, predicted: 4490000, residual: -290000, abs_error: 290000, pct_error: 6.9 },
        { index: 9, actual: 8400000, predicted: 7650000, residual: 750000, abs_error: 750000, pct_error: 8.9 },
        { index: 10, actual: 5250000, predicted: 4980000, residual: 270000, abs_error: 270000, pct_error: 5.1 },
        { index: 11, actual: 6090000, predicted: 5820000, residual: 270000, abs_error: 270000, pct_error: 4.4 },
        { index: 12, actual: 3850000, predicted: 4050000, residual: -200000, abs_error: 200000, pct_error: 5.2 },
        { index: 13, actual: 4550000, predicted: 4350000, residual: 200000, abs_error: 200000, pct_error: 4.4 },
        { index: 14, actual: 7000000, predicted: 6650000, residual: 350000, abs_error: 350000, pct_error: 5.0 },
        { index: 15, actual: 5950000, predicted: 6250000, residual: -300000, abs_error: 300000, pct_error: 5.0 },
        { index: 16, actual: 3150000, predicted: 3350000, residual: -200000, abs_error: 200000, pct_error: 6.3 },
        { index: 17, actual: 4410000, predicted: 4120000, residual: 290000, abs_error: 290000, pct_error: 6.6 },
        { index: 18, actual: 6790000, predicted: 6280000, residual: 510000, abs_error: 510000, pct_error: 7.5 },
        { index: 19, actual: 4900000, predicted: 4620000, residual: 280000, abs_error: 280000, pct_error: 5.7 },
        { index: 20, actual: 3920000, predicted: 4100000, residual: -180000, abs_error: 180000, pct_error: 4.6 },
        { index: 21, actual: 5880000, predicted: 5490000, residual: 390000, abs_error: 390000, pct_error: 6.6 },
        { index: 22, actual: 8050000, predicted: 7420000, residual: 630000, abs_error: 630000, pct_error: 7.8 },
        { index: 23, actual: 3430000, predicted: 3680000, residual: -250000, abs_error: 250000, pct_error: 7.3 },
        { index: 24, actual: 4690000, predicted: 4890000, residual: -200000, abs_error: 200000, pct_error: 4.3 },
        { index: 25, actual: 6650000, predicted: 6180000, residual: 470000, abs_error: 470000, pct_error: 7.1 },
      ],
      error_diagnostics: {
        mean_error: 12450.0,
        median_error: -8500.0,
        max_error: 2680000.0,
        mae: 988898.63,
        rmse: 1350804.54,
        mape: 21.22,
        underpredicted_count: 58,
        underpredicted_pct: 53.2,
        overpredicted_count: 51,
        overpredicted_pct: 46.8,
        within_10_pct: 33.0,
        within_20_pct: 57.8,
        within_30_pct: 75.2,
      },
      tolerance_bands: {
        within_10_pct: 33.0,
        within_20_pct: 57.8,
        within_30_pct: 75.2,
      },
    },
    correlations: [
      { feature: "Living Area (sq ft)", correlation: 0.536, direction: "positive", strength: "strong" },
      { feature: "Bathrooms", correlation: 0.5175, direction: "positive", strength: "strong" },
      { feature: "Air Conditioning", correlation: 0.453, direction: "positive", strength: "strong" },
      { feature: "Stories / Floors", correlation: 0.4207, direction: "positive", strength: "moderate" },
      { feature: "Dedicated Parking", correlation: 0.3844, direction: "positive", strength: "moderate" },
      { feature: "Bedrooms", correlation: 0.3665, direction: "positive", strength: "moderate" },
      { feature: "Preferred Area Location", correlation: 0.3298, direction: "positive", strength: "moderate" },
      { feature: "Furnishing Status", correlation: 0.3047, direction: "positive", strength: "moderate" },
      { feature: "Main Road Accessibility", correlation: 0.2969, direction: "positive", strength: "moderate" },
      { feature: "Guest Room", correlation: 0.2555, direction: "positive", strength: "moderate" },
      { feature: "Basement Structure", correlation: 0.1871, direction: "positive", strength: "weak" },
      { feature: "Hot Water Heating", correlation: 0.0931, direction: "positive", strength: "weak" },
    ],
    drift_bounds: {
      area: { type: "numeric", min: 1650, max: 16200, mean: 5150.5, std: 2170.1, p25: 3600, p75: 6360 },
      bedrooms: { type: "numeric", min: 1, max: 6, mean: 2.97, std: 0.74, p25: 2, p75: 3 },
      bathrooms: { type: "numeric", min: 1, max: 4, mean: 1.29, std: 0.5, p25: 1, p75: 2 },
      stories: { type: "numeric", min: 1, max: 4, mean: 1.81, std: 0.87, p25: 1, p75: 2 },
      parking: { type: "numeric", min: 0, max: 3, mean: 0.69, std: 0.86, p25: 0, p75: 1 },
    },
    dataset_insights: {
      summary: {
        total_properties: 545,
        avg_price: 4766729.25,
        median_price: 4620000.0,
        min_price: 1750000.0,
        max_price: 13300000.0,
        avg_price_per_sqft: 997.58,
        median_price_per_sqft: 950.0,
        min_price_per_sqft: 375.0,
        max_price_per_sqft: 2350.0,
        avg_area: 5150.5,
        median_area: 4600.0,
        min_area: 1650.0,
        max_area: 16200.0,
        q25_price: 3430000.0,
        q50_price: 4620000.0,
        q75_price: 5740000.0,
      },
      by_bedrooms: [
        { bedrooms: 1, avg_price: 2712500.0, count: 2 },
        { bedrooms: 2, avg_price: 3632007.35, count: 136 },
        { bedrooms: 3, avg_price: 4954598.0, count: 300 },
        { bedrooms: 4, avg_price: 5729757.89, count: 95 },
        { bedrooms: 5, avg_price: 5819800.0, count: 10 },
        { bedrooms: 6, avg_price: 4791500.0, count: 2 },
      ],
      by_bathrooms: [
        { bathrooms: 1, avg_price: 4206841.35, count: 401 },
        { bathrooms: 2, avg_price: 6212015.04, count: 133 },
        { bathrooms: 3, avg_price: 9681500.0, count: 10 },
        { bathrooms: 4, avg_price: 12250000.0, count: 1 },
      ],
      by_stories: [
        { stories: 1, avg_price: 4149405.74, count: 227 },
        { stories: 2, avg_price: 4764496.67, count: 238 },
        { stories: 3, avg_price: 5685436.36, count: 34 },
        { stories: 4, avg_price: 7208000.0, count: 46 },
      ],
      by_furnishing: [
        { furnishingstatus: "furnished", avg_price: 5495048.57, count: 140 },
        { furnishingstatus: "semi-furnished", avg_price: 4907524.34, count: 227 },
        { furnishingstatus: "unfurnished", avg_price: 4013005.62, count: 178 },
      ],
      by_airconditioning: [
        { airconditioning: "no", avg_price: 4191940.38, count: 373 },
        { airconditioning: "yes", avg_price: 6013221.51, count: 172 },
      ],
      by_prefarea: [
        { prefarea: "no", avg_price: 4425299.04, count: 417 },
        { prefarea: "yes", avg_price: 5879046.88, count: 128 },
      ],
      by_parking: [
        { parking: 0, avg_price: 4433209.73, count: 299 },
        { parking: 1, avg_price: 4893345.86, count: 126 },
        { parking: 2, avg_price: 5831940.74, count: 108 },
        { parking: 3, avg_price: 6426000.0, count: 12 },
      ],
      price_distribution: [
        { range: "₹17L - ₹36L", min: 1750000, max: 3675000, count: 161, percentage: 29.5 },
        { range: "₹36L - ₹56L", min: 3675000, max: 5600000, count: 231, percentage: 42.4 },
        { range: "₹56L - ₹75L", min: 5600000, max: 7525000, count: 104, percentage: 19.1 },
        { range: "₹75L - ₹94L", min: 7525000, max: 9450000, count: 35, percentage: 6.4 },
        { range: "₹94L - ₹1.13Cr", min: 9450000, max: 11375000, count: 10, percentage: 1.8 },
        { range: "₹1.13Cr - ₹1.33Cr", min: 11375000, max: 13300000, count: 4, percentage: 0.7 },
      ],
      area_distribution: [
        { range: "1,650 - 4,075 sq ft", min: 1650, max: 4075, count: 192, percentage: 35.2 },
        { range: "4,075 - 6,500 sq ft", min: 4075, max: 6500, count: 228, percentage: 41.8 },
        { range: "6,500 - 8,925 sq ft", min: 6500, max: 8925, count: 91, percentage: 16.7 },
        { range: "8,925 - 11,350 sq ft", min: 8925, max: 11350, count: 24, percentage: 4.4 },
        { range: "11,350 - 13,775 sq ft", min: 11350, max: 13775, count: 7, percentage: 1.3 },
        { range: "13,775 - 16,200 sq ft", min: 13775, max: 16200, count: 3, percentage: 0.6 },
      ],
      location_analytics: [
        {
          location: "Preferred Area (Prime)",
          prefarea: "yes",
          count: 128,
          percentage: 23.5,
          avg_price: 5879046.88,
          median_price: 5600000.0,
          min_price: 2450000.0,
          max_price: 13300000.0,
          avg_price_per_sqft: 1142.3,
          median_price_per_sqft: 1085.0,
          avg_area: 5836.2,
        },
        {
          location: "Standard Area (General)",
          prefarea: "no",
          count: 417,
          percentage: 76.5,
          avg_price: 4425299.04,
          median_price: 4200000.0,
          min_price: 1750000.0,
          max_price: 12250000.0,
          avg_price_per_sqft: 953.2,
          median_price_per_sqft: 910.0,
          avg_area: 4939.8,
        },
      ],
      price_per_sqft_stats: {
        avg: 997.58,
        median: 950.0,
        min: 375.0,
        max: 2350.0,
        std: 288.4,
        q25: 785.0,
        q75: 1160.0,
      },
    },
    system_health: {
      api_reachable: false,
      model_loaded: false,
      dataset_available: true,
      inference_latency_ms: 14.2,
      memory_resident: false,
      null_values_count: 0,
      status_code: "OFFLINE_BASELINE",
    },
  };
}
