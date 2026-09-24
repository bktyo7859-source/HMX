"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Database,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { HousingDatasetRecord } from "@/types/property";
import { HOUSING_DATASET_RECORDS } from "@/data/housingDataset";
import { formatCompactPrice, formatCurrency, convertCurrency, downloadCsvFile } from "@/lib/utils";

interface DatasetExplorerTabProps {
  currency: "INR" | "USD";
  initialRecords?: HousingDatasetRecord[];
}

export default function DatasetExplorerTab({
  currency,
  initialRecords,
}: DatasetExplorerTabProps) {
  const records = initialRecords && initialRecords.length > 0 ? initialRecords : HOUSING_DATASET_RECORDS;

  const [search, setSearch] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState<string>("all");
  const [filterBathrooms, setFilterBathrooms] = useState<string>("all");
  const [filterFurnishing, setFilterFurnishing] = useState<string>("all");
  const [filterPrefArea, setFilterPrefArea] = useState<string>("all");
  const [filterAc, setFilterAc] = useState<string>("all");

  const [sortField, setSortField] = useState<keyof HousingDatasetRecord>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filter & Search
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const priceStr = String(r.price);
        const areaStr = String(r.area);
        const furnStr = r.furnishingstatus.toLowerCase();
        if (
          !priceStr.includes(query) &&
          !areaStr.includes(query) &&
          !furnStr.includes(query)
        ) {
          return false;
        }
      }

      // Bedroom filter
      if (filterBedrooms !== "all") {
        if (r.bedrooms !== Number(filterBedrooms)) return false;
      }

      // Bathroom filter
      if (filterBathrooms !== "all") {
        if (r.bathrooms !== Number(filterBathrooms)) return false;
      }

      // Furnishing filter
      if (filterFurnishing !== "all") {
        if (r.furnishingstatus !== filterFurnishing) return false;
      }

      // Preferred Area filter
      if (filterPrefArea !== "all") {
        if (r.prefarea !== filterPrefArea) return false;
      }

      // AC filter
      if (filterAc !== "all") {
        if (r.airconditioning !== filterAc) return false;
      }

      return true;
    });
  }, [records, search, filterBedrooms, filterBathrooms, filterFurnishing, filterPrefArea, filterAc]);

  // Sort
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortField, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);

  const handleSort = (field: keyof HousingDatasetRecord) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleExportFiltered = () => {
    const headers = [
      "Price (INR)",
      "Area (sqft)",
      "Bedrooms",
      "Bathrooms",
      "Stories",
      "Mainroad",
      "Guestroom",
      "Basement",
      "Hotwaterheating",
      "Airconditioning",
      "Parking",
      "Prefarea",
      "Furnishing",
      "Price Per SqFt (INR)",
    ];
    const rows = sortedRecords.map((r) => [
      r.price,
      r.area,
      r.bedrooms,
      r.bathrooms,
      r.stories,
      r.mainroad,
      r.guestroom,
      r.basement,
      r.hotwaterheating,
      r.airconditioning,
      r.parking,
      r.prefarea,
      r.furnishingstatus,
      r.price_per_sqft || Math.round(r.price / r.area),
    ]);
    downloadCsvFile(headers, rows, `hmx_housing_dataset_${Date.now()}.csv`);
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-[24px] p-6 sm:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#8A8A86]">
              Section M • Ground Truth Repository
            </span>
            <h2
              className="font-serif text-2xl sm:text-3xl font-normal text-[#111111]"
              style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
            >
              Housing Dataset Explorer & Record Browser
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6B6B] font-light">
              Search, filter, and inspect all {records.length} authentic records from Kaggle Housing.csv used to train the production model.
            </p>
          </div>

          <button
            onClick={handleExportFiltered}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] text-white rounded-xl text-xs font-mono font-medium hover:bg-neutral-800 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered CSV ({sortedRecords.length})</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Bar */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-[#8A8A86] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by price, area, furnishing..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            />
          </div>

          {/* Bedroom Filter */}
          <div>
            <select
              value={filterBedrooms}
              onChange={(e) => {
                setFilterBedrooms(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            >
              <option value="all">Bedrooms: All</option>
              <option value="1">1 Bedroom</option>
              <option value="2">2 Bedrooms</option>
              <option value="3">3 Bedrooms</option>
              <option value="4">4 Bedrooms</option>
              <option value="5">5 Bedrooms</option>
              <option value="6">6 Bedrooms</option>
            </select>
          </div>

          {/* Bathroom Filter */}
          <div>
            <select
              value={filterBathrooms}
              onChange={(e) => {
                setFilterBathrooms(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            >
              <option value="all">Bathrooms: All</option>
              <option value="1">1 Bathroom</option>
              <option value="2">2 Bathrooms</option>
              <option value="3">3 Bathrooms</option>
              <option value="4">4 Bathrooms</option>
            </select>
          </div>

          {/* Furnishing Filter */}
          <div>
            <select
              value={filterFurnishing}
              onChange={(e) => {
                setFilterFurnishing(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            >
              <option value="all">Furnishing: All</option>
              <option value="furnished">Furnished</option>
              <option value="semi-furnished">Semi-Furnished</option>
              <option value="unfurnished">Unfurnished</option>
            </select>
          </div>

          {/* Preferred Area Filter */}
          <div>
            <select
              value={filterPrefArea}
              onChange={(e) => {
                setFilterPrefArea(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-xs font-mono text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            >
              <option value="all">Preferred Area: All</option>
              <option value="yes">Preferred Zone (Yes)</option>
              <option value="no">Standard Zone (No)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto border border-[#EAEAEA] rounded-2xl">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-left text-[#8A8A86] bg-[#FAFAFA] border-b border-[#EAEAEA]">
                <th
                  onClick={() => handleSort("price")}
                  className="py-3 px-4 font-medium cursor-pointer hover:text-[#111111] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Price ({currency})</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("area")}
                  className="py-3 px-3 font-medium cursor-pointer hover:text-[#111111] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Area (sqft)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("bedrooms")}
                  className="py-3 px-3 font-medium cursor-pointer hover:text-[#111111] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Beds</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("bathrooms")}
                  className="py-3 px-3 font-medium cursor-pointer hover:text-[#111111] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Baths</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("stories")}
                  className="py-3 px-3 font-medium cursor-pointer hover:text-[#111111] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Stories</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 font-medium">AC</th>
                <th className="py-3 px-3 font-medium">Pref Area</th>
                <th className="py-3 px-3 font-medium">Furnishing</th>
                <th
                  onClick={() => handleSort("parking")}
                  className="py-3 px-3 font-medium cursor-pointer hover:text-[#111111] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Parking</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-medium text-right">Unit Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F0]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#8A8A86]">
                    No properties match the selected search & filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, i) => {
                  const priceConv = currency === "USD" ? convertCurrency(r.price, "USD") : r.price;
                  const unitRate = currency === "USD" ? (priceConv / r.area).toFixed(1) : Math.round(priceConv / r.area);

                  return (
                    <tr key={i} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#111111]">
                        {formatCurrency(priceConv, currency)}
                      </td>
                      <td className="py-3 px-3 text-[#111111]">
                        {r.area.toLocaleString()} sqft
                      </td>
                      <td className="py-3 px-3 text-[#6B6B6B]">{r.bedrooms}</td>
                      <td className="py-3 px-3 text-[#6B6B6B]">{r.bathrooms}</td>
                      <td className="py-3 px-3 text-[#6B6B6B]">{r.stories}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            r.airconditioning === "yes"
                              ? "bg-emerald-50 text-emerald-800 font-bold"
                              : "text-[#8A8A86]"
                          }`}
                        >
                          {r.airconditioning.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            r.prefarea === "yes"
                              ? "bg-emerald-100 text-emerald-900 font-bold"
                              : "text-[#8A8A86]"
                          }`}
                        >
                          {r.prefarea === "yes" ? "PRIME" : "STD"}
                        </span>
                      </td>
                      <td className="py-3 px-3 capitalize text-[#111111]">
                        {r.furnishingstatus.replace("-", " ")}
                      </td>
                      <td className="py-3 px-3 text-[#6B6B6B]">{r.parking} spots</td>
                      <td className="py-3 px-4 text-right text-[#6B6B6B]">
                        {currency === "USD" ? `$${unitRate}` : `₹${unitRate}`}/sqft
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs font-mono text-[#6B6B6B]">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-[#111111]">
              {sortedRecords.length === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, sortedRecords.length)}
            </span>
            <span>of</span>
            <span className="font-bold text-[#111111]">{sortedRecords.length} records</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg text-xs font-mono text-[#111111] focus:outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-[#EAEAEA] hover:bg-[#FAFAFA] transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-[#111111]">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-[#EAEAEA] hover:bg-[#FAFAFA] transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
