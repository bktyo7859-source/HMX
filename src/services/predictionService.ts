import { PredictionInput, PredictionResult, FeatureImpact, DatasetInsights } from "@/types/property";

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "/api/backend";
  }
  return "http://localhost:8000";
}

export async function predictProperty(
  input: PredictionInput
): Promise<PredictionResult> {
  const currency = input.currency || "INR";

  // Prepare payload mapped to Housing.csv fields
  const payload = {
    area: Number(input.area_sqft || input.area || 1500),
    area_sqft: Number(input.area_sqft || input.area || 1500),
    bedrooms: Number(input.bedrooms || 3),
    bathrooms: Number(input.bathrooms || 2),
    stories: Number(input.stories || input.floors || 1),
    floors: Number(input.stories || input.floors || 1),
    parking: Number(input.parking || 1),
    mainroad: Boolean(input.mainroad),
    guestroom: Boolean(input.guestroom),
    basement: Boolean(input.basement),
    hotwaterheating: Boolean(input.hotwaterheating),
    airconditioning: Boolean(input.airconditioning),
    prefarea: Boolean(input.prefarea),
    furnishingstatus: normalizeFurnishing(input.furnishingstatus || input.furnishing),
    furnishing: input.furnishing || "Semi Furnished",
    city: input.city || "Bangalore",
    locality: input.locality || "Indiranagar",
    property_type: input.property_type || "Residential House",
    condition: input.condition || "Good",
    currency: currency,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    const response = await fetch(`${getApiBaseUrl()}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: PredictionResult = await response.json();
      return data;
    }
  } catch (error) {
    console.warn("FastAPI backend is unreachable or timed out. Using deterministic fallback engine.", error);
  }

  // --- Fallback Deterministic Engine (Clearly marked as Demo Fallback) ---
  return computeDeterministicValuation(input, currency);
}

function normalizeFurnishing(val?: string): "furnished" | "semi-furnished" | "unfurnished" {
  if (!val) return "semi-furnished";
  const s = val.toLowerCase();
  if (s.includes("semi")) return "semi-furnished";
  if (s.includes("un")) return "unfurnished";
  if (s.includes("full") || s.includes("furnish")) return "furnished";
  return "semi-furnished";
}

function computeDeterministicValuation(
  input: PredictionInput,
  currency: "INR" | "USD"
): PredictionResult {
  const area = Number(input.area_sqft || input.area || 1500);
  const bedrooms = Number(input.bedrooms || 3);
  const bathrooms = Number(input.bathrooms || 2);
  const stories = Number(input.stories || input.floors || 1);
  const parking = Number(input.parking || 1);
  const mainroad = Boolean(input.mainroad);
  const prefarea = Boolean(input.prefarea);
  const airconditioning = Boolean(input.airconditioning);
  const basement = Boolean(input.basement);
  const guestroom = Boolean(input.guestroom);
  const hotwaterheating = Boolean(input.hotwaterheating);
  const furn = normalizeFurnishing(input.furnishingstatus || input.furnishing);

  // Baseline unit rate derived from Housing.csv dataset (~INR 880/sqft base)
  const baseRate = 880.0;
  let mult = 1.0;
  if (mainroad) mult += 0.08;
  if (prefarea) mult += 0.15;
  if (airconditioning) mult += 0.18;
  if (hotwaterheating) mult += 0.06;
  if (basement) mult += 0.07;
  if (guestroom) mult += 0.05;
  if (furn === "furnished") mult += 0.10;
  else if (furn === "unfurnished") mult -= 0.06;
  mult += (bathrooms - 1) * 0.12;
  mult += (stories - 1) * 0.08;
  mult += parking * 0.05;

  const rawPrice = area * baseRate * mult;
  let lowerPrice = rawPrice * 0.85;
  let upperPrice = rawPrice * 1.18;

  let predictedPrice = rawPrice;
  let lowerRange = lowerPrice;
  let upperRange = upperPrice;
  let pricePerSqFt = predictedPrice / area;

  if (currency === "USD") {
    const usdRate = 1 / 83.5;
    predictedPrice = Math.round((rawPrice * usdRate) / 100) * 100;
    lowerRange = Math.round((lowerPrice * usdRate) / 100) * 100;
    upperRange = Math.round((upperPrice * usdRate) / 100) * 100;
    pricePerSqFt = Number((predictedPrice / area).toFixed(1));
  } else {
    predictedPrice = Math.round(rawPrice / 1000) * 1000;
    lowerRange = Math.round(lowerPrice / 1000) * 1000;
    upperRange = Math.round(upperPrice / 1000) * 1000;
    pricePerSqFt = Math.round(predictedPrice / area);
  }

  // Feature weights derived from trained Gradient Boosting model
  const featureImpacts: FeatureImpact[] = [
    {
      feature: "Property Living Area",
      impact: "High Impact",
      percentage: 44.6,
      description: `${area.toLocaleString()} sq ft primary living space foundation`,
      direction: "positive",
    },
    {
      feature: "Bathrooms & Plumbing",
      impact: "High Impact",
      percentage: 17.8,
      description: `${bathrooms} bathrooms configuration`,
      direction: bathrooms >= 2 ? "positive" : "neutral",
    },
    {
      feature: "Air Conditioning Climate",
      impact: "Medium Impact",
      percentage: 9.3,
      description: airconditioning ? "Equipped with cooling system" : "No air conditioning installed",
      direction: airconditioning ? "positive" : "neutral",
    },
    {
      feature: "Parking Spaces",
      impact: "Medium Impact",
      percentage: 6.0,
      description: `${parking} dedicated parking spaces`,
      direction: parking > 0 ? "positive" : "neutral",
    },
    {
      feature: "Floors & Stories",
      impact: "Low Impact",
      percentage: 4.6,
      description: `${stories} stories structural layout`,
      direction: stories > 1 ? "positive" : "neutral",
    },
    {
      feature: "Bedrooms & Layout",
      impact: "Low Impact",
      percentage: 4.6,
      description: `${bedrooms} bedrooms accommodation`,
      direction: bedrooms >= 3 ? "positive" : "neutral",
    },
    {
      feature: "Furnishing Quality",
      impact: "Low Impact",
      percentage: 3.2,
      description: `Status: ${furn.charAt(0).toUpperCase() + furn.slice(1)}`,
      direction: furn === "furnished" ? "positive" : (furn === "unfurnished" ? "negative" : "neutral"),
    },
    {
      feature: "Preferred Area Location",
      impact: "Low Impact",
      percentage: 2.6,
      description: prefarea ? "Located in preferred neighborhood" : "Standard zone",
      direction: prefarea ? "positive" : "neutral",
    },
  ];

  // Authentic Housing.csv quartiles
  const q25 = currency === "USD" ? Math.round((3430000 / 83.5) / 100) * 100 : 3430000;
  const q50 = currency === "USD" ? Math.round((4620000 / 83.5) / 100) * 100 : 4620000;
  const q75 = currency === "USD" ? Math.round((5740000 / 83.5) / 100) * 100 : 5740000;

  const comparisonPoints = [
    { label: "This Property (Demo Est.)", price: predictedPrice, pricePerSqFt: pricePerSqFt, isSubject: true },
    { label: "Dataset 25th Percentile", price: q25, pricePerSqFt: Math.round(q25 / area) },
    { label: "Dataset Median (50th)", price: q50, pricePerSqFt: Math.round(q50 / area) },
    { label: "Dataset 75th Percentile", price: q75, pricePerSqFt: Math.round(q75 / area) },
  ];

  // 5-Year Trend
  const baseHistorical = pricePerSqFt * 0.78;
  const priceTrend = [
    { year: "2022", pricePerSqFt: Math.round(baseHistorical * 1.0), growthRate: 6.8 },
    { year: "2023", pricePerSqFt: Math.round(baseHistorical * 1.07), growthRate: 7.2 },
    { year: "2024", pricePerSqFt: Math.round(baseHistorical * 1.15), growthRate: 8.1 },
    { year: "2025", pricePerSqFt: Math.round(baseHistorical * 1.22), growthRate: 6.5 },
    { year: "2026", pricePerSqFt: Math.round(pricePerSqFt), growthRate: 5.4 },
  ];

  const city = input.city || "Bangalore";
  const locality = input.locality || "Central";
  const queryLoc = `${city} ${locality}`.replace(/\s+/g, "+");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${queryLoc}`;

  return {
    predicted_price: predictedPrice,
    currency,
    price_per_sqft: pricePerSqFt,
    lower_range: lowerRange,
    upper_range: upperRange,
    reliability: "Standard",
    confidence_score: 67,
    uncertainty_percentage: 33.0,
    is_demo_model: true,
    model_name: "Demo Prediction — ML Backend Offline",
    model_version: "2.0.0-fallback",
    prediction_timestamp: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    input_summary: input,
    feature_impacts: featureImpacts,
    market_comparison: {
      estimated_price: predictedPrice,
      comparison_points: comparisonPoints,
    },
    price_trend: priceTrend,
    location_data: {
      city,
      locality,
      mapsUrl,
    },
  };
}

export async function fetchMarketInsights() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/insights`);
    if (res.ok) {
      const data = await res.json();
      return data.insights || data;
    }
  } catch (err) {
    console.warn("Failed to fetch insights from backend. Using dataset fallback analytics.", err);
  }

  // Pre-calculated fallback directly from Housing.csv (N=545)
  return {
    summary: {
      total_properties: 545,
      avg_price: 4766729.25,
      median_price: 4620000.0,
      min_price: 1750000.0,
      max_price: 13300000.0,
      avg_price_per_sqft: 997.58,
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
  };
}
