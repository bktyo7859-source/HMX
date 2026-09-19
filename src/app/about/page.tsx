import React from "react";
import Link from "next/link";
import {
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  BarChart4,
  ArrowRight,
  Database,
  Binary,
  Sliders,
  AlertTriangle,
  FileText,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AboutPage() {
  const verifiedMetrics = {
    r2_score: 0.6390,
    mae: 988898.63,
    rmse: 1350804.54,
    train_r2: 0.8333,
    train_mae: 534744.19,
    dataset_rows: 545,
    train_rows: 436,
    test_rows: 109,
    features_count: 12,
  };

  const sections = [
    {
      num: "01",
      title: "Dataset & Source",
      icon: Database,
      description:
        "The model is trained strictly on the Kaggle Housing Prices Dataset (Housing.csv), consisting of 545 verified residential transaction records across 12 distinct spatial and structural features with zero synthetic augmentation.",
    },
    {
      num: "02",
      title: "Feature Preprocessing Pipeline",
      icon: Sliders,
      description:
        "Numerical inputs (area, bedrooms, bathrooms, stories, parking) are standardized using StandardScaler. Categorical features (main road, preferred area, air conditioning, basement, guest room, hot water, furnishing status) are encoded via OneHotEncoder with drop-first discipline.",
    },
    {
      num: "03",
      title: "Gradient Boosting Architecture",
      icon: Cpu,
      description:
        "The primary valuation engine uses GradientBoostingRegressor (120 estimators, learning rate 0.05, max depth 3, subsample 0.85) trained on 80% of data (436 samples) and evaluated on a held-out 20% test partition (109 samples).",
    },
    {
      num: "04",
      title: "80% Model-Based Prediction Interval",
      icon: Binary,
      description:
        "In addition to the point target, two specialized Quantile Gradient Boosting regressors (alpha=0.10 and alpha=0.90) estimate the lower 10th and upper 90th percentile bounds, forming an 80% model-based prediction interval.",
    },
    {
      num: "05",
      title: "Dynamic Feature Explainability",
      icon: BarChart4,
      description:
        "Every prediction is interpreted using relative model feature importances extracted directly from the trained decision trees (feature_importances_), illustrating which attributes the model weighed most heavily.",
    },
    {
      num: "06",
      title: "Model Limitations & Boundaries",
      icon: AlertTriangle,
      description:
        "Housing.csv contains no geographic coordinates, city identifiers, or zip codes. Consequently, the model operates purely on physical structural attributes and should not be treated as a localized certified appraisal.",
    },
  ];

  return (
    <div className="bg-white min-h-screen pt-32 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-20">
        {/* Page Header */}
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-2">
            <span
              className="text-xs uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Engineering & Valuation Science
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[#F7F7F5] border border-[#EAEAEA] text-[#8A8A86]">
              Housing.csv N=545
            </span>
          </div>

          <h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            Technology behind the estimate.
          </h1>
          <p className="text-base sm:text-lg text-[#6B6B6B] font-sans font-light leading-relaxed">
            HMX replaces opaque property appraisals with a transparent,
            reproducible machine learning architecture built on Python, Scikit-learn,
            and FastAPI.
          </p>
        </div>

        {/* Verified Evaluation Metrics Card */}
        <div className="bg-[#F7F7F5] border border-[#EAEAEA] rounded-[24px] p-8 sm:p-12 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E7E7E5] pb-4">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86] block">
                Held-Out Test Set Evaluation
              </span>
              <h3
                className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                Verified Model Metrics
              </h3>
            </div>
            <span className="text-xs font-mono text-[#8A8A86]">
              Evaluated on 109 Test Samples (random_state=42)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-white border border-[#EAEAEA] rounded-2xl space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#8A8A86] block">
                Test R² Score
              </span>
              <span className="font-serif text-3xl sm:text-4xl font-normal text-[#111111] block">
                {verifiedMetrics.r2_score.toFixed(4)}
              </span>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                <strong className="text-[#111111]">Note:</strong> R² represents the coefficient of determination (variance explained), <span className="underline">not</span> prediction accuracy.
              </p>
            </div>

            <div className="p-6 bg-white border border-[#EAEAEA] rounded-2xl space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#8A8A86] block">
                Test MAE
              </span>
              <span className="font-serif text-3xl sm:text-4xl font-normal text-[#111111] block">
                {formatCurrency(verifiedMetrics.mae, "INR")}
              </span>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                Mean Absolute Error: Average absolute divergence between predicted and actual price.
              </p>
            </div>

            <div className="p-6 bg-white border border-[#EAEAEA] rounded-2xl space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#8A8A86] block">
                Test RMSE
              </span>
              <span className="font-serif text-3xl sm:text-4xl font-normal text-[#111111] block">
                {formatCurrency(verifiedMetrics.rmse, "INR")}
              </span>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                Root Mean Squared Error: Quadratic scoring penalizing larger valuation errors.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Core Technology Sections */}
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
              System Architecture
            </span>
            <h2 className="font-serif text-3xl font-normal text-[#111111]">
              How the Machine Learning Engine Operates
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.num}
                  className="p-8 rounded-[20px] bg-white border border-[#EAEAEA] hover:border-[#D4D4D0] transition-all space-y-4 shadow-[0_2px_16px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#C5A880]">
                      {sec.num}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-[#F7F7F5] border border-[#EAEAEA] flex items-center justify-center text-[#111111]">
                      <Icon className="w-4 h-4 text-[#111111]" />
                    </div>
                  </div>
                  <h3
                    className="font-serif text-2xl font-normal text-[#111111]"
                    style={{
                      fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                    }}
                  >
                    {sec.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] font-sans font-light leading-relaxed">
                    {sec.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification & Transparency Commitment */}
        <div className="p-8 sm:p-12 rounded-[24px] bg-[#F7F7F5] border border-[#EAEAEA] space-y-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C5A880]" />
            <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#111111]">
              Transparency Commitment
            </span>
          </div>

          <h3
            className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            Honest Benchmarks and Verified Data
          </h3>

          <p className="text-sm text-[#6B6B6B] font-sans font-light leading-relaxed max-w-3xl">
            HMX is engineered to clearly distinguish genuine model inferences
            from sample architectural demonstrations. All models report regression metrics
            calculated directly from held-out test splits.
          </p>

          <div className="pt-2">
            <Link
              href="/predict"
              className="luxury-button-primary text-xs uppercase tracking-widest px-8 py-4 group"
            >
              <span>Test the Valuation Engine</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
