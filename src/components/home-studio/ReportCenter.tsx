"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ClipboardList,
  IndianRupee,
  LayoutGrid,
  History,
  Printer,
} from "lucide-react";
import {
  useHomeStudioStore,
  selectActiveProject,
} from "@/store/useHomeStudioStore";
import {
  buildReportDocumentData,
  createArchitecturalPdfDocument,
  HomeStudioReportType,
  REPORT_TYPE_METADATA,
} from "@/lib/home-studio/reportGenerator";
import { apiPostgresStorage } from "@/lib/home-studio/storage";
import type { StoredReportMetadataEntity } from "@/lib/home-studio/serverAuthAndDb";

interface ReportCenterProps {
  onStatusNotice?: (msg: string) => void;
}

const REPORT_TYPES: Array<{
  id: HomeStudioReportType;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "architectural_design",
    label: "A. Architectural Design Report",
    shortDesc:
      "Plot & floor layouts, room/wall schedules, door/window schedules, materials & 2D/3D diagrams",
    icon: Building2,
  },
  {
    id: "construction_boq",
    label: "B. Construction BOQ Report",
    shortDesc:
      "All 10 takeoff categories (A–J), material/labour quantities, derivation badges & rate provenance",
    icon: ClipboardList,
  },
  {
    id: "detailed_cost",
    label: "C. Detailed Construction Cost Report",
    shortDesc:
      "Material, labour & equipment subtotal, overheads, contingency & separately configurable taxes",
    icon: IndianRupee,
  },
  {
    id: "project_summary",
    label: "D. Project Summary Report",
    shortDesc:
      "Executive overview of plot, floor count, room count, built-up area, materials & cost per sq.ft",
    icon: LayoutGrid,
  },
];

