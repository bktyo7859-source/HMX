/**
 * HMX Home Studio — Professional Architectural, BOQ & Cost PDF Report Generator (Phase 10.1 & 10.2)
 *
 * Generates four A4 report types from the saved BuildingProject state:
 *  A. Architectural Design Report ("architectural_design")
 *  B. Construction BOQ Report ("construction_boq")
 *  C. Detailed Construction Cost Report ("detailed_cost")
 *  D. Project Summary Report ("project_summary")
 *
 * Uses jsPDF for vector A4 PDF generation with consistent margins, header/footer,
 * page numbering, multi-page table continuation, vector 2D floor-plan drawings,
 * 3D isometric massing diagrams, and strict separation of taxes and assumptions.
 */

import { jsPDF } from "jspdf";
import { BuildingProject, Floor } from "../../types/homeStudio";
import {
  calculateConstructionEstimate,
  ConstructionEstimate,
  CostCalculationOptions,
  formatConstructionCurrency,
} from "./costEngine";
import { computeWallLengthFt } from "./geometry2d";
import { roundToPrecision } from "./units";

export type HomeStudioReportType =
  | "architectural_design"
  | "construction_boq"
  | "detailed_cost"
  | "project_summary";

export interface ReportTableColumn {
  key: string;
  header: string;
  widthRatio: number; // sum of widthRatios = 1.0
  align?: "left" | "right" | "center";
}

export interface ReportSectionTable {
  title: string;
  subtitle?: string;
  columns: ReportTableColumn[];
  rows: Array<Record<string, string | number>>;
}

export interface GeneratedReportDocument {
  reportId: string;
  reportType: HomeStudioReportType;
  reportTitle: string;
  subtitle: string;
  generatedAt: string;
  projectId: string;
  projectName: string;
  projectVersion: number;
  location: string;
  clientDetails: {
    ownerId: string;
    organization: string;
    preparedBy: string;
  };
  keyMetrics: Array<{ label: string; value: string; sublabel?: string }>;
  tables: ReportSectionTable[];
  assumptions: string[];
  limitations: string[];
  estimate: ConstructionEstimate;
  estimatedPageCount: number;
  fileName: string;
}

export const REPORT_TYPE_METADATA: Record<
  HomeStudioReportType,
  { title: string; subtitle: string; badge: string }
> = {
  architectural_design: {
    title: "Architectural Design & Schedule Report",
    subtitle:
      "Multi-Floor Spatial Layouts, Room & Wall Schedules, Door/Window Schedules & Finish Specifications",
    badge: "ARCHITECTURAL DOSSIER",
  },
  construction_boq: {
    title: "Preliminary Construction Bill of Quantities (BOQ)",
    subtitle:
      "10-Category Civil & Architectural Quantity Takeoff with Derivation Transparency & Rate Provenance",
    badge: "PRELIMINARY BOQ",
  },
  detailed_cost: {
    title: "Detailed Construction Cost & Budget Report",
    subtitle:
      "Material, Labour & Equipment Breakdown, Overheads, Contingency & Separately Configurable Taxes",
    badge: "COST ESTIMATE",
  },
  project_summary: {
    title: "Executive Project & Budget Summary Report",
    subtitle:
      "Concise Overview of Plot Statistics, Built-Up Area, Material Finishes & Replacement Cost",
    badge: "EXECUTIVE SUMMARY",
  },
};

/**
 * Builds structured, validated report data from a saved `BuildingProject`
 * and its Phase 8 `ConstructionEstimate`.
 */
