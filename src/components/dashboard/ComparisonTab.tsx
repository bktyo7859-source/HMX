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
  Legend,
} from "recharts";
import { ModelBenchmark } from "@/types/property";
import { formatCompactPrice, formatCurrency, convertCurrency } from "@/lib/utils";
import { CheckCircle2, Shield, Info } from "lucide-react";

interface ComparisonTabProps {
  benchmarks: ModelBenchmark[];
  currency: "INR" | "USD";
}

export default function ComparisonTab({ benchmarks, currency }: ComparisonTabProps) {
  // Chart data for R2 comparison
  const r2ChartData = benchmarks.map((b) => ({
    name: b.model_name.replace(" (Active)", ""),
    r2: b.test_r2,
    cv: b.cv_r2_mean,
    isActive: b.is_active,
  }));

  // Chart data for MAE comparison (converted if USD)
  const maeChartData = benchmarks.map((b) => {
    const rawMae = currency === "USD" ? convertCurrency(b.test_mae, "USD") : b.test_mae;
    return {
      name: b.model_name.replace(" (Active)", ""),
      mae: rawMae,
      mape: b.test_mape,
      isActive: b.is_active,
    };
  });

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="space-y-1 border-b border-[#EAEAEA] pb-4">
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
            Empirical Benchmark Matrix
          </span>
          <h2
            className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
            style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
          >
            Comparative Model Evaluation (Housing.csv)
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6B6B] font-light leading-relaxed">
            All models are trained and cross-validated on the identical 80/20 train-test partition using 5-Fold Cross Validation.
            No synthetic data or interpolated numbers are used.
          </p>
        </div>

        {/* Model Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-[#8A8A86] border-b border-[#EAEAEA]">
                <th className="pb-3 font-medium">Model / Architecture</th>
                <th className="pb-3 font-medium">Test R² Score</th>
                <th className="pb-3 font-medium">Test MAE</th>
                <th className="pb-3 font-medium">Test RMSE</th>
                <th className="pb-3 font-medium">Test MAPE</th>
                <th className="pb-3 font-medium">5-Fold CV (Mean ± Std)</th>
                <th className="pb-3 font-medium text-right">Deployment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F0]">
              {benchmarks.map((m) => {
                const maeDisplay = currency === "USD" ? convertCurrency(m.test_mae, "USD") : m.test_mae;
                const rmseDisplay = currency === "USD" ? convertCurrency(m.test_rmse, "USD") : m.test_rmse;

                return (
                  <tr
                    key={m.model_name}
                    className={`transition-colors ${
                      m.is_active ? "bg-emerald-50/50 font-medium" : "hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <td className="py-3.5 pr-3 text-[#111111]">
                      <div className="flex items-center gap-2">
                        {m.is_active && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                        <span className={m.is_active ? "font-bold text-[#111111]" : ""}>
                          {m.model_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8A8A86] block">{m.algorithm}</span>
                    </td>
                    <td className="py-3.5 text-[#111111] font-bold">
                      {m.test_r2 !== undefined ? m.test_r2.toFixed(4) : "—"}
                    </td>
                    <td className="py-3.5 text-[#111111]">
                      {formatCompactPrice(maeDisplay, currency)}
                    </td>
                    <td className="py-3.5 text-[#6B6B6B]">
                      {formatCompactPrice(rmseDisplay, currency)}
                    </td>
                    <td className="py-3.5 text-[#111111]">
                      {m.test_mape !== undefined ? `${m.test_mape.toFixed(2)}%` : "—"}
                    </td>
                    <td className="py-3.5 text-[#6B6B6B]">
                      {m.cv_r2_mean !== undefined ? `${m.cv_r2_mean.toFixed(4)} (±${m.cv_r2_std.toFixed(3)})` : "—"}
                    </td>
                    <td className="py-3.5 text-right">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Active Engine
                        </span>
                      ) : (
                        <span className="text-[#8A8A86] text-[11px]">Benchmark Candidate</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Benchmark Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: R2 Score Comparison */}
        <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
              Accuracy Metric
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#111111]">
              Test Partition R² Comparison
            </h3>
          </div>

          <div className="w-full h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r2ChartData} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#111111", fontSize: 10, fontFamily: "DM Sans" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 0.8]}
                  tick={{ fill: "#8A8A86", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#111111]">{d.name}</p>
                          <p className="text-emerald-700 font-mono font-bold">
                            Test R²: {(d.r2 * 100).toFixed(2)}% ({d.r2.toFixed(4)})
                          </p>
                          <p className="text-[#6B6B6B] font-mono">
                            5-Fold CV: {(d.cv * 100).toFixed(2)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="r2" radius={[6, 6, 0, 0]}>
                  {r2ChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isActive ? "#059669" : "#374151"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Test MAE Comparison */}
        <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
              Error Magnitude (Lower is Better)
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#111111]">
              Mean Absolute Error ({currency})
            </h3>
          </div>

          <div className="w-full h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maeChartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#111111", fontSize: 10, fontFamily: "DM Sans" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8A8A86", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactPrice(val, currency)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#EAEAEA] p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#111111]">{d.name}</p>
                          <p className="text-[#111111] font-mono font-bold">
                            MAE: {formatCurrency(d.mae, currency)}
                          </p>
                          <p className="text-[#6B6B6B] font-mono">
                            MAPE: {d.mape.toFixed(2)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="mae" radius={[6, 6, 0, 0]}>
                  {maeChartData.map((entry, index) => (
                    <Cell
                      key={`cell-mae-${index}`}
                      fill={entry.isActive ? "#111111" : "#9CA3AF"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rationale Callout */}
      <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl flex items-start gap-4">
        <Info className="w-5 h-5 text-neutral-600 mt-0.5 shrink-0" />
        <div className="space-y-1 text-xs text-[#6B6B6B] font-light leading-relaxed">
          <p className="font-medium text-[#111111]">
            Why Gradient Boosting is Deployed in Production:
          </p>
          <p>
            While regularized linear models (Ridge/OLS) achieve comparable R² on this dataset size, Gradient Boosting Regressor
            captures non-linear amenity premiums (e.g. air conditioning and furnishing synergy with floor area) and directly supports
            quantile regression loss functions to compute rigorous 80% model-based prediction intervals.
          </p>
        </div>
      </div>
    </div>
  );
}
