"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PriceTrendPoint } from "@/types/property";

interface PriceTrendProps {
  trendData: PriceTrendPoint[];
  currency: "INR" | "USD";
  city: string;
}

export default function PriceTrend({ trendData, currency, city }: PriceTrendProps) {
  if (!trendData || trendData.length === 0) return null;

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[20px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <span
            className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            Historical Trajectory
          </span>
          <h4
            className="font-serif text-xl sm:text-2xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            5-Year Local Price Trend ({city})
          </h4>
        </div>

        <div className="text-xs text-[#6B6B6B] font-sans">
          Compound Growth: <span className="font-semibold text-emerald-600">+7.1% YoY</span>
        </div>
      </div>

      <div className="w-full h-56 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid stroke="#F2F2F0" vertical={false} />
            <XAxis
              dataKey="year"
              axisLine={{ stroke: "#EAEAEA" }}
              tickLine={false}
              tick={{ fill: "#6B6B6B", fontSize: 11, fontFamily: "DM Sans" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8A8A86", fontSize: 10, fontFamily: "DM Sans" }}
              tickFormatter={(val) =>
                currency === "INR" ? `₹${(val / 1000).toFixed(1)}k` : `$${val}`
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as PriceTrendPoint;
                  return (
                    <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg space-y-1">
                      <p className="text-xs text-[#8A8A86] font-medium">
                        Year {data.year}
                      </p>
                      <p className="text-sm font-serif font-bold text-[#111111]">
                        {currency === "INR" ? `₹${data.pricePerSqFt.toLocaleString()}` : `$${data.pricePerSqFt.toLocaleString()}`} / sq ft
                      </p>
                      {data.growthRate && (
                        <p className="text-[11px] text-emerald-600 font-sans">
                          +{data.growthRate}% annual appreciation
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="pricePerSqFt"
              stroke="#111111"
              strokeWidth={2}
              dot={{ r: 4, fill: "#111111", stroke: "#FFFFFF", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#C5A880", stroke: "#FFFFFF", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-[#8A8A86] font-light leading-relaxed border-t border-[#F2F2F0] pt-3">
        Historical trends are modeled from municipality index datasets and reflect residential average price per square foot appreciation in {city}.
      </p>
    </div>
  );
}