export function buildReportDocumentData(
  project: BuildingProject,
  reportType: HomeStudioReportType,
  costOptions?: CostCalculationOptions,
  clientMeta?: { organization?: string; preparedBy?: string }
): GeneratedReportDocument {
  if (!project || !project.id || !Array.isArray(project.floors) || project.floors.length === 0) {
    throw new Error(
      "Cannot generate report: Project state is missing required plot or floor data."
    );
  }

  const estimate = calculateConstructionEstimate(project, costOptions);
  const takeoff = estimate.takeoff;
  const meta = REPORT_TYPE_METADATA[reportType];
  const nowIso = new Date().toISOString();

  const totalRooms = project.floors.reduce((s, f) => s + f.rooms.length, 0);
  const totalWalls = project.floors.reduce((s, f) => s + f.walls.length, 0);
  const totalOpenings = project.floors.reduce(
    (s, f) => s + f.openings.length,
    0
  );
  const staircases = project.floors.flatMap((f) =>
    f.objects
      .filter((o) => o.category === "staircases" || Boolean(o.stairMetadata))
      .map((o) => ({ floorName: f.name, item: o }))
  );

  const keyMetrics: Array<{ label: string; value: string; sublabel?: string }> = [
    {
      label: "Plot Dimensions",
      value: `${project.plot.width} ft × ${project.plot.length} ft`,
      sublabel: `${takeoff.plotAreaSqFt.toLocaleString("en-IN")} sq.ft (${roundToPrecision(
        takeoff.plotAreaSqFt * 0.092903,
        1
      )} sq.m)`,
    },
    {
      label: "Total Built-Up Area",
      value: `${takeoff.totalBuiltUpAreaSqFt.toLocaleString("en-IN")} sq.ft`,
      sublabel: `Carpet: ${takeoff.totalCarpetAreaSqFt.toLocaleString("en-IN")} sq.ft`,
    },
    {
      label: "Storeys & Rooms",
      value: `${project.floors.length} Floor(s) • ${totalRooms} Rooms`,
      sublabel: `${totalWalls} Walls • ${totalOpenings} Openings`,
    },
    {
      label: "Est. Construction Cost",
      value: formatConstructionCurrency(
        estimate.finalEstimatedCostINR,
        estimate.currency
      ),
      sublabel: `₹${estimate.costPerSqFtINR.toLocaleString("en-IN")} / sq.ft (Excl. Tax)`,
    },
  ];

  const tables: ReportSectionTable[] = [];

  if (reportType === "architectural_design") {
    // 1. Floor-wise Schedule
    tables.push({
      title: "1. Multi-Floor Elevation & Built-Up Schedule",
      columns: [
        { key: "floorName", header: "Floor Name", widthRatio: 0.25 },
        { key: "type", header: "Level Type", widthRatio: 0.15 },
        { key: "elevation", header: "Elevation (ft)", widthRatio: 0.15, align: "right" },
        { key: "ceiling", header: "Ceiling Ht (ft)", widthRatio: 0.15, align: "right" },
        { key: "carpet", header: "Carpet (sq.ft)", widthRatio: 0.15, align: "right" },
        { key: "builtUp", header: "Built-Up (sq.ft)", widthRatio: 0.15, align: "right" },
      ],
      rows: takeoff.floorSummaries.map((fs) => {
        const flr = project.floors.find((f) => f.id === fs.floorId);
        return {
          floorName: fs.floorName,
          type: (flr?.type || "ground").toUpperCase(),
          elevation: `${flr?.elevation ?? 0} ft`,
          ceiling: `${flr?.ceilingHeight ?? 10.5} ft`,
          carpet: fs.carpetAreaSqFt.toLocaleString("en-IN"),
          builtUp: fs.builtUpAreaSqFt.toLocaleString("en-IN"),
        };
      }),
    });

    // 2. Room Schedule
    tables.push({
      title: "2. Room Dimensions & Area Schedule",
      columns: [
        { key: "floor", header: "Floor", widthRatio: 0.18 },
        { key: "roomName", header: "Room Name", widthRatio: 0.24 },
        { key: "type", header: "Category", widthRatio: 0.18 },
        { key: "dimensions", header: "Dimensions (ft)", widthRatio: 0.2, align: "right" },
        { key: "area", header: "Area (sq.ft / sq.m)", widthRatio: 0.2, align: "right" },
      ],
      rows: project.floors.flatMap((flr) =>
        flr.rooms.map((rm) => ({
          floor: flr.name,
          roomName: rm.name,
          type: rm.type.replace(/_/g, " "),
          dimensions: `${roundToPrecision(rm.dimensions.width, 1)}' × ${roundToPrecision(
            rm.dimensions.length,
            1
          )}'`,
          area: `${roundToPrecision(rm.dimensions.area, 1)} sq.ft (${roundToPrecision(
            rm.dimensions.area * 0.092903,
            1
          )} m²)`,
        }))
      ),
    });

    // 3. Wall Schedule
    tables.push({
      title: "3. Structural & Partition Wall Schedule",
      columns: [
        { key: "floor", header: "Floor", widthRatio: 0.2 },
        { key: "wallId", header: "Wall ID", widthRatio: 0.2 },
        { key: "role", header: "Classification", widthRatio: 0.2 },
        { key: "length", header: "Length (ft)", widthRatio: 0.14, align: "right" },
        { key: "thickness", header: "Thickness (ft)", widthRatio: 0.13, align: "right" },
        { key: "height", header: "Height (ft)", widthRatio: 0.13, align: "right" },
      ],
      rows: project.floors.flatMap((flr) =>
        flr.walls.map((wl) => ({
          floor: flr.name,
          wallId: wl.id.slice(0, 14),
          role: wl.isExterior || wl.thickness >= 0.65 ? "Exterior Wall" : "Interior Partition",
          length: `${roundToPrecision(computeWallLengthFt(wl), 2)} ft`,
          thickness: `${wl.thickness} ft`,
          height: `${wl.height} ft`,
        }))
      ),
    });

    // 4. Door & Window Schedule
    tables.push({
      title: "4. Door & Window Opening Schedule",
      columns: [
        { key: "floor", header: "Floor", widthRatio: 0.2 },
        { key: "name", header: "Opening Name", widthRatio: 0.26 },
        { key: "type", header: "Type", widthRatio: 0.18 },
        { key: "size", header: "W × H (ft)", widthRatio: 0.18, align: "right" },
        { key: "sill", header: "Sill Ht (ft)", widthRatio: 0.18, align: "right" },
      ],
      rows:
        totalOpenings > 0
          ? project.floors.flatMap((flr) =>
              flr.openings.map((op) => ({
                floor: flr.name,
                name: op.name,
                type: op.type.replace(/_/g, " "),
                size: `${op.width}' × ${op.height}'`,
                sill: `${op.sillHeight} ft`,
              }))
            )
          : [
              {
                floor: "All Floors",
                name: "No explicit openings placed",
                type: "—",
                size: "—",
                sill: "—",
              },
            ],
    });

    // 5. Staircase & Material Finish Schedule
    tables.push({
      title: "5. Vertical Circulation & Architectural Material Schedule",
      columns: [
        { key: "name", header: "Material / Element", widthRatio: 0.32 },
        { key: "category", header: "Category", widthRatio: 0.22 },
        { key: "tier", header: "Finish Quality", widthRatio: 0.16 },
        { key: "swatch", header: "Color / Spec", widthRatio: 0.15 },
        { key: "rate", header: "Unit Rate (INR)", widthRatio: 0.15, align: "right" },
      ],
      rows: [
        ...staircases.map((st) => ({
          name: `${st.item.name} (${st.floorName})`,
          category: "Vertical Staircase",
          tier: st.item.stairMetadata?.stairType || "straight",
          swatch: `${st.item.dimensions.width}' × ${st.item.dimensions.depth}'`,
          rate: "Included in RCC",
        })),
        ...project.materials.map((m) => ({
          name: m.name,
          category: m.category.replace(/_/g, " "),
          tier: (m.finishQuality || "standard").toUpperCase(),
          swatch: m.color,
          rate: `₹${m.unitCostPerSqFt}/sq.ft`,
        })),
      ],
    });
  } else if (reportType === "construction_boq") {
    // 1. All 10 Categories Quantity Takeoff Table
    tables.push({
      title: "1. Preliminary Quantity Takeoff Schedule (Categories A–J)",
      subtitle:
        "Distinguishes geometry-derived quantities from user-specified and assumption-based structural allowances",
      columns: [
        { key: "cat", header: "Category", widthRatio: 0.2 },
        { key: "item", header: "BOQ Item Description", widthRatio: 0.28 },
        { key: "qty", header: "Quantity", widthRatio: 0.12, align: "right" },
        { key: "unit", header: "Unit", widthRatio: 0.1 },
        { key: "derivation", header: "Derivation Type", widthRatio: 0.14 },
        { key: "formula", header: "Engineering Basis", widthRatio: 0.16 },
      ],
      rows: takeoff.lineItems.map((li) => ({
        cat: li.categoryLabel,
        item: li.itemName,
        qty: li.quantity.toLocaleString("en-IN"),
        unit: li.unit,
        derivation: li.derivationType.replace(/_/g, " "),
        formula: li.formulaUsed,
      })),
    });

    // 2. Material Schedule with Rate Source & Date
    tables.push({
      title: "2. Material Procurement Schedule & Rate Provenance",
      columns: [
        { key: "material", header: "Material Description", widthRatio: 0.26 },
        { key: "qty", header: "Quantity", widthRatio: 0.12, align: "right" },
        { key: "unit", header: "Unit", widthRatio: 0.1 },
        { key: "rate", header: "Rate (INR)", widthRatio: 0.12, align: "right" },
        { key: "amount", header: "Material Amount", widthRatio: 0.14, align: "right" },
        { key: "source", header: "Rate Source & Effective Date", widthRatio: 0.26 },
      ],
      rows: estimate.materialSchedule.map((m) => ({
        material: m.materialName,
        qty: m.quantity.toLocaleString("en-IN"),
        unit: m.unit,
        rate: `₹${m.unitRateINR.toLocaleString("en-IN")}`,
        amount: `₹${m.totalCostINR.toLocaleString("en-IN")}`,
        source: `${m.rateSource.sourceType} (${m.rateSource.effectiveDate})`,
      })),
    });

    // 3. Labour Trade Schedule
    tables.push({
      title: "3. Construction Labour Trade Schedule (10 Trades)",
      columns: [
        { key: "trade", header: "Labour Trade", widthRatio: 0.26 },
        { key: "qty", header: "Quantity", widthRatio: 0.14, align: "right" },
        { key: "unit", header: "Unit", widthRatio: 0.12 },
        { key: "rate", header: "Trade Rate (INR)", widthRatio: 0.14, align: "right" },
        { key: "amount", header: "Labour Amount", widthRatio: 0.16, align: "right" },
        { key: "source", header: "Rate Provenance", widthRatio: 0.18 },
      ],
      rows: estimate.labourSchedule.map((l) => ({
        trade: l.trade,
        qty: l.quantity.toLocaleString("en-IN"),
        unit: l.unit,
        rate: `₹${l.unitRateINR.toLocaleString("en-IN")}`,
        amount: `₹${l.totalCostINR.toLocaleString("en-IN")}`,
        source: l.rateSource.sourceType,
      })),
    });

    // 4. Floor-Wise Quantity Breakdown
    tables.push({
      title: "4. Floor-Wise Civil Quantity Summary",
      columns: [
        { key: "floor", header: "Floor", widthRatio: 0.2 },
        { key: "builtUp", header: "Built-Up (sq.ft)", widthRatio: 0.16, align: "right" },
        { key: "masonry", header: "Net Masonry (cu.ft)", widthRatio: 0.18, align: "right" },
        { key: "openings", header: "Opening Ded. (cu.ft)", widthRatio: 0.16, align: "right" },
        { key: "slab", header: "Slab RCC (cu.ft)", widthRatio: 0.15, align: "right" },
        { key: "stair", header: "Stair RCC (cu.ft)", widthRatio: 0.15, align: "right" },
      ],
      rows: takeoff.floorSummaries.map((fs) => ({
        floor: fs.floorName,
        builtUp: fs.builtUpAreaSqFt.toLocaleString("en-IN"),
        masonry: fs.netMasonryVolumeCuFt.toLocaleString("en-IN"),
        openings: fs.openingDeductionVolumeCuFt.toLocaleString("en-IN"),
        slab: fs.slabConcreteVolumeCuFt.toLocaleString("en-IN"),
        stair: fs.staircaseConcreteVolumeCuFt.toLocaleString("en-IN"),
      })),
    });
  } else if (reportType === "detailed_cost") {
    // 1. Financial Summary Structure (Exact Phase 8 Structure)
    tables.push({
      title: "1. Executive Construction Cost Summary Structure",
      subtitle: `Location: ${estimate.location}, ${estimate.state} • Finish Tier: ${estimate.finishTier.toUpperCase()}`,
      columns: [
        { key: "line", header: "Financial Component", widthRatio: 0.44 },
        { key: "basis", header: "Calculation Basis", widthRatio: 0.32 },
        { key: "amount", header: "Amount (INR)", widthRatio: 0.24, align: "right" },
      ],
      rows: [
        {
          line: "A. Civil & Architectural Material Cost",
          basis: "18 Material Categories + Placed Interiors",
          amount: `₹${estimate.materialCostINR.toLocaleString("en-IN")}`,
        },
        {
          line: "B. Construction Labour Cost (10 Trades)",
          basis: "Excavation, Masonry, RCC, Plaster, Flooring, MEP, Paint",
          amount: `₹${estimate.labourCostINR.toLocaleString("en-IN")}`,
        },
        {
          line: "C. Plant, Shuttering & Equipment Cost",
          basis: "Scaffolding, Mixer, Vibrator & Hoisting Allowance",
          amount: `₹${estimate.equipmentCostINR.toLocaleString("en-IN")}`,
        },
        {
          line: "Subtotal Direct Construction Cost (A + B + C)",
          basis: "Material Cost + Labour Cost + Equipment Cost",
          amount: `₹${estimate.subtotalINR.toLocaleString("en-IN")}`,
        },
        {
          line: `D. Contractor Overheads & Supervision (${estimate.overheadPercentage}%)`,
          basis: `${estimate.overheadPercentage}% of Direct Subtotal`,
          amount: `₹${estimate.overheadsINR.toLocaleString("en-IN")}`,
        },
        {
          line: `E. Unforeseen Contingency Reserve (${estimate.contingencyPercentage}%)`,
          basis: `${estimate.contingencyPercentage}% of Direct Subtotal`,
          amount: `₹${estimate.contingencyINR.toLocaleString("en-IN")}`,
        },
        {
          line: "FINAL ESTIMATED CONSTRUCTION COST (Excl. Taxes)",
          basis: `Subtotal + Overheads + Contingency (₹${estimate.costPerSqFtINR.toLocaleString(
            "en-IN"
          )} / sq.ft)`,
          amount: `₹${estimate.finalEstimatedCostINR.toLocaleString("en-IN")}`,
        },
        {
          line: `F. Applicable Taxes — Separately Configurable (${estimate.taxPercentage}% GST)`,
          basis: "Kept strictly separate from Base Construction Estimate",
          amount: `₹${estimate.applicableTaxesINR.toLocaleString("en-IN")}`,
        },
        {
          line: "TOTAL INCLUDING APPLICABLE TAXES",
          basis: "Final Estimated Construction Cost + Applicable Taxes",
          amount: `₹${estimate.totalWithTaxesINR.toLocaleString("en-IN")}`,
        },
      ],
    });

    // 2. Category-wise Cost Breakdown
    tables.push({
      title: "2. Category-Wise Material, Labour & Equipment Breakdown",
      columns: [
        { key: "cat", header: "Work Package Category", widthRatio: 0.28 },
        { key: "mat", header: "Material (INR)", widthRatio: 0.18, align: "right" },
        { key: "lab", header: "Labour (INR)", widthRatio: 0.18, align: "right" },
        { key: "eq", header: "Equipment (INR)", widthRatio: 0.14, align: "right" },
        { key: "total", header: "Category Total", widthRatio: 0.14, align: "right" },
        { key: "share", header: "Share", widthRatio: 0.08, align: "right" },
      ],
      rows: estimate.categoryBreakdowns.map((c) => ({
        cat: c.categoryName,
        mat: `₹${c.materialCostINR.toLocaleString("en-IN")}`,
        lab: `₹${c.labourCostINR.toLocaleString("en-IN")}`,
        eq: `₹${c.equipmentCostINR.toLocaleString("en-IN")}`,
        total: `₹${c.totalCategoryCostINR.toLocaleString("en-IN")}`,
        share: `${c.percentageOfSubtotal}%`,
      })),
    });

    // 3. Floor-wise Cost Breakdown
    tables.push({
      title: "3. Floor-Wise Construction Cost Allocation",
      columns: [
        { key: "floor", header: "Floor Level", widthRatio: 0.24 },
        { key: "area", header: "Built-Up (sq.ft)", widthRatio: 0.16, align: "right" },
        { key: "mat", header: "Material (INR)", widthRatio: 0.2, align: "right" },
        { key: "lab", header: "Labour (INR)", widthRatio: 0.2, align: "right" },
        { key: "total", header: "Floor Total (INR)", widthRatio: 0.2, align: "right" },
      ],
      rows: estimate.floorBreakdowns.map((fb) => ({
        floor: fb.floorName,
        area: fb.builtUpAreaSqFt.toLocaleString("en-IN"),
        mat: `₹${fb.materialCostINR.toLocaleString("en-IN")}`,
        lab: `₹${fb.labourCostINR.toLocaleString("en-IN")}`,
        total: `₹${fb.totalFloorCostINR.toLocaleString("en-IN")}`,
      })),
    });
  } else {
    // D. Project Summary Report
    tables.push({
      title: "1. Project Overview & Spatial Summary",
      columns: [
        { key: "metric", header: "Architectural Metric", widthRatio: 0.45 },
        { key: "value", header: "Specification", widthRatio: 0.55 },
      ],
      rows: [
        { metric: "Project Name & ID", value: `${project.name} (${project.id})` },
        { metric: "Location & Finish Tier", value: `${estimate.location}, ${estimate.state} (${estimate.finishTier.toUpperCase()})` },
        { metric: "Plot Dimensions & Area", value: `${project.plot.width} ft × ${project.plot.length} ft (${takeoff.plotAreaSqFt.toLocaleString("en-IN")} sq.ft)` },
        { metric: "Total Built-Up & Carpet Area", value: `${takeoff.totalBuiltUpAreaSqFt.toLocaleString("en-IN")} sq.ft Built-Up / ${takeoff.totalCarpetAreaSqFt.toLocaleString("en-IN")} sq.ft Carpet` },
        { metric: "Number of Floors & Rooms", value: `${project.floors.length} Floor(s) / ${totalRooms} Room(s)` },
        { metric: "Total Concrete & Steel", value: `${takeoff.totalConcreteCuM.toLocaleString("en-IN")} cu.m RCC / ${takeoff.totalReinforcementSteelKg.toLocaleString("en-IN")} kg TMT Steel` },
        { metric: "Final Estimated Construction Cost", value: `₹${estimate.finalEstimatedCostINR.toLocaleString("en-IN")} (₹${estimate.costPerSqFtINR.toLocaleString("en-IN")} / sq.ft)` },
        { metric: "Applicable Taxes (${estimate.taxPercentage}%)", value: `₹${estimate.applicableTaxesINR.toLocaleString("en-IN")} (Total incl. Tax: ₹${estimate.totalWithTaxesINR.toLocaleString("en-IN")})` },
      ],
    });

    tables.push({
      title: "2. Floor & Material Highlights",
      columns: [
        { key: "floor", header: "Floor Name", widthRatio: 0.25 },
        { key: "rooms", header: "Rooms", widthRatio: 0.15, align: "right" },
        { key: "area", header: "Built-Up (sq.ft)", widthRatio: 0.2, align: "right" },
        { key: "cost", header: "Estimated Floor Cost", widthRatio: 0.4, align: "right" },
      ],
      rows: estimate.floorBreakdowns.map((fb) => {
        const flr = project.floors.find((f) => f.id === fb.floorId);
        return {
          floor: fb.floorName,
          rooms: flr?.rooms.length || 0,
          area: fb.builtUpAreaSqFt.toLocaleString("en-IN"),
          cost: `₹${fb.totalFloorCostINR.toLocaleString("en-IN")}`,
        };
      }),
    });
  }

  const assumptions = [
    `Foundation depth assumed at ${takeoff.assumptionsUsed.foundationDepthFt} ft and width at ${takeoff.assumptionsUsed.foundationWidthFt} ft in ${takeoff.assumptionsUsed.soilType.replace(
      /_/g,
      " "
    )} soil.`,
    `Preliminary reinforcement steel ratios: Footings ${takeoff.assumptionsUsed.footingSteelKgPerCuM} kg/m³, Columns & Beams ${takeoff.assumptionsUsed.columnBeamSteelKgPerCuM} kg/m³, Slabs & Stairs ${takeoff.assumptionsUsed.slabStairSteelKgPerCuM} kg/m³.`,
    `Flooring wastage allowance set to ${takeoff.assumptionsUsed.flooringWastagePercent}%; masonry mortar ratio set to ${Math.round(
      takeoff.assumptionsUsed.mortarRatioOfMasonryVolume * 100
    )}%.`,
    `Geometry-derived share: ${takeoff.geometryDerivedPercentage}% | Assumption-based structural/MEP share: ${takeoff.assumptionBasedPercentage}%.`,
  ];

  const limitations = [
    "Preliminary architectural design and construction cost report generated from HMX Home Studio floor-plan geometry.",
    "Substructure foundation volumes and reinforcement steel quantities are preliminary planning allowances and are NOT a certified structural engineering design or bar-bending schedule.",
    "Construction cost represents physical building replacement cost only and excludes land acquisition value or HMX ML property market valuation.",
    ...takeoff.missingStructuralInformationWarnings,
  ];

  const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);
  const estimatedPageCount = Math.max(2, 1 + Math.ceil(totalRows / 22));
  const cleanSlug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return {
    reportId: `rep-${Date.now().toString(36)}`,
    reportType,
    reportTitle: meta.title,
    subtitle: meta.subtitle,
    generatedAt: nowIso,
    projectId: project.id,
    projectName: project.name,
    projectVersion: project.version || 1,
    location: `${estimate.location}, ${estimate.state}`,
    clientDetails: {
      ownerId: project.ownerId || "workspace-owner",
      organization: clientMeta?.organization || "HMX Architectural Studio",
      preparedBy: clientMeta?.preparedBy || "HMX Home Studio Engine",
    },
    keyMetrics,
    tables,
    assumptions,
    limitations,
    estimate,
    estimatedPageCount,
    fileName: `hmx-${reportType.replace(/_/g, "-")}-${cleanSlug || project.id}-v${
      project.version || 1
    }.pdf`,
  };
}