export default function ReportCenter({ onStatusNotice }: ReportCenterProps) {
  const project = useHomeStudioStore(selectActiveProject);

  const [selectedReportType, setSelectedReportType] =
    useState<HomeStudioReportType>("architectural_design");
  const [organizationName, setOrganizationName] = useState<string>(
    "HMX Architectural Studio"
  );
  const [preparedByName, setPreparedByName] = useState<string>(
    "HMX Home Studio CAD & Cost Engine"
  );
  const [taxPercentage, setTaxPercentage] = useState<number>(18);
  const [regenVersion, setRegenVersion] = useState<number>(1);
  const [generationStatus, setGenerationStatus] = useState<
    "ready" | "generating" | "completed" | "error"
  >("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<
    StoredReportMetadataEntity[]
  >([]);

  useEffect(() => {
    if (!project) return;
    apiPostgresStorage
      .listReportMetadata(project.id)
      .then((list) => setSavedReports(list))
      .catch(() => {
        // Unauthenticated or local mode
      });
  }, [project, project?.id]);

  const reportDoc = useMemo(() => {
    if (!project) return null;
    try {
      setErrorMessage(null);
      return buildReportDocumentData(
        project,
        selectedReportType,
        { taxPercentage },
        {
          organization: organizationName,
          preparedBy: preparedByName,
        }
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to build report preview."
      );
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project,
    selectedReportType,
    taxPercentage,
    organizationName,
    preparedByName,
    regenVersion,
  ]);

  if (!project) return null;

  const handleDownloadPdf = async () => {
    if (!reportDoc) return;
    setGenerationStatus("generating");
    setErrorMessage(null);

    try {
      const { pdf, pageCount } = createArchitecturalPdfDocument(
        project,
        reportDoc
      );
      pdf.save(reportDoc.fileName);

      // Persist report metadata to database if authenticated
      try {
        const savedMeta = await apiPostgresStorage.recordReportMetadata(
          project.id,
          {
            reportType: selectedReportType,
            title: reportDoc.reportTitle,
            projectVersion: project.version || 1,
            fileName: reportDoc.fileName,
            pageCount,
            summaryMetrics: {
              builtUpAreaSqFt:
                reportDoc.estimate.takeoff.totalBuiltUpAreaSqFt,
              finalEstimatedCostINR:
                reportDoc.estimate.finalEstimatedCostINR,
              costPerSqFtINR: reportDoc.estimate.costPerSqFtINR,
            },
          }
        );
        setSavedReports((prev) => [savedMeta, ...prev]);
      } catch {
        // Unauthenticated local session: PDF download still succeeds
      }

      setGenerationStatus("completed");
      onStatusNotice?.(
        `Downloaded A4 PDF "${reportDoc.fileName}" (${pageCount} pages).`
      );
    } catch (err) {
      setGenerationStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "PDF generation failed."
      );
    }
  };

  const handleRegenerate = () => {
    setRegenVersion((v) => v + 1);
    setGenerationStatus("ready");
    onStatusNotice?.(
      `Regenerated ${REPORT_TYPE_METADATA[selectedReportType].title} from saved project state (v${project.version}).`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Control Bar */}
      <div className="p-6 rounded-[24px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7E7E7] pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-semibold block">
              Phase 10 • Professional A4 Architectural & Engineering Reports
            </span>
            <h2
              className="font-serif text-2xl sm:text-3xl text-[#111111]"
              style={{
                fontFamily:
                  "var(--font-cormorant), Cormorant Garamond, serif",
              }}
            >
              HMX Report & Dossier Center
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Generated directly from committed BuildingProject state (v
              {project.version}) with multi-page A4 formatting, page numbering,
              2D/3D vector diagrams, and rate provenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-full bg-white border border-[#E7E7E7] text-xs font-mono text-[#111111] inline-flex items-center gap-1.5">
              {generationStatus === "generating" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#C5A880] animate-spin" />
                  <span>Generating A4 PDF...</span>
                </>
              ) : generationStatus === "completed" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">PDF Downloaded</span>
                </>
              ) : generationStatus === "error" ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-red-700">Error</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>
                    Ready • ~{reportDoc?.estimatedPageCount || 2} A4 Pages
                  </span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={handleRegenerate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Regenerate Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!reportDoc || generationStatus === "generating"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Download A4 PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Report Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            const active = selectedReportType === rt.id;
            return (
              <button
                key={rt.id}
                type="button"
                onClick={() => {
                  setSelectedReportType(rt.id);
                  setGenerationStatus("ready");
                }}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  active
                    ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                    : "bg-white text-[#111111] border-[#E7E7E7] hover:border-[#111111]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon
                    className={`w-4 h-4 ${
                      active ? "text-[#C5A880]" : "text-[#6B6B6B]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono uppercase ${
                      active ? "text-[#C5A880]" : "text-[#6B6B6B]"
                    }`}
                  >
                    A4 Portrait
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold block">{rt.label}</span>
                  <span
                    className={`text-[11px] leading-snug block mt-1 ${
                      active ? "text-[#D4D4D4]" : "text-[#6B6B6B]"
                    }`}
                  >
                    {rt.shortDesc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Client & Tax Metadata Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-white p-3 rounded-xl border border-[#E7E7E7]">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1">
              Client / Organization Name
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full text-xs text-[#111111] font-medium outline-none bg-transparent"
            />
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#E7E7E7]">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1">
              Prepared By / Architect Reference
            </label>
            <input
              type="text"
              value={preparedByName}
              onChange={(e) => setPreparedByName(e.target.value)}
              className="w-full text-xs text-[#111111] font-medium outline-none bg-transparent"
            />
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#E7E7E7]">
            <label className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block mb-1">
              Separately Displayed Applicable Tax (GST %)
            </label>
            <input
              type="number"
              min={0}
              max={28}
              step={1}
              value={taxPercentage}
              onChange={(e) =>
                setTaxPercentage(Math.max(0, Math.min(28, Number(e.target.value) || 0)))
              }
              className="w-full text-xs font-mono text-[#111111] font-medium outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Print-Ready Interactive A4 Report Preview */}
      {reportDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-9 p-6 sm:p-8 rounded-[24px] bg-white border border-[#E7E7E7] shadow-sm space-y-6">
            {/* A4 Sheet Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E7E7] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C5A880] font-semibold">
                  {REPORT_TYPE_METADATA[reportDoc.reportType].badge} • HMX HOME STUDIO
                </span>
                <h3
                  className="font-serif text-2xl text-[#111111] mt-1"
                  style={{
                    fontFamily:
                      "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  {reportDoc.reportTitle}
                </h3>
                <p className="text-xs text-[#6B6B6B]">{reportDoc.subtitle}</p>
              </div>
              <div className="text-right font-mono text-[11px] text-[#6B6B6B]">
                <div>Project ID: {reportDoc.projectId}</div>
                <div>Revision: v{reportDoc.projectVersion}</div>
                <div>
                  Date:{" "}
                  {new Date(reportDoc.generatedAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {reportDoc.keyMetrics.map((km, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7]"
                >
                  <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block">
                    {km.label}
                  </span>
                  <span className="text-sm font-serif font-semibold text-[#111111] block mt-0.5">
                    {km.value}
                  </span>
                  {km.sublabel && (
                    <span className="text-[10px] font-mono text-[#6B6B6B] block mt-0.5">
                      {km.sublabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 2D Floor Plan & 3D Elevation Preview Cards on Architectural & Summary Reports */}
            {(reportDoc.reportType === "architectural_design" ||
              reportDoc.reportType === "project_summary") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#6B6B6B]">
                    <span>2D Floor Plan Vector Diagram ({project.floors[0].name})</span>
                    <span className="text-[#C5A880]">
                      {project.plot.width}&apos; × {project.plot.length}&apos; Plot
                    </span>
                  </div>
                  <svg
                    viewBox={`0 0 ${Math.max(20, project.plot.width)} ${Math.max(
                      20,
                      project.plot.length
                    )}`}
                    className="w-full h-44 bg-white rounded-xl border border-[#E7E7E7] p-2"
                  >
                    <rect
                      x={0}
                      y={0}
                      width={project.plot.width}
                      height={project.plot.length}
                      fill="#FAF9F5"
                      stroke="#C5A880"
                      strokeWidth={0.4}
                    />
                    {project.floors[0].rooms.map((rm) => {
                      const xs = rm.polygon.map((p) => p.x);
                      const ys = rm.polygon.map((p) => p.y);
                      const minX = Math.min(...xs);
                      const minY = Math.min(...ys);
                      const w = Math.max(1, Math.max(...xs) - minX);
                      const l = Math.max(1, Math.max(...ys) - minY);
                      return (
                        <g key={rm.id}>
                          <rect
                            x={minX}
                            y={minY}
                            width={w}
                            height={l}
                            fill={rm.color || "#F4EFE6"}
                            stroke="#111111"
                            strokeWidth={0.35}
                          />
                          <text
                            x={minX + w / 2}
                            y={minY + l / 2}
                            fontSize={1.8}
                            textAnchor="middle"
                            fill="#111111"
                          >
                            {rm.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#6B6B6B]">
                    <span>3D Multi-Floor Stacking Diagram</span>
                    <span className="text-[#C5A880]">
                      {project.floors.length} Storey(s) • Roof:{" "}
                      {project.settings.RoofStyle}
                    </span>
                  </div>
                  <div className="w-full h-44 bg-white rounded-xl border border-[#E7E7E7] p-4 flex flex-col justify-end items-center gap-1.5">
                    {[...project.floors]
                      .sort((a, b) => b.levelIndex - a.levelIndex)
                      .map((flr) => (
                        <div
                          key={flr.id}
                          className="w-4/5 px-3 py-2 rounded-lg bg-[#F7F7F5] border border-[#111111] flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-[#111111]">
                            {flr.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#6B6B6B]">
                            Elev +{flr.elevation}&apos; • Ceiling{" "}
                            {flr.ceilingHeight}&apos;
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Report Tables */}
            {reportDoc.tables.map((tbl, tIdx) => (
              <div key={tIdx} className="space-y-2">
                <div>
                  <h4 className="font-serif text-lg text-[#111111] font-semibold">
                    {tbl.title}
                  </h4>
                  {tbl.subtitle && (
                    <p className="text-[11px] text-[#6B6B6B]">{tbl.subtitle}</p>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#E7E7E7]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#111111] text-white">
                        {tbl.columns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider ${
                              col.align === "right" ? "text-right" : "text-left"
                            }`}
                          >
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {tbl.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            rIdx % 2 === 1 ? "bg-[#F7F7F5]" : "bg-white"
                          }
                        >
                          {tbl.columns.map((col) => (
                            <td
                              key={col.key}
                              className={`px-3 py-2 text-xs text-[#111111] ${
                                col.align === "right"
                                  ? "text-right font-mono"
                                  : "text-left"
                              }`}
                            >
                              {row[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Assumptions & Engineering Limitations Footer */}
            <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] space-y-2 text-[11px] text-[#6B6B6B]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#111111] font-semibold block">
                Engineering Assumptions & Mandatory Report Limitations
              </span>
              <ul className="list-disc pl-4 space-y-1">
                {reportDoc.assumptions.map((a, i) => (
                  <li key={`a-${i}`}>{a}</li>
                ))}
                {reportDoc.limitations.map((l, i) => (
                  <li key={`l-${i}`}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Sidebar: Report Metadata & Previously Generated Dossiers */}
          <div className="lg:col-span-3 space-y-4">
            <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3">
              <div className="flex items-center gap-2 border-b border-[#E7E7E7] pb-2.5">
                <Printer className="w-4 h-4 text-[#C5A880]" />
                <span className="text-xs uppercase tracking-wider font-medium text-[#111111]">
                  A4 PDF Quality Spec
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-[#6B6B6B]">
                <li>• Standard ISO A4 Portrait (210mm × 297mm)</li>
                <li>• 16mm Architectural Page Margins</li>
                <li>• Automatic Multi-Page Table Continuation</li>
                <li>• Vector 2D Floor Plan & 3D Elevation Diagrams</li>
                <li>• Page X of Y Footer Stamp on Every Sheet</li>
                <li>• Taxes Strictly Separated from Base Estimate</li>
              </ul>
            </div>

            <div className="p-5 rounded-[20px] bg-[#F7F7F5] border border-[#E7E7E7] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-2.5">
                <span className="text-xs uppercase tracking-wider font-medium text-[#111111] inline-flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Generated Report Log</span>
                </span>
                <span className="text-[10px] font-mono text-[#6B6B6B]">
                  {savedReports.length}
                </span>
              </div>

              {savedReports.length === 0 ? (
                <p className="text-[11px] text-[#6B6B6B]">
                  Download a PDF above to record report metadata in your
                  project&apos;s audit log.
                </p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {savedReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded-xl bg-white border border-[#E7E7E7] space-y-1"
                    >
                      <span className="text-xs font-medium text-[#111111] block truncate">
                        {rep.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#C5A880] block truncate">
                        {rep.fileName} • {rep.pageCount}p • v{rep.projectVersion}
                      </span>
                      <span className="text-[10px] font-mono text-[#6B6B6B] block">
                        {new Date(rep.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

