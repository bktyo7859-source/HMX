"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function HeroVideo() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const scrollToContent = () => {
    const introElement = document.getElementById("intro-section");
    if (introElement) {
      introElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative w-full h-screen overflow-hidden bg-[#111111]">
      {/* 
        IMPORTANT: The cinematic video is displayed completely UNTOUCHED as provided.
        No filters, darkening, dimming, tints, gradients, or overlays applied.
      */}
      <video
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/properties/venetian-townhouse.jpg"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Centered HMX Brand Mark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1
          className={`font-serif text-white text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-medium tracking-[0.18em] transition-opacity duration-1000 ease-out select-none ${
            isLoaded ? "opacity-95" : "opacity-0"
          }`}
          style={{
            fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            letterSpacing: "0.18em",
          }}
        >
          HMX
        </h1>
      </div>

      {/* Scroll to Explore Indicator */}
      <div className="absolute bottom-8 sm:bottom-12 inset-x-0 flex flex-col items-center justify-center pointer-events-auto">
        <button
          onClick={scrollToContent}
          className="group flex flex-col items-center gap-2.5 text-white/80 hover:text-white transition-all duration-300 focus:outline-none cursor-pointer"
          aria-label="Scroll to explore HMX valuation platform"
        >
          <span
            className="text-[10px] sm:text-xs font-sans tracking-[0.28em] uppercase font-light text-white/80 group-hover:text-white transition-all duration-300 flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            SCROLL TO EXPLORE ↓
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-white/70 animate-bounce duration-1000 group-hover:text-white group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </section>
  );
}