/**
 * Draws a crisp vector 2D Floor Plan & 3D Isometric Building Massing diagram directly into the jsPDF document.
 */
function drawVectorFloorPlanAnd3DDiagramOnPdf(
  doc: jsPDF,
  project: BuildingProject,
  startY: number
): number {
  const marginX = 16;
  const boxWidth = 85;
  const boxHeight = 56;
  const floor: Floor = project.floors[0];

  // Left Box: 2D Architectural Floor Plan Vector Render
  doc.setDrawColor(231, 231, 231);
  doc.setFillColor(247, 247, 245);
  doc.roundedRect(marginX, startY, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 17, 17);
  doc.text(
    `2D FLOOR PLAN DIAGRAM — ${floor.name.toUpperCase()}`,
    marginX + 4,
    startY + 5.5
  );

  const plotW = Math.max(10, project.plot.width);
  const plotL = Math.max(10, project.plot.length);
  const scale = Math.min((boxWidth - 14) / plotW, (boxHeight - 14) / plotL);
  const originX = marginX + (boxWidth - plotW * scale) / 2;
  const originY = startY + 9 + (boxHeight - 12 - plotL * scale) / 2;

  // Plot boundary
  doc.setDrawColor(197, 168, 128);
  doc.setLineWidth(0.35);
  doc.rect(originX, originY, plotW * scale, plotL * scale);

  // Rooms
  for (const room of floor.rooms) {
    if (!room.polygon || room.polygon.length < 3) continue;
    const xs = room.polygon.map((p) => p.x);
    const ys = room.polygon.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(1, Math.max(...xs) - minX);
    const l = Math.max(1, Math.max(...ys) - minY);

    doc.setDrawColor(80, 80, 80);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.25);
    doc.rect(
      originX + minX * scale,
      originY + minY * scale,
      w * scale,
      l * scale,
      "FD"
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(60, 60, 60);
    const label = room.name.slice(0, 12);
    doc.text(
      label,
      originX + (minX + w / 2) * scale,
      originY + (minY + l / 2) * scale,
      { align: "center" }
    );
  }

  // Right Box: 3D Isometric Architectural Massing Render
  const rightX = marginX + boxWidth + 8;
  doc.setDrawColor(231, 231, 231);
  doc.setFillColor(247, 247, 245);
  doc.roundedRect(rightX, startY, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 17, 17);
  doc.text(
    `3D ARCHITECTURAL ELEVATION (${project.floors.length} STOREYS)`,
    rightX + 4,
    startY + 5.5
  );

  const centerX = rightX + boxWidth / 2;
  const baseBottomY = startY + boxHeight - 8;
  const isoW = 28;
  const isoD = 18;
  const floorStepH = Math.min(11, 28 / Math.max(1, project.floors.length));

  project.floors.forEach((flr, idx) => {
    const yBottom = baseBottomY - idx * floorStepH;
    const yTop = yBottom - floorStepH + 1;

    // Front-left & front-right isometric faces
    doc.setDrawColor(40, 40, 40);
    doc.setFillColor(250, 248, 244);
    doc.setLineWidth(0.3);
    doc.rect(centerX - isoW, yTop, isoW, floorStepH - 1, "FD");

    doc.setFillColor(235, 231, 223);
    doc.rect(centerX, yTop, isoD, floorStepH - 1, "FD");

    // Slab accent line
    doc.setDrawColor(197, 168, 128);
    doc.setLineWidth(0.5);
    doc.line(centerX - isoW, yTop, centerX + isoD, yTop);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(40, 40, 40);
    doc.text(flr.name.slice(0, 14), centerX - isoW + 2, yTop + floorStepH / 2);
  });

  return startY + boxHeight + 6;
}

