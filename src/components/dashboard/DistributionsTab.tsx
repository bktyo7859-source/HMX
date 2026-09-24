"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { DatasetInsights, MLAnalyticsKPIs } from "@/types/property";
import { formatCompactPrice, formatCurrency, convertCurrency } from "@/lib/utils";
import {
  BarChart3,
  MapPin,
  Maximize2,
  TrendingUp,
  Layers,
  Home,
  Bath,
  Bed,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface DistributionsTabProps {
  insights: DatasetInsights;
  kpis: MLAnalyticsKPIs;
  currency: "INR" | "USD";
}

export default function DistributionsTab({
  insights,
  kpis,
  currency,
}: DistributionsTabProps) {
  const [activeDist, setActiveDist] = useState<"price" | "area" | "bedrooms" | "bathrooms">("price");

  const summary = insights?.summary || kpis;
  const sqftStats = insights?.price_per_sqft_stats || {
    avg: 997.58,
    median: 950.0,
    min: 375.0,
    max: 2350.0,
    std: 288.4,
    q25: 785.0,
    q75: 1160.0,
  };

  const avgSqftPrice = currency === "USD" ? convertCurrency(sqftStats.avg, "USD") : sqftStats.avg;
  const medianSqftPrice = currency === "USD" ? convertCurrency(sqftStats.median, "USD") : sqftStats.median;
  const minSqftPrice = currency === "USD" ? convertCurrency(sqftStats.min, "USD") : sqftStats.min;
  const maxSqftPrice = currency === "USD" ? convertCurrency(sqftStats.max, "USD") : sqftStats.max;

  // Converted Price distribution
  const priceDistData = (insights?.price_distribution || []).map((b) => {
    const minConv = currency === "USD" ? convertCurrency(b.min, "USD") : b.min;
    const maxConv = currency === "USD" ? convertCurrency(b.max, "USD") : b.max;
    const rangeLabel =
      currency === "USD"
        ? `$${(minConv / 1000).toFixed(0)}K - $${(maxConv / 1000).toFixed(0)}K`
        : b.range;
    return {
      ...b,
      range: rangeLabel,
    };
  });

  // Bedroom data
  const bedroomData = (insights?.by_bedrooms || []).map((b) => {
    const avgPrice = currency === "USD" ? convertCurrency(b.avg_price, "USD") : b.avg_price;
    return {
      name: `${b.bedrooms} Beds`,
      bedrooms: b.bedrooms,
      count: b.count,
      avg_price: avgPrice,
      avg_price_label: formatCompactPrice(avgPrice, currency),
    };
  });

  // Bathroom data
  const bathroomData = (insights?.by_bathrooms || []).map((b) => {
    const avgPrice = currency === "USD" ? convertCurrency(b.avg_price, "USD") : b.avg_price;
    return {
      name: `${b.bathrooms} Bath${b.bathrooms > 1 ? "s" : ""}`,
      bathrooms: b.bathrooms,
      count: b.count,
      avg_price: avgPrice,
      avg_price_label: formatCompactPrice(avgPrice, currency),
    };
  });

  // Area distribution data
  const areaDistData = insights?.area_distribution || [
    { range: "1,650 - 4,075 sq ft", min: 1650, max: 4075, count: 192, percentage: 35.2 },
    { range: "4,075 - 6,500 sq ft", min: 4075, max: 6500, count: 228, percentage: 41.8 },
    { range: "6,500 - 8,925 sq ft", min: 6500, max: 8925, count: 91, percentage: 16.7 },
    { range: "8,925 - 11,350 sq ft", min: 8925, max: 11350, count: 24, percentage: 4.4 },
    { range: "11,350 - 13,775 sq ft", min: 11350, max: 13775, count: 7, percentage: 1.3 },
    { range: "13,775 - 16,200 sq ft", min: 13775, max: 16200, count: 3, percentage: 0.6 },
  ];

  // Location analytics data
  const locationAnalytics = insights?.location_analytics || [
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
  ];

  return (
    <div className="space-y-8">
      {/* 1. Section K: Price Per Square Foot Intelligence */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="space-y-1 border-b border-[#EAEAEA] pb-4">
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
            Section K • Unit Valuation Metrics
          </span>
          <h2
            className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
            style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
          >
            Price Per Square Foot Analytics (Housing.csv)
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6B6B] font-light">
            Empirical unit rates derived from Price ÷ Living Area across all 545 verified properties.
          </p>
        </div>

        {/* 4 Unit Rate Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Average Rate</span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              {currency === "USD" ? `$${avgSqftPrice.toFixed(2)}` : `₹${Math.round(avgSqftPrice).toLocaleString()}`}
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">per sq ft mean</span>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Median Rate</span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              {currency === "USD" ? `$${medianSqftPrice.toFixed(2)}` : `₹${Math.round(medianSqftPrice).toLocaleString()}`}
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">50th percentile</span>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Minimum Rate</span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              {currency === "USD" ? `$${minSqftPrice.toFixed(2)}` : `₹${Math.round(minSqftPrice).toLocaleString()}`}
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">Lowest recorded unit</span>
          </div>

          <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#8A8A86] block">Maximum Rate</span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              {currency === "USD" ? `$${maxSqftPrice.toFixed(2)}` : `₹${Math.round(maxSqftPrice).toLocaleString()}`}
            </span>
            <span className="text-[10px] text-[#6B6B6B] font-mono">Peak luxury rate</span>
          </div>
        </div>
      </div>

      {/* 2. Section I: Location Analytics (Preferred Area vs Standard Area) */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="space-y-1 border-b border-[#EAEAEA] pb-4">
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
            Section I • Location & Zone Breakdown
          </span>
          <h3
            className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
            style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
          >
            Location Premium Analytics (Preferred Area vs. General Zone)
          </h3>
          <p className="text-xs sm:text-sm text-[#6B6B6B] font-light">
            Analysis of location-based valuation differences based on the &quot;prefarea&quot; attribute in Housing.csv.
          </p>
        </div>

        {/* Location Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-[#8A8A86] border-b border-[#EAEAEA]">
                <th className="pb-3 font-medium">Zone / Locality</th>
                <th className="pb-3 font-medium">Property Count</th>
                <th className="pb-3 font-medium">Average Price</th>
                <th className="pb-3 font-medium">Median Price</th>
                <th className="pb-3 font-medium">Price / Sq Ft</th>
                <th className="pb-3 font-medium text-right">Location Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F0]">
              {locationAnalytics.map((loc) => {
                const avgP = currency === "USD" ? convertCurrency(loc.avg_price, "USD") : loc.avg_price;
                const medP = currency === "USD" ? convertCurrency(loc.median_price, "USD") : loc.median_price;
                const sqftP = currency === "USD" ? convertCurrency(loc.avg_price_per_sqft, "USD") : loc.avg_price_per_sqft;
                const isPref = loc.prefarea === "yes";

                return (
                  <tr key={loc.location} className={isPref ? "bg-emerald-50/50 font-medium" : "hover:bg-[#FAFAFA]"}>
                    <td className="py-3.5 pr-3 text-[#111111]">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${isPref ? "text-emerald-700" : "text-[#8A8A86]"}`} />
                        <span className="font-bold">{loc.location}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-[#111111]">
                      {loc.count} homes ({loc.percentage}%)
                    </td>
                    <td className="py-3.5 text-[#111111] font-bold">
                      {formatCompactPrice(avgP, currency)}
                    </td>
                    <td className="py-3.5 text-[#6B6B6B]">
                      {formatCompactPrice(medP, currency)}
                    </td>
                    <td className="py-3.5 text-[#111111]">
                      {currency === "USD" ? `$${sqftP.toFixed(1)}` : `₹${Math.round(sqftP)}`}/sqft
                    </td>
                    <td className="py-3.5 text-right font-bold text-emerald-800">
                      {isPref ? "+32.8% Premium" : "Baseline"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Section H: Multi-Dimensional Distributions (Price, Area, Beds, Baths) */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
              Section H • Feature Distributions
            </span>
            <h3
              className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
              style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
            >
              Housing Dataset Empirical Distributions
            </h3>
          </div>

          {/* Distribution Selector */}
          <div className="inline-flex p-0.5 bg-[#F7F7F5] border border-[#EAEAEA] rounded-xl text-xs font-mono shrink-0">
            <button
              onClick={() => setActiveDist("price")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeDist === "price"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Price
            </button>
            <button
              onClick={() => setActiveDist("area")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeDist === "area"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setActiveDist("bedrooms")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeDist === "bedrooms"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Bedrooms
            </button>
            <button
              onClick={() => setActiveDist("bathrooms")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeDist === "bathrooms"
                  ? "bg-white text-[#111111] font-bold shadow-sm"
                  : "text-[#6B6B6B] hover:text-[#111111]"
              }`}
            >
              Bathrooms
            </button>
          </div>
        </div>

        {/* Dynamic Chart Display */}
        <div className="w-full h-80 pt-2">
          {activeDist === "price" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDistData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#111111", fontSize: 9, fontFamily: "DM Sans" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#8A8A86", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} homes`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#111111]">Price Tier: {d.range}</p>
                          <p className="text-emerald-700 font-mono font-bold">{d.count} Properties ({d.percentage}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#111111" radius={[6, 6, 0, 0]}>
                  {priceDistData.map((_, index) => (
                    <Cell key={`price-cell-${index}`} fill={index === 1 ? "#059669" : "#1F2937"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeDist === "area" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaDistData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#111111", fontSize: 9, fontFamily: "DM Sans" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#8A8A86", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} homes`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#111111]">Living Area Range: {d.range}</p>
                          <p className="text-emerald-700 font-mono font-bold">{d.count} Properties ({d.percentage}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#111111" radius={[6, 6, 0, 0]}>
                  {areaDistData.map((_, index) => (
                    <Cell key={`area-cell-${index}`} fill={index === 1 ? "#059669" : "#374151"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeDist === "bedrooms" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bedroomData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: "#111111", fontSize: 10, fontFamily: "DM Sans" }} axisLine={{ stroke: "#EAEAEA" }} tickLine={false} />
                <YAxis tick={{ fill: "#8A8A86", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} homes`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#111111]">{d.name}</p>
                          <p className="text-[#111111] font-mono">Count: {d.count} homes</p>
                          <p className="text-emerald-700 font-mono font-bold">Avg Price: {formatCurrency(d.avg_price, currency)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#111111" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeDist === "bathrooms" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bathroomData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: "#111111", fontSize: 10, fontFamily: "DM Sans" }} axisLine={{ stroke: "#EAEAEA" }} tickLine={false} />
                <YAxis tick={{ fill: "#8A8A86", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} homes`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#111111]">{d.name}</p>
                          <p className="text-[#111111] font-mono">Count: {d.count} homes</p>
                          <p className="text-emerald-700 font-mono font-bold">Avg Price: {formatCurrency(d.avg_price, currency)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#111111" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
