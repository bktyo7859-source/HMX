import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#F7F7F5] border-t border-[#EAEAEA] text-[#111111]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 pb-16 border-b border-[#E7E7E5]">
          {/* Brand & Mission */}
          <div className="md:col-span-5 space-y-6">
            <Link href="/" className="inline-block">
              <span
                className="font-serif text-3xl font-medium tracking-[0.18em] uppercase text-[#111111]"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                  letterSpacing: "0.18em",
                }}
              >
                HMX
              </span>
            </Link>
            <p className="text-sm sm:text-base text-[#6B6B6B] font-sans font-light leading-relaxed max-w-md">
              AI-powered property valuation built around transparent machine learning and authentic real estate data.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs uppercase tracking-widest text-[#6B6B6B] font-mono">
                Gradient Boosting Model • Housing.csv
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-4">
            <h4
              className="text-xs uppercase font-medium tracking-[0.2em] text-[#111111]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm text-[#6B6B6B]">
              <li>
                <Link
                  href="/"
                  className="hover:text-[#111111] transition-colors inline-flex items-center gap-1"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/properties"
                  className="hover:text-[#111111] transition-colors inline-flex items-center gap-1"
                >
                  Properties
                </Link>
              </li>
              <li>
                <Link
                  href="/predict"
                  className="hover:text-[#111111] transition-colors inline-flex items-center gap-1 text-[#111111] font-medium"
                >
                  Predict
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#C5A880]" />
                </Link>
              </li>
              <li>
                <Link
                  href="/insights"
                  className="hover:text-[#111111] transition-colors inline-flex items-center gap-1"
                >
                  Insights
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-[#111111] transition-colors inline-flex items-center gap-1"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/ml-dashboard"
                  className="hover:text-[#111111] transition-colors inline-flex items-center gap-1 text-[#111111] font-medium"
                >
                  ML Analytics
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & AI */}
          <div className="md:col-span-4 space-y-4">
            <h4
              className="text-xs uppercase font-medium tracking-[0.2em] text-[#111111]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Machine Learning Engine
            </h4>
            <p className="text-xs sm:text-sm text-[#6B6B6B] font-light leading-relaxed">
              Trained on authentic multi-dimensional housing records using Gradient Boosting regression. All estimates provide 80% model-based prediction intervals and transparent feature importances.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/predict"
                className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#111111] border-b border-[#111111] pb-1 hover:text-[#C5A880] hover:border-[#C5A880] transition-all"
              >
                Valuation Studio →
              </Link>
              <Link
                href="/ml-dashboard"
                className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-800 border-b border-emerald-800 pb-1 hover:text-emerald-600 transition-all"
              >
                ML Dashboard →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar & Disclaimer */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8A8A86]">
          <p>
            © {new Date().getFullYear()} HMX Valuation Technologies. All rights reserved.
          </p>
          <p className="text-center md:text-right max-w-xl text-[11px] leading-relaxed">
            Estimates are model outputs and should not be treated as professional appraisal or guaranteed market prices. Featured listings represent architectural showcase properties.
          </p>
        </div>
      </div>
    </footer>
  );
}
