"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowRight, Database } from "lucide-react";
import { fetchMarketInsights } from "@/services/predictionService";
import { formatCompactPrice, formatCurrency } from "@/lib/utils";

export default function InsightsPage() {
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    fetchMarketInsights().then(setInsights);
  }, []);

  // Summary Metrics from Housing.csv (N=545)
  const summary = insights?.summary || {
    total_properties: 545,
    avg_price: 4766729.25,
    median_price: 4340000.0,
    min_price: 1750000.0,
    max_price: 13300000.0,
    avg_price_per_sqft: 993.33,
    q25_price: 3430000.0,
    q50_price: 4340000.0,
    q75_price: 5740000.0,
  };

  // 1. Price Distribution Bins
  const priceDistribution = insights?.price_distribution || [
    { range: "₹17L - ₹36L", min: 1750000, max: 3675000, count: 161, percentage: 29.5 },
    { range: "₹36L - ₹56L", min: 3675000, max: 5600000, count: 231, percentage: 42.4 },
    { range: "₹56L - ₹75L", min: 5600000, max: 7525000, count: 104, percentage: 19.1 },
    { range: "₹75L - ₹94L", min: 7525000, max: 9450000, count: 35, percentage: 6.4 },
    { range: "₹94L - ₹1.13Cr", min: 9450000, max: 11375000, count: 10, percentage: 1.8 },
    { range: "₹1.13Cr - ₹1.33Cr", min: 11375000, max: 13300000, count: 4, percentage: 0.7 },
  ];

  // 2. Price by Bedrooms
  const byBedrooms = (insights?.by_bedrooms || [
    { bedrooms: 1, avg_price: 2712500.0, count: 2 },
    { bedrooms: 2, avg_price: 3632007.35, count: 136 },
    { bedrooms: 3, avg_price: 4954598.0, count: 300 },
    { bedrooms: 4, avg_price: 5729757.89, count: 95 },
    { bedrooms: 5, avg_price: 5819800.0, count: 10 },
    { bedrooms: 6, avg_price: 4791500.0, count: 2 },
  ]).map((item: any) => ({
    name: `${item.bedrooms} Bed${item.bedrooms > 1 ? "s" : ""}`,
    avg_price: item.avg_price,
    count: item.count,
  }));

  // 3. Price by Stories
  const byStories = (insights?.by_stories || [
    { stories: 1, avg_price: 4149405.74, count: 227 },
    { stories: 2, avg_price: 4764496.67, count: 238 },
    { stories: 3, avg_price: 5685436.36, count: 34 },
    { stories: 4, avg_price: 7208000.0, count: 46 },
  ]).map((item: any) => ({
    name: `${item.stories} ${item.stories === 1 ? "Story" : "Stories"}`,
    avg_price: item.avg_price,
    count: item.count,
  }));

  // 4. Price by Bathrooms
  const byBathrooms = (insights?.by_bathrooms || [
    { bathrooms: 1, avg_price: 4206841.35, count: 401 },
    { bathrooms: 2, avg_price: 6212015.04, count: 133 },
    { bathrooms: 3, avg_price: 9681500.0, count: 10 },
    { bathrooms: 4, avg_price: 12250000.0, count: 1 },
  ]).map((item: any) => ({
    name: `${item.bathrooms} Bath${item.bathrooms > 1 ? "s" : ""}`,
    avg_price: item.avg_price,
    count: item.count,
  }));

  // 5. Price by Parking
  const byParking = (insights?.by_parking || [
    { parking: 0, avg_price: 4433209.73, count: 299 },
    { parking: 1, avg_price: 4893345.86, count: 126 },
    { parking: 2, avg_price: 5831940.74, count: 108 },
    { parking: 3, avg_price: 6426000.0, count: 12 },
  ]).map((item: any) => ({
    name: `${item.parking} ${item.parking === 1 ? "Spot" : "Spots"}`,
    avg_price: item.avg_price,
    count: item.count,
  }));

  return (
    <div className="bg-white min-h-screen pt-32 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-2">
            <span
              className="text-xs uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Housing.csv Empirical Analytics
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1">
              <Database className="w-3 h-3" />
              Verified N=545 Dataset
            </span>
          </div>

          <h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            Market Intelligence
          </h1>
          <p className="text-base text-[#6B6B6B] font-sans font-light">
            Empirical property distributions, valuation benchmarks, and structural premium drivers calculated directly from the authentic housing price training dataset.
          </p>
        </div>

        {/* Dataset Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A86] block">
              Average Property Price
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              {formatCompactPrice(summary.avg_price, "INR")}
            </span>
            <span className="text-[11px] text-[#6B6B6B] font-mono">Mean across 545 homes</span>
          </div>

          <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A86] block">
              Median Price (50th %ile)
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              {formatCompactPrice(summary.median_price, "INR")}
            </span>
            <span className="text-[11px] text-[#6B6B6B] font-mono">Robust midpoint metric</span>
          </div>

          <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A86] block">
              Average Rate / Sq Ft
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              ₹{Math.round(summary.avg_price_per_sqft).toLocaleString()}
            </span>
            <span className="text-[11px] text-[#6B6B6B] font-mono">Per sq ft baseline</span>
          </div>

          <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A86] block">
              Interquartile Range
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#111111] block">
              ₹34.3L – ₹57.4L
            </span>
            <span className="text-[11px] text-[#6B6B6B] font-mono">25th to 75th percentile</span>
          </div>
        </div>

        {/* 1. Price Distribution Histogram */}
        <div className="bg-[#F7F7F5] border border-[#EAEAEA] rounded-[24px] p-8 sm:p-12 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Valuation Density
              </span>
              <h2
                className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                Overall Housing Price Distribution
              </h2>
            </div>
            <span className="text-xs text-[#6B6B6B] font-sans">
              Histogram of 545 Verified Transactions
            </span>
          </div>

          <div className="w-full h-80 pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priceDistribution}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <XAxis
                  dataKey="range"
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                  tick={{ fill: "#111111", fontSize: 11, fontFamily: "DM Sans" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8A8A86", fontSize: 10, fontFamily: "DM Sans" }}
                  tickFormatter={(val) => `${val} homes`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg space-y-1">
                          <p className="text-xs font-medium text-[#111111]">
                            Price Range: {data.range}
                          </p>
                          <p className="text-sm font-serif font-bold text-[#111111]">
                            {data.count} Properties ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#111111" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2 & 3. Bedrooms & Stories Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Average Price by Bedrooms */}
          <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-8 sm:p-10 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Layout Scaling
              </span>
              <h3 className="font-serif text-2xl font-normal text-[#111111]">
                Average Price by Bedrooms
              </h3>
            </div>

            <div className="w-full h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBedrooms} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={{ stroke: "#EAEAEA" }} tickLine={false} tick={{ fill: "#111111", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8A8A86", fontSize: 10 }} tickFormatter={(val) => formatCompactPrice(val, "INR")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg space-y-1">
                            <p className="text-xs font-medium text-[#111111]">{d.name}</p>
                            <p className="text-sm font-serif font-bold text-[#111111]">Avg: {formatCurrency(d.avg_price, "INR")}</p>
                            <p className="text-[11px] text-[#6B6B6B]">Sample size: {d.count} homes</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avg_price" fill="#111111" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average Price by Stories */}
          <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-8 sm:p-10 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Vertical Structure
              </span>
              <h3 className="font-serif text-2xl font-normal text-[#111111]">
                Average Price by Stories
              </h3>
            </div>

            <div className="w-full h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStories} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={{ stroke: "#EAEAEA" }} tickLine={false} tick={{ fill: "#111111", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8A8A86", fontSize: 10 }} tickFormatter={(val) => formatCompactPrice(val, "INR")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg space-y-1">
                            <p className="text-xs font-medium text-[#111111]">{d.name}</p>
                            <p className="text-sm font-serif font-bold text-[#111111]">Avg: {formatCurrency(d.avg_price, "INR")}</p>
                            <p className="text-[11px] text-[#6B6B6B]">Sample size: {d.count} homes</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avg_price" fill="#4A4A48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 4 & 5. Bathrooms & Parking Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Average Price by Bathrooms */}
          <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-8 sm:p-10 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Plumbing & Scale
              </span>
              <h3 className="font-serif text-2xl font-normal text-[#111111]">
                Average Price by Bathrooms
              </h3>
            </div>

            <div className="w-full h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBathrooms} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={{ stroke: "#EAEAEA" }} tickLine={false} tick={{ fill: "#111111", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8A8A86", fontSize: 10 }} tickFormatter={(val) => formatCompactPrice(val, "INR")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg space-y-1">
                            <p className="text-xs font-medium text-[#111111]">{d.name}</p>
                            <p className="text-sm font-serif font-bold text-[#111111]">Avg: {formatCurrency(d.avg_price, "INR")}</p>
                            <p className="text-[11px] text-[#6B6B6B]">Sample size: {d.count} homes</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avg_price" fill="#111111" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average Price by Parking */}
          <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-8 sm:p-10 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Vehicle Capacity
              </span>
              <h3 className="font-serif text-2xl font-normal text-[#111111]">
                Average Price by Parking Spaces
              </h3>
            </div>

            <div className="w-full h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byParking} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={{ stroke: "#EAEAEA" }} tickLine={false} tick={{ fill: "#111111", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8A8A86", fontSize: 10 }} tickFormatter={(val) => formatCompactPrice(val, "INR")} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg space-y-1">
                            <p className="text-xs font-medium text-[#111111]">{d.name}</p>
                            <p className="text-sm font-serif font-bold text-[#111111]">Avg: {formatCurrency(d.avg_price, "INR")}</p>
                            <p className="text-[11px] text-[#6B6B6B]">Sample size: {d.count} homes</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avg_price" fill="#4A4A48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 6, 7 & 8. Air Conditioning, Preferred Area, and Furnishing Status */}
        <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[24px] p-8 sm:p-12 space-y-8">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
              Empirical Value Multipliers
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]">
              Amenity & Location Premiums in Housing.csv
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Direct comparison of average property values based on key binary & categorical features in the dataset.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 6. Air Conditioning Price Comparison */}
            <div className="p-6 bg-white border border-[#EAEAEA] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                  Air Conditioning
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  +43.4% Difference
                </span>
              </div>
              <p className="text-xs font-medium text-[#111111]">
                Air Conditioning — Observed Price Difference +43.4%
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>With AC (172 homes):</span>
                  <span className="font-medium text-[#111111]">₹60.13 Lakhs</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Without AC (373 homes):</span>
                  <span className="font-medium text-[#111111]">₹41.92 Lakhs</span>
                </div>
              </div>
            </div>

            {/* 7. Preferred Area Price Comparison */}
            <div className="p-6 bg-white border border-[#EAEAEA] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                  Preferred Area
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  +32.8% Difference
                </span>
              </div>
              <p className="text-xs font-medium text-[#111111]">
                Preferred Area — Observed Price Difference +32.8%
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Preferred Zone (128 homes):</span>
                  <span className="font-medium text-[#111111]">₹58.79 Lakhs</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Standard Zone (417 homes):</span>
                  <span className="font-medium text-[#111111]">₹44.25 Lakhs</span>
                </div>
              </div>
            </div>

            {/* 8. Average Price by Furnishing Status */}
            <div className="p-6 bg-white border border-[#EAEAEA] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                  Furnishing Status
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  36.9% Spread
                </span>
              </div>
              <p className="text-xs font-medium text-[#111111]">
                Furnishing Status — Observed Price Spread 36.9%
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Fully Furnished (140):</span>
                  <span className="font-medium text-[#111111]">₹54.95 Lakhs</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Semi-Furnished (227):</span>
                  <span className="font-medium text-[#111111]">₹49.08 Lakhs</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Unfurnished (178):</span>
                  <span className="font-medium text-[#111111]">₹40.13 Lakhs</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#8A8A86] font-light leading-relaxed border-t border-[#EAEAEA] pt-4">
            Observed differences are descriptive statistics from Housing.csv and should not be interpreted as causal effects.
          </p>
        </div>

        {/* CTA Section */}
        <div className="p-10 sm:p-16 bg-[#111111] text-white rounded-[32px] text-center space-y-6">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2
              className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Estimate Your Property
            </h2>
            <p className="text-sm sm:text-base text-[#8A8A86] font-light">
              Run our Gradient Boosting valuation model trained on Housing.csv with quantile prediction intervals.
            </p>
          </div>

          <Link
            href="/predict"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#111111] text-xs font-medium uppercase tracking-widest rounded-full hover:bg-[#F5EFE6] transition-colors"
          >
            <span>Launch Valuation Engine</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