/**
 * Generates an A4 print-ready `jsPDF` instance from `GeneratedReportDocument` and `BuildingProject`.
 * Automatically paginates tables, draws headers/footers, and numbers every page (`Page X of Y`).
 */
export function createArchitecturalPdfDocument(
  project: BuildingProject,
  reportDoc: GeneratedReportDocument
): { pdf: jsPDF; pageCount: number } {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimitY = pageHeight - 20;

  let cursorY = 20;

  const drawPageHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(197, 168, 128);
    doc.text("HMX HOME STUDIO • ARCHITECTURAL & COST DOSSIER", marginX, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 107, 107);
    doc.text(
      `${reportDoc.projectName.slice(0, 38)} (v${reportDoc.projectVersion})`,
      pageWidth - marginX,
      11,
      { align: "right" }
    );

    doc.setDrawColor(231, 231, 231);
    doc.setLineWidth(0.25);
    doc.line(marginX, 13.5, pageWidth - marginX, 13.5);
  };

  const ensureVerticalSpace = (requiredMm: number) => {
    if (cursorY + requiredMm > bottomLimitY) {
      doc.addPage();
      drawPageHeader();
      cursorY = 20;
    }
  };

  // --- PAGE 1: TITLE BANNER & KEY METRICS ---
  drawPageHeader();

  doc.setFillColor(247, 247, 245);
  doc.setDrawColor(231, 231, 231);
  doc.roundedRect(marginX, cursorY, contentWidth, 32, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(197, 168, 128);
  doc.text(
    REPORT_TYPE_METADATA[reportDoc.reportType].badge,
    marginX + 6,
    cursorY + 7
  );

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 17, 17);
  doc.text(reportDoc.reportTitle, marginX + 6, cursorY + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 107, 107);
  doc.text(
    `Project: ${reportDoc.projectName} (${reportDoc.projectId})  |  Location: ${
      reportDoc.location
    }  |  Date: ${new Date(reportDoc.generatedAt).toLocaleDateString("en-IN")}`,
    marginX + 6,
    cursorY + 22
  );
  doc.text(
    `Prepared By: ${reportDoc.clientDetails.preparedBy}  |  Organization: ${reportDoc.clientDetails.organization}`,
    marginX + 6,
    cursorY + 27.5
  );

  cursorY += 37;

  // 4 Key Metric Cards
  const cardGap = 3;
  const cardW = (contentWidth - cardGap * 3) / 4;
  reportDoc.keyMetrics.forEach((km, idx) => {
    const x = marginX + idx * (cardW + cardGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(231, 231, 231);
    doc.roundedRect(x, cursorY, cardW, 19, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 107, 107);
    doc.text(km.label.toUpperCase(), x + 3, cursorY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 17, 17);
    doc.text(String(km.value).slice(0, 22), x + 3, cursorY + 11);

    if (km.sublabel) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(107, 107, 107);
      doc.text(String(km.sublabel).slice(0, 26), x + 3, cursorY + 16);
    }
  });

  cursorY += 24;

  // Draw Vector 2D Floor Plan & 3D Building Diagram on Architectural & Summary Reports
  if (
    reportDoc.reportType === "architectural_design" ||
    reportDoc.reportType === "project_summary"
  ) {
    ensureVerticalSpace(64);
    cursorY = drawVectorFloorPlanAnd3DDiagramOnPdf(doc, project, cursorY);
  }

  // --- MULTI-PAGE TABLES ---
  for (const table of reportDoc.tables) {
    ensureVerticalSpace(22);

    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(17, 17, 17);
    doc.text(table.title, marginX, cursorY);
    cursorY += 4.5;

    if (table.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 107, 107);
      doc.text(table.subtitle, marginX, cursorY);
      cursorY += 4.5;
    }

    const drawTableHeader = () => {
      doc.setFillColor(17, 17, 17);
      doc.rect(marginX, cursorY, contentWidth, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);

      let colX = marginX;
      for (const col of table.columns) {
        const colW = contentWidth * col.widthRatio;
        const textX =
          col.align === "right" ? colX + colW - 2 : colX + 2;
        doc.text(col.header, textX, cursorY + 4.8, {
          align: col.align === "right" ? "right" : "left",
        });
        colX += colW;
      }
      cursorY += 7;
    };

    drawTableHeader();

    table.rows.forEach((row, rIdx) => {
      if (cursorY + 6.5 > bottomLimitY) {
        doc.addPage();
        drawPageHeader();
        cursorY = 20;
        drawTableHeader();
      }

      if (rIdx % 2 === 1) {
        doc.setFillColor(247, 247, 245);
        doc.rect(marginX, cursorY, contentWidth, 6.2, "F");
      }

      doc.setDrawColor(235, 235, 235);
      doc.setLineWidth(0.15);
      doc.line(marginX, cursorY + 6.2, marginX + contentWidth, cursorY + 6.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(25, 25, 25);

      let colX = marginX;
      for (const col of table.columns) {
        const colW = contentWidth * col.widthRatio;
        const rawVal = String(row[col.key] ?? "—")
          .replace(/₹/g, "INR ")
          .replace(/²/g, "2")
          .replace(/³/g, "3")
          .replace(/•/g, "|");
        const maxChars = Math.max(8, Math.floor(colW * 0.62));
        const clipped =
          rawVal.length > maxChars
            ? rawVal.slice(0, maxChars - 1) + "…"
            : rawVal;
        const textX =
          col.align === "right" ? colX + colW - 2 : colX + 2;
        doc.text(clipped, textX, cursorY + 4.3, {
          align: col.align === "right" ? "right" : "left",
        });
        colX += colW;
      }

      cursorY += 6.2;
    });

    cursorY += 7;
  }

  // --- ASSUMPTIONS & ENGINEERING LIMITATIONS BLOCK ---
  ensureVerticalSpace(42);
  doc.setFillColor(247, 247, 245);
  doc.setDrawColor(231, 231, 231);
  doc.roundedRect(marginX, cursorY, contentWidth, 38, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 17, 17);
  doc.text(
    "ENGINEERING ASSUMPTIONS, RATE PROVENANCE & MANDATORY LIMITATIONS",
    marginX + 4,
    cursorY + 5.5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 80);
  let noteY = cursorY + 10.5;
  for (const item of [...reportDoc.assumptions.slice(0, 2), ...reportDoc.limitations.slice(0, 3)]) {
    const cleanLine = item
      .replace(/₹/g, "INR ")
      .replace(/²/g, "2")
      .replace(/³/g, "3");
    const wrapped = doc.splitTextToSize(`• ${cleanLine}`, contentWidth - 8);
    doc.text(wrapped, marginX + 4, noteY);
    noteY += wrapped.length * 3.4;
  }

  // --- STAMP FOOTER WITH PAGE X OF Y ON EVERY PAGE ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(231, 231, 231);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 107, 107);
    doc.text(
      "HMX Home Studio — Preliminary Architectural & Construction Cost Dossier (Not a Structural Engineering Certificate)",
      marginX,
      pageHeight - 8.5
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 8.5,
      { align: "right" }
    );
  }

  return { pdf: doc, pageCount: totalPages };
}
