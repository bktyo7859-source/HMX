"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  ExternalLink,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { DEMO_PROPERTIES } from "@/data/properties";
import PropertyCard from "@/components/properties/PropertyCard";

export default function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const property = DEMO_PROPERTIES.find((p) => p.id === params.id);

  if (!property) {
    notFound();
  }

  const similarProperties = DEMO_PROPERTIES.filter(
    (p) => p.id !== property.id
  ).slice(0, 3);

  return (
    <div className="bg-white min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-6">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Properties</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium bg-[#F7F7F5] border border-[#EAEAEA] text-[#6B6B6B]">
              Sample Property
            </span>
          </div>
        </div>

        {/* Hero Property Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Large Image Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative w-full aspect-[4/3] rounded-[24px] overflow-hidden border border-[#EAEAEA] bg-[#F7F7F5] shadow-[0_4px_24px_-2px_rgba(17,17,17,0.04)]">
              <Image
                src={property.image}
                alt={property.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>

            {/* Quick Specs Strip */}
            <div className="grid grid-cols-3 gap-4 p-5 rounded-2xl bg-[#F7F7F5] border border-[#EAEAEA] text-center">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A86] block">
                  Living Space
                </span>
                <span className="font-serif text-lg text-[#111111]">
                  {property.area.toLocaleString()} sq ft
                </span>
              </div>
              <div className="space-y-1 border-x border-[#E5E5E2]">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A86] block">
                  Bedrooms
                </span>
                <span className="font-serif text-lg text-[#111111]">
                  {property.bedrooms} Beds
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A86] block">
                  Bathrooms
                </span>
                <span className="font-serif text-lg text-[#111111]">
                  {property.bathrooms} Baths
                </span>
              </div>
            </div>
          </div>

          {/* Details & Valuation Sidebar */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
                <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                <span className="font-sans">{property.stateCountry}</span>
              </div>

              <h1
                className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#111111] leading-tight"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {property.name}
              </h1>

              <div className="pt-2 flex items-baseline gap-3">
                <span
                  className="font-serif text-3xl sm:text-4xl font-medium text-[#111111]"
                  style={{
                    fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  {property.price}
                </span>
                <span className="text-xs text-[#6B6B6B] font-mono">
                  (~{property.currency === "INR" ? "₹" : property.currency === "EUR" ? "€" : "$"}{property.pricePerSqFt}/sqft)
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-[#F2F2F0] pt-6">
              <h3 className="text-xs uppercase tracking-wider font-medium text-[#111111]">
                Architectural Statement
              </h3>
              <p className="text-sm text-[#6B6B6B] font-sans font-light leading-relaxed">
                {property.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <a
                href={property.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="luxury-button-secondary w-full text-xs uppercase tracking-wider py-4 group"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#6B6B6B] group-hover:text-[#111111] transition-colors" />
              </a>

              <Link
                href={`/predict`}
                className="luxury-button-primary w-full text-xs uppercase tracking-wider py-4 group"
              >
                <span>Estimate Similar Property</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Key Features & Geolocation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-[#EAEAEA]">
          {/* Key Architectural Features */}
          <div className="bg-[#F7F7F5] border border-[#EAEAEA] rounded-[20px] p-8 space-y-6">
            <h3
              className="font-serif text-2xl font-normal text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Key Features & Finishes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {property.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-[#111111]">
                  <CheckCircle2 className="w-4 h-4 text-[#C5A880] flex-shrink-0 mt-0.5" />
                  <span className="font-sans leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Location & Micro-Market Card */}
          <div className="bg-[#F7F7F5] border border-[#EAEAEA] rounded-[20px] p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span
                className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]"
                style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
              >
                Location Intelligence
              </span>
              <h3
                className="font-serif text-2xl font-normal text-[#111111]"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                {property.city} Micro-Market
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] font-light leading-relaxed">
                Geographic coordinates: {property.latitude.toFixed(4)}° N, {Math.abs(property.longitude).toFixed(4)}° W.
                This area features strong capital appreciation driven by proximity to cultural centers and premier architectural zoning.
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E5E2] flex items-center justify-between">
              <span className="text-xs font-mono text-[#8A8A86]">
                Google Maps Verified Area
              </span>
              <a
                href={property.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#111111] hover:text-[#C5A880] inline-flex items-center gap-1 transition-colors"
              >
                <span>Open in Maps ↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Similar Demo Properties */}
        <div className="pt-16 border-t border-[#EAEAEA] space-y-8">
          <div className="space-y-2">
            <span
              className="text-xs uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Explore Further
            </span>
            <h2
              className="font-serif text-3xl font-normal text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Similar Demo Residences
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {similarProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
