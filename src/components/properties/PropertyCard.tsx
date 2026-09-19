"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, ExternalLink } from "lucide-react";
import { Property } from "@/types/property";

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <div className="group relative bg-white border border-[#EAEAEA] rounded-[20px] overflow-hidden shadow-[0_4px_20px_-2px_rgba(17,17,17,0.03)] hover:shadow-[0_16px_36px_-4px_rgba(17,17,17,0.08)] transition-all duration-400 ease-out hover:-translate-y-1.5 flex flex-col justify-between">
      <div>
        {/* Image Container with Hover Scale */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F7F7F5]">
          <Image
            src={property.image}
            alt={property.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority={false}
          />

          {/* Sample Property Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span
              className="inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium bg-white/90 backdrop-blur-md text-[#111111] shadow-sm border border-white/40"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Sample Property
            </span>
          </div>

          {/* Price Tag Overlay */}
          <div className="absolute bottom-4 right-4 z-10">
            <span
              className="font-serif text-lg sm:text-xl font-medium px-3.5 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-[#111111] shadow-sm border border-white/60"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {property.price}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
              <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
              <span className="font-sans">{property.location}</span>
            </div>

            <h3
              className="font-serif text-2xl font-normal text-[#111111] leading-snug group-hover:text-[#C5A880] transition-colors"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {property.name}
            </h3>
          </div>

          {/* Specs / Attributes */}
          <div className="pt-2 pb-1 border-t border-b border-[#F2F2F0] flex items-center justify-between text-xs sm:text-sm text-[#6B6B6B] font-sans font-light">
            <span>{property.bedrooms} Beds</span>
            <span className="text-[#D4D4D0]">•</span>
            <span>{property.bathrooms} Baths</span>
            <span className="text-[#D4D4D0]">•</span>
            <span>{property.area.toLocaleString()} sq ft</span>
          </div>
        </div>
      </div>

      {/* Action Links */}
      <div className="px-6 sm:px-7 pb-6 pt-2 flex items-center justify-between border-t border-[#F7F7F5]">
        {/* Google Maps link */}
        <a
          href={property.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-sans font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors py-1 group/map"
          title={`View ${property.location} on Google Maps`}
        >
          <span>View on Maps ↗</span>
        </a>

        {/* View Property link */}
        <Link
          href={`/property/${property.id}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[#111111] group-hover:text-[#C5A880] transition-colors py-1"
        >
          <span>View Property</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
