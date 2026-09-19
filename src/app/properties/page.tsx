"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, MapPin, ArrowRight } from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import { DEMO_PROPERTIES } from "@/data/properties";
import { PropertyType } from "@/types/property";

export default function PropertiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [minBedrooms, setMinBedrooms] = useState<number>(0);

  const propertyTypes = ["All", "Villa", "Townhouse", "Apartment"];

  const filteredProperties = DEMO_PROPERTIES.filter((prop) => {
    const matchesSearch =
      prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === "All" || prop.propertyType === selectedType;

    const matchesBeds = minBedrooms === 0 || prop.bedrooms >= minBedrooms;

    return matchesSearch && matchesType && matchesBeds;
  });

  return (
    <div className="bg-white min-h-screen pt-32 pb-24 px-6 sm:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="space-y-4 max-w-3xl">
          <span
            className="text-xs uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
            style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
          >
            Curated Architecture & Sample Listings
          </span>
          <h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-[#111111]"
            style={{
              fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
            }}
          >
            Distinctive Properties
          </h1>
          <p className="text-base text-[#6B6B6B] font-sans font-light">
            Explore our curated architectural demo residences, complete with Google Maps
            geolocations and architectural specifications.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-6 rounded-[20px] bg-[#F7F7F5] border border-[#EAEAEA] flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#8A8A86] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, name, location..."
              className="w-full bg-white border border-[#E2E2DF] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#111111] outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-[#8A8A86] uppercase tracking-wider mr-1 hidden sm:inline">
              Type:
            </span>
            {propertyTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedType === type
                    ? "bg-[#111111] text-white"
                    : "bg-white text-[#6B6B6B] border border-[#E2E2DF] hover:text-[#111111]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Bedroom Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-[#8A8A86] uppercase tracking-wider">
              Min Beds:
            </span>
            <select
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(Number(e.target.value))}
              className="bg-white border border-[#E2E2DF] rounded-xl px-3 py-1.5 text-xs text-[#111111] outline-none cursor-pointer"
            >
              <option value={0}>Any Beds</option>
              <option value={4}>4+ Bedrooms</option>
              <option value={5}>5+ Bedrooms</option>
              <option value={6}>6+ Bedrooms</option>
            </select>
          </div>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-[#EAEAEA] rounded-[20px] space-y-4">
            <p className="font-serif text-2xl text-[#111111]">
              No properties found matching your criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("All");
                setMinBedrooms(0);
              }}
              className="luxury-button-secondary text-xs uppercase"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Prediction Studio Invitation */}
        <div className="pt-12">
          <div className="p-8 sm:p-12 rounded-[24px] bg-[#F7F7F5] border border-[#EAEAEA] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h3
                className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
                style={{
                  fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
                }}
              >
                Have a unique property in mind?
              </h3>
              <p className="text-sm text-[#6B6B6B] font-light">
                Calculate custom valuations for any residential or luxury estate
                in seconds using the HMX valuation studio.
              </p>
            </div>
            <Link
              href="/predict"
              className="luxury-button-primary text-xs uppercase tracking-wider whitespace-nowrap px-6 py-3.5 group"
            >
              <span>Predict Custom Property</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
