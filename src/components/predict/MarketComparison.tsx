"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCompactPrice } from "@/lib/utils";
import { MarketComparisonPoint } from "@/types/property";

interface MarketComparisonProps {
  comparisonPoints: MarketComparisonPoint[];
  currency: "INR" | "USD";
  isDemo?: boolean;
}

export default function MarketComparison({
  comparisonPoints,
  currency,
  isDemo = false,
}: MarketComparisonProps) {
  const chartData = comparisonPoints.map((point) => ({
    name: point.label,
    price: point.price,
    pricePerSqFt: point.pricePerSqFt,
    isSubject: point.isSubject,
  }));

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[20px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Housing Dataset Benchmark
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F7F7F5] border border-[#EAEAEA] text-[#8A8A86]">
              Housing.csv N=545
            </span>
          </div>
          <h4
            className="font-serif text-xl sm:text-2xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            Dataset Benchmark Comparison
          </h4>
        </div>
      </div>

      {/* Recharts Minimalist White Bar Chart */}
      <div className="w-full h-64 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          >
            <XAxis
              dataKey="name"
              axisLine={{ stroke: "#EAEAEA" }}
              tickLine={false}
              tick={{ fill: "#6B6B6B", fontSize: 10, fontFamily: "DM Sans" }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8A8A86", fontSize: 10, fontFamily: "DM Sans" }}
              tickFormatter={(val) => formatCompactPrice(val, currency)}
            />
            <Tooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.02)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg space-y-1">
                      <p className="text-xs font-medium text-[#111111]">
                        {data.name}
                      </p>
                      <p className="text-sm font-serif font-bold text-[#111111]">
                        {formatCompactPrice(data.price, currency)}
                      </p>
                      <p className="text-[11px] text-[#6B6B6B] font-mono">
                        {currency === "INR" ? `₹${data.pricePerSqFt}/sqft` : `$${data.pricePerSqFt}/sqft`}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="price" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isSubject ? "#111111" : "#D0D0CC"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-[#8A8A86] font-light leading-relaxed border-t border-[#F2F2F0] pt-4">
        Comparison tiers reflect empirical quartiles (25th, 50th median, 75th percentile) calculated across the 545 verified records in the Housing.csv dataset.
      </p>
    </div>
  );
}
