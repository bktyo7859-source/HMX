"use client";

import React, { useState } from "react";
import {
  Home,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Layers,
  Wind,
  Flame,
  Compass,
  Car,
  Bed,
  Bath,
  Building,
  Info,
} from "lucide-react";
import { PredictionInput, FurnishingType } from "@/types/property";

interface PredictionFormProps {
  onSubmit: (data: PredictionInput) => void;
  isSubmitting?: boolean;
}

export default function PredictionForm({
  onSubmit,
  isSubmitting = false,
}: PredictionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState<PredictionInput>({
    area: 2400,
    area_sqft: 2400,
    bedrooms: 3,
    bathrooms: 2,
    stories: 2,
    floors: 2,
    parking: 2,
    mainroad: true,
    guestroom: false,
    basement: true,
    hotwaterheating: false,
    airconditioning: true,
    prefarea: true,
    furnishingstatus: "semi-furnished",
    furnishing: "Semi Furnished",
    currency: "INR",
    city: "Bangalore",
    locality: "Indiranagar",
    property_type: "Residential House",
    condition: "Good",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!formData.area_sqft || formData.area_sqft <= 0) {
        errs.area_sqft = "Please enter a valid area greater than 0 sq ft";
      } else if (formData.area_sqft < 250) {
        errs.area_sqft = "Area must be at least 250 sq ft";
      }
      if (formData.bedrooms < 1) {
        errs.bedrooms = "Must have at least 1 bedroom";
      }
      if (formData.bathrooms < 1) {
        errs.bathrooms = "Must have at least 1 bathroom";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep((prev) => prev + 1);
      } else {
        onSubmit(formData);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const stepTitles = [
    { num: "01", name: "Property Basics" },
    { num: "02", name: "Property Characteristics" },
    { num: "03", name: "Features & Finish" },
    { num: "04", name: "Review & Estimate" },
  ];

  return (
    <div className="bg-white border border-[#EAEAEA] rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden max-w-4xl mx-auto">
      {/* Wizard Progress Header */}
      <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-[#F2F2F0] bg-[#FAFAFA]">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <span
              className="text-[11px] uppercase tracking-[0.24em] font-medium text-[#8A8A86]"
              style={{ fontFamily: "var(--font-dmsans), DM Sans, sans-serif" }}
            >
              Step {currentStep} of {totalSteps}
            </span>
            <h3
              className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {stepTitles[currentStep - 1].name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency Selector */}
            <div className="flex items-center p-1 bg-white border border-[#EAEAEA] rounded-full text-xs font-sans">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: "INR" })}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  formData.currency === "INR"
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, currency: "USD" })}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  formData.currency === "USD"
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                $ USD
              </button>
            </div>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {stepTitles.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div key={step.num} className="space-y-2">
                <div className="h-1.5 w-full rounded-full bg-[#EAEAEA] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted || isCurrent ? "bg-[#111111]" : "bg-transparent"
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] font-sans truncate hidden sm:block ${
                    isCurrent
                      ? "text-[#111111] font-semibold"
                      : isCompleted
                      ? "text-[#6B6B6B]"
                      : "text-[#A3A3A0]"
                  }`}
                >
                  {step.num} {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content Body */}
      <div className="p-6 sm:p-10 space-y-8 min-h-[420px]">
        {/* ================= STEP 01: Dimensions & Layout ================= */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Living Area (sq ft) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider font-medium text-[#111111] flex items-center gap-1.5">
                  Area (sq ft)
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-mono text-[#8A8A86]">
                  {Number(formData.area_sqft || 0).toLocaleString()} sq ft
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="250"
                  max="50000"
                  step="50"
                  value={formData.area_sqft || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      area_sqft: Number(e.target.value),
                      area: Number(e.target.value),
                    })
                  }
                  placeholder="e.g. 2400"
                  className={`w-full px-4 py-3.5 rounded-xl border bg-white text-[#111111] text-base font-sans transition-all focus:outline-none focus:ring-2 focus:ring-[#111111] ${
                    errors.area_sqft ? "border-rose-400 bg-rose-50/20" : "border-[#E5E5E0]"
                  }`}
                />
              </div>
              {errors.area_sqft && (
                <p className="text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.area_sqft}
                </p>
              )}

              {/* Quick Area Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[1200, 1800, 2400, 3600, 5000, 7500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        area_sqft: preset,
                        area: preset,
                      })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
                      formData.area_sqft === preset
                        ? "bg-[#111111] text-white border-[#111111]"
                        : "bg-[#F7F7F5] border-[#EAEAEA] text-[#6B6B6B] hover:border-[#111111]"
                    }`}
                  >
                    {preset.toLocaleString()} sq ft
                  </button>
                ))}
              </div>
            </div>

            {/* Bedrooms & Bathrooms Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Bedrooms */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wider font-medium text-[#111111] flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-[#8A8A86]" />
                  Bedrooms
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, bedrooms: num })}
                      className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.bedrooms === num
                          ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                          : "bg-white border-[#E5E5E0] text-[#6B6B6B] hover:border-[#111111]"
                      }`}
                    >
                      {num === 6 ? "6+" : num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wider font-medium text-[#111111] flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-[#8A8A86]" />
                  Bathrooms
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, bathrooms: num })}
                      className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.bathrooms === num
                          ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                          : "bg-white border-[#E5E5E0] text-[#6B6B6B] hover:border-[#111111]"
                      }`}
                    >
                      {num === 4 ? "4+" : num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stories / Floors & Parking Spaces */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Number of Floors (Stories) */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wider font-medium text-[#111111] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#8A8A86]" />
                  Number of Floors (Stories)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          stories: num,
                          floors: num,
                        })
                      }
                      className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.stories === num
                          ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                          : "bg-white border-[#E5E5E0] text-[#6B6B6B] hover:border-[#111111]"
                      }`}
                    >
                      {num === 1 ? "1 (Single)" : num === 4 ? "4 Stories" : `${num} Stories`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parking Spaces */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wider font-medium text-[#111111] flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-[#8A8A86]" />
                  Parking Spaces
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, parking: num })}
                      className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.parking === num
                          ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                          : "bg-white border-[#E5E5E0] text-[#6B6B6B] hover:border-[#111111]"
                      }`}
                    >
                      {num === 0 ? "None" : num === 3 ? "3+ Spots" : `${num} Spots`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 02: Access & Structural Features ================= */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Accessibility & Structural Assets
              </span>
              <h4 className="font-serif text-xl sm:text-2xl text-[#111111]">
                Property Infrastructure Attributes
              </h4>
              <p className="text-xs text-[#6B6B6B]">
                These features correspond to key structural drivers verified in the housing valuation dataset.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Main Road Access */}
              <label
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                  formData.mainroad
                    ? "bg-[#FAFAFA] border-[#111111] shadow-sm"
                    : "bg-white border-[#E5E5E0] hover:border-[#CCCCCC]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#111111]">
                      Main Road Access
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-medium">
                      High Impact
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    Direct access and frontage to primary municipal roads.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.mainroad}
                  onChange={(e) =>
                    setFormData({ ...formData, mainroad: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#111111] rounded cursor-pointer mt-0.5"
                />
              </label>

              {/* Preferred Area */}
              <label
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                  formData.prefarea
                    ? "bg-[#FAFAFA] border-[#111111] shadow-sm"
                    : "bg-white border-[#E5E5E0] hover:border-[#CCCCCC]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#111111]">
                      Preferred Area
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-medium">
                      High Impact
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    Situated in prime, high-demand residential sectors.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.prefarea}
                  onChange={(e) =>
                    setFormData({ ...formData, prefarea: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#111111] rounded cursor-pointer mt-0.5"
                />
              </label>

              {/* Basement Structure */}
              <label
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                  formData.basement
                    ? "bg-[#FAFAFA] border-[#111111] shadow-sm"
                    : "bg-white border-[#E5E5E0] hover:border-[#CCCCCC]"
                }`}
              >
                <div className="space-y-1">
                  <span className="text-sm font-medium text-[#111111] block">
                    Basement Structure
                  </span>
                  <p className="text-xs text-[#6B6B6B]">
                    Includes fully or partially built basement level.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.basement}
                  onChange={(e) =>
                    setFormData({ ...formData, basement: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#111111] rounded cursor-pointer mt-0.5"
                />
              </label>

              {/* Dedicated Guest Room */}
              <label
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                  formData.guestroom
                    ? "bg-[#FAFAFA] border-[#111111] shadow-sm"
                    : "bg-white border-[#E5E5E0] hover:border-[#CCCCCC]"
                }`}
              >
                <div className="space-y-1">
                  <span className="text-sm font-medium text-[#111111] block">
                    Guest Room
                  </span>
                  <p className="text-xs text-[#6B6B6B]">
                    Dedicated independent guest suite with separate layout.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.guestroom}
                  onChange={(e) =>
                    setFormData({ ...formData, guestroom: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#111111] rounded cursor-pointer mt-0.5"
                />
              </label>
            </div>
          </div>
        )}

        {/* ================= STEP 03: Climate & Interior Finish ================= */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Climate Controls & Interior Quality
              </span>
              <h4 className="font-serif text-xl sm:text-2xl text-[#111111]">
                HVAC Systems & Furnishing Level
              </h4>
            </div>

            {/* Furnishing Status */}
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-wider font-medium text-[#111111] block">
                Furnishing Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    status: "furnished",
                    label: "Fully Furnished",
                    desc: "Complete interior carpentry, lighting, and designer furnishings",
                  },
                  {
                    status: "semi-furnished",
                    label: "Semi Furnished",
                    desc: "Fitted modular kitchen, wardrobes, and essential fixtures",
                  },
                  {
                    status: "unfurnished",
                    label: "Unfurnished",
                    desc: "Bare shell structure ready for bespoke interior design",
                  },
                ].map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        furnishingstatus: item.status as any,
                        furnishing: item.label,
                      })
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.furnishingstatus === item.status
                        ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                        : "bg-white border-[#E5E5E0] text-[#6B6B6B] hover:border-[#111111]"
                    }`}
                  >
                    <span
                      className={`block font-medium text-sm ${
                        formData.furnishingstatus === item.status
                          ? "text-white"
                          : "text-[#111111]"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`block text-xs mt-1 leading-relaxed ${
                        formData.furnishingstatus === item.status
                          ? "text-[#CCCCCC]"
                          : "text-[#8A8A86]"
                      }`}
                    >
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Climate & Utility Amenities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Air Conditioning */}
              <label
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                  formData.airconditioning
                    ? "bg-[#FAFAFA] border-[#111111] shadow-sm"
                    : "bg-white border-[#E5E5E0] hover:border-[#CCCCCC]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-[#8A8A86]" />
                    <span className="text-sm font-medium text-[#111111]">
                      Air Conditioning System
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    Central or ductable multi-split air conditioning installed.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.airconditioning}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      airconditioning: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-[#111111] rounded cursor-pointer mt-0.5"
                />
              </label>

              {/* Hot Water Heating */}
              <label
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                  formData.hotwaterheating
                    ? "bg-[#FAFAFA] border-[#111111] shadow-sm"
                    : "bg-white border-[#E5E5E0] hover:border-[#CCCCCC]"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#8A8A86]" />
                    <span className="text-sm font-medium text-[#111111]">
                      Hot Water Heating
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    Dedicated boiler, solar heating, or geyser infrastructure.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hotwaterheating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hotwaterheating: e.target.checked,
                    })
                  }
                  className="w-5 h-5 accent-[#111111] rounded cursor-pointer mt-0.5"
                />
              </label>
            </div>
          </div>
        )}

        {/* ================= STEP 04: Review & Valuation Execution ================= */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
                Specification Review
              </span>
              <h4 className="font-serif text-xl sm:text-2xl text-[#111111]">
                Ready for AI Valuation Execution
              </h4>
            </div>

            {/* Input Summary Grid */}
            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                  Primary Features Verified
                </span>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Housing.csv Model Schema
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[#8A8A86] block">Living Area</span>
                  <span className="font-medium text-[#111111]">
                    {Number(formData.area_sqft).toLocaleString()} sq ft
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A86] block">Layout</span>
                  <span className="font-medium text-[#111111]">
                    {formData.bedrooms} Beds • {formData.bathrooms} Baths
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A86] block">Floors / Stories</span>
                  <span className="font-medium text-[#111111]">
                    {formData.stories} {formData.stories === 1 ? "Story" : "Stories"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A86] block">Parking</span>
                  <span className="font-medium text-[#111111]">
                    {formData.parking} Dedicated Spots
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A86] block">Main Road Access</span>
                  <span className="font-medium text-[#111111]">
                    {formData.mainroad ? "Yes (Frontage)" : "No"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A86] block">Preferred Area</span>
                  <span className="font-medium text-[#111111]">
                    {formData.prefarea ? "Yes (Prime Sector)" : "Standard"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A86] block">Air Conditioning</span>
                  <span className="font-medium text-[#111111]">
                    {formData.airconditioning ? "Installed" : "None"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A8A86] block">Furnishing</span>
                  <span className="font-medium text-[#111111] capitalize">
                    {formData.furnishingstatus}
                  </span>
                </div>
              </div>
            </div>

            {/* HMX V2 Luxury Roadmap Notice */}
            <div className="p-6 rounded-2xl border border-[#EAEAEA] bg-[#F7F7F5] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C5A880]" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
                    HMX V2 — COMING SOON
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E5E5E0] text-[#8A8A86]">
                  Roadmap
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "City-aware valuation",
                  "Locality intelligence",
                  "Pincode-level signals",
                  "Property type",
                  "Balcony",
                  "Garden",
                  "Pool",
                  "Lift",
                  "Security",
                  "Gym",
                  "Regional market trends",
                ].map((feat, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-[#E5E5E0] text-[#6B6B6B]"
                  >
                    {feat}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[#8A8A86] pt-1 font-light italic">
                * These features are not currently used by the active Housing.csv model.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div className="px-6 sm:px-10 py-6 border-t border-[#F2F2F0] bg-[#FAFAFA] flex items-center justify-between">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E5E5E0] text-xs font-medium uppercase tracking-wider text-[#6B6B6B] hover:text-[#111111] hover:border-[#111111] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="luxury-button inline-flex items-center gap-2 px-8 py-3.5 text-xs font-medium uppercase tracking-widest group"
        >
          {isSubmitting ? (
            <span>Evaluating Property...</span>
          ) : currentStep === totalSteps ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Estimate Property Valuation</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
