import React from "react";
import HeroVideo from "@/components/hero/HeroVideo";
import IntroSection from "@/components/home/IntroSection";
import FeaturedProperties from "@/components/home/FeaturedProperties";
import HowItWorks from "@/components/home/HowItWorks";
import TrustStats from "@/components/home/TrustStats";
import PredictionCTA from "@/components/home/PredictionCTA";

export default function HomePage() {
  return (
    <div className="w-full bg-white">
      {/* 
        1. Full Screen Cinematic Video Hero 
        Untouched Venice FPV with Centered HMX & Scroll Indicator
      */}
      <HeroVideo />

      {/* 
        2. Editorial Intro Section
      */}
      <IntroSection />

      {/* 
        3. Featured Demo Properties (4 Curated Architectural Estates)
      */}
      <FeaturedProperties />

      {/* 
        4. How HMX Works (4-Stage Progressive Workflow)
      */}
      <HowItWorks />

      {/* 
        5. Trust & Model Benchmark Statistics
      */}
      <TrustStats />

      {/* 
        6. Valuation Studio Call to Action
      */}
      <PredictionCTA />
    </div>
  );
}
