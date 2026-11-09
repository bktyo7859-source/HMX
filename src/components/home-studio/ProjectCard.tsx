"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  Copy,
  Layers,
  MapPin,
  Maximize2,
  Ruler,
  Trash2,
  Calendar,
} from "lucide-react";
import { BuildingProject, UnitSystem } from "@/types/homeStudio";
import {
  calculateProjectMetrics,
  formatArea,
  formatDimension,
} from "@/data/homeStudioProjects";

interface ProjectCardProps {
  project: BuildingProject;
  displayUnit: UnitSystem;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({
  project,
  displayUnit,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  const metrics = calculateProjectMetrics(project);
  const groundFloor =
    project.floors.find((f) => f.type === "ground") || project.floors[0];

  const plotW = Math.max(20, project.plot.width);
  const plotL = Math.max(20, project.plot.length);
  const sb = project.plot.setbacks;

  const formattedUpdatedDate = new Date(project.updatedAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <div className="luxury-card group flex flex-col justify-between overflow-hidden bg-white border border-[#E7E7E7]">
      {/* Architectural CAD Blueprint Thumbnail */}
      <div className="relative w-full aspect-[16/10] bg-[#F7F7F5] border-b border-[#E7E7E7] p-5 flex items-center justify-center overflow-hidden">
        {/* Subtle Architectural CAD Grid */}
        <div
          className="absolute inset-0 opacity-45 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #E5E5E0 1px, transparent 1px), linear-gradient(to bottom, #E5E5E0 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
          <span className="px-2.5 py-1 rounded-full bg-white/95 border border-[#E7E7E7] text-[10px] uppercase tracking-[0.16em] font-medium text-[#111111]">
            {metrics.floorCount} {metrics.floorCount === 1 ? "Floor" : "Floors"}
          </span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 border border-[#E7E7E7] text-[10px] font-mono text-[#6B6B6B]">
            <Compass className="w-3 h-3 text-[#C5A880]" />
            <span>
              {project.plot.northDirection} • Road{" "}
              {project.plot.roadFacing.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Dynamic SVG Plan Preview */}
        <svg
          viewBox={`-8 -8 ${plotW + 16} ${plotL + 16}`}
          className="w-full h-full max-h-[165px] transition-transform duration-500 group-hover:scale-105"
          aria-label={`Architectural plan thumbnail for ${project.name}`}
        >
          {/* Outer Plot Boundary */}
          <rect
            x={0}
            y={0}
            width={plotW}
            height={plotL}
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth={0.9}
          />

          {/* Setback Dashed Envelope */}
          <rect
            x={sb.left}
            y={sb.front}
            width={Math.max(8, plotW - sb.left - sb.right)}
            height={Math.max(8, plotL - sb.front - sb.back)}
            fill="#FBFBFA"
            stroke="#C5A880"
            strokeWidth={0.45}
            strokeDasharray="2 1.5"
          />

          {/* Rooms on Primary Floor */}
          {groundFloor?.rooms.map((room) => {
            const xs = room.polygon.map((p) => p.x);
            const ys = room.polygon.map((p) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const rw = Math.max(2, maxX - minX);
            const rh = Math.max(2, maxY - minY);

            return (
              <g key={room.id}>
                <rect
                  x={minX}
                  y={minY}
                  width={rw}
                  height={rh}
                  fill={room.color || "#F5EFE6"}
                  stroke="#111111"
                  strokeWidth={0.7}
                />
                {rw >= 8 && rh >= 8 && (
                  <text
                    x={minX + rw / 2}
                    y={minY + rh / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#111111"
                    fontSize={Math.min(2.8, rw * 0.16)}
                    fontFamily="DM Sans, sans-serif"
                  >
                    {room.name.split(" ")[0]}
                  </text>
                )}
              </g>
            );
          })}

          {/* Dimension Annotation Line */}
          <line
            x1={0}
            y1={plotL + 4.5}
            x2={plotW}
            y2={plotL + 4.5}
            stroke="#6B6B6B"
            strokeWidth={0.4}
          />
        </svg>

        {/* Bottom Scale Caption */}
        <div className="absolute bottom-2.5 right-3.5 text-[10px] font-mono text-[#6B6B6B] bg-white/90 px-2 py-0.5 rounded border border-[#E7E7E7]">
          CAD SCALE • {formatDimension(project.plot.width, displayUnit)} ×{" "}
          {formatDimension(project.plot.length, displayUnit)}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
              {project.location}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3 text-[#6B6B6B]" />
              {formattedUpdatedDate}
            </span>
          </div>

          <Link
            href={`/home-studio/${project.id}`}
            className="block group-hover:text-[#C5A880] transition-colors"
          >
            <h3
              className="font-serif text-2xl font-normal text-[#111111] leading-snug"
              style={{
                fontFamily: "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              {project.name}
            </h3>
          </Link>

          <p className="text-xs text-[#6B6B6B] font-light line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Architectural Specs Grid */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#E7E7E7]">
          <div className="p-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7]/70">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#6B6B6B]">
              <Ruler className="w-3 h-3 text-[#C5A880]" />
              <span>Plot Size</span>
            </div>
            <p className="text-xs font-medium text-[#111111] mt-1 font-mono">
              {formatDimension(project.plot.width, displayUnit)} ×{" "}
              {formatDimension(project.plot.length, displayUnit)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7]/70">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#6B6B6B]">
              <Maximize2 className="w-3 h-3 text-[#C5A880]" />
              <span>Built-Up</span>
            </div>
            <p className="text-xs font-medium text-[#111111] mt-1 font-mono">
              {formatArea(metrics.totalBuiltUpAreaSqFt, displayUnit)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7]/70">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#6B6B6B]">
              <Layers className="w-3 h-3 text-[#C5A880]" />
              <span>Levels</span>
            </div>
            <p className="text-xs font-medium text-[#111111] mt-1 font-mono">
              {metrics.floorCount} Floors • {metrics.totalRoomsCount} Rms
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <Link
            href={`/home-studio/${project.id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#111111] text-white text-xs uppercase tracking-wider font-medium py-3 px-4 rounded-full hover:bg-[#262626] transition-all"
          >
            <span>Open Studio</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => onDuplicate(project.id)}
            title="Duplicate Project"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-full border border-[#E7E7E7] bg-white text-xs text-[#111111] hover:bg-[#F7F7F5] hover:border-[#111111] transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-[#6B6B6B]" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(project.id)}
              title="Delete Project"
              className="inline-flex items-center justify-center p-3 rounded-full border border-[#E7E7E7] bg-white text-[#6B6B6B] hover:text-red-700 hover:border-red-200 hover:bg-red-50/40 transition-colors"
              aria-label={`Delete ${project.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

