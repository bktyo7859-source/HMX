import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import { DEMO_PROPERTIES } from "@/data/properties";

export default function FeaturedProperties() {
  return (
    <section className="bg-[#F7F7F5] py-28 sm:py-36 px-6 sm:px-8 lg:px-12 border-b border-[#EAEAEA]">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <span
              className="text-xs uppercase tracking-[0.24em] font-medium text-[#6B6B6B]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Curated Architecture
            </span>
            <h2
              className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              Featured Properties
            </h2>
            <p className="text-base text-[#6B6B6B] font-sans font-light">
              Explore a selection of distinctive properties from around the world.
            </p>
          </div>

          <div>
            <Link
              href="/properties"
              className="group inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium text-[#111111] hover:text-[#C5A880] transition-colors py-2"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              <span>View All Properties ({DEMO_PROPERTIES.length})</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* 4 Demo Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {DEMO_PROPERTIES.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
}
