import {
  BuildingProject,
  CardinalDirection,
  Floor,
  FloorType,
  RoadSide,
  UnitSystem,
} from "../types/homeStudio";
import { EXTENDED_ARCHITECTURAL_MATERIALS } from "../lib/home-studio/furnitureCatalog";

const STORAGE_KEY = "hmx_home_studio_projects_v1";

export interface CreateProjectInput {
  name: string;
  description: string;
  location: string;
  plotShape: "rectangular" | "polygon";
  plotWidthFt: number;
  plotLengthFt: number;
  displayUnit: UnitSystem;
  northDirection: CardinalDirection;
  roadFacing: RoadSide;
  frontSetbackFt: number;
  backSetbackFt: number;
  leftSetbackFt: number;
  rightSetbackFt: number;
  initialFloors: FloorType[];
  ceilingHeightFt: number;
  templateId: "blank" | "modern_villa_3bhk" | "compact_courtyard_2bhk" | "executive_duplex_4bhk";
}

export const DEFAULT_ARCHITECTURAL_MATERIALS: BuildingProject["materials"] = [
  {
    id: "mat-wall-plaster-white",
    name: "Gallery White Gypsum Plaster",
    category: "wall",
    color: "#F9F8F6",
    roughness: 0.85,
    metalness: 0.02,
    pattern: "solid",
    unitCostPerSqFt: 65,
  },
  {
    id: "mat-wall-travertine",
    name: "Warm Travertine Limestone",
    category: "stone",
    color: "#E8E0D5",
    roughness: 0.65,
    metalness: 0.05,
    pattern: "marble",
    unitCostPerSqFt: 240,
  },
  {
    id: "mat-floor-italian-marble",
    name: "Statuario Italian Marble",
    category: "floor",
    color: "#F2EFE9",
    roughness: 0.25,
    metalness: 0.08,
    pattern: "marble",
    unitCostPerSqFt: 380,
  },
  {
    id: "mat-floor-oak-herringbone",
    name: "European White Oak Timber",
    category: "wood",
    color: "#C8A986",
    roughness: 0.45,
    metalness: 0.04,
    pattern: "wood",
    unitCostPerSqFt: 260,
  },
  {
    id: "mat-floor-vitrified-matte",
    name: "Architectural Matte Porcelain Tile",
    category: "floor",
    color: "#E4E2DD",
    roughness: 0.5,
    metalness: 0.05,
    pattern: "tile",
    unitCostPerSqFt: 115,
  },
  {
    id: "mat-glass-low-e",
    name: "Double-Glazed Low-E Architectural Glass",
    category: "glass",
    color: "#D8E6EC",
    roughness: 0.1,
    metalness: 0.1,
    opacity: 0.38,
    pattern: "glass",
    unitCostPerSqFt: 320,
  },
  ...EXTENDED_ARCHITECTURAL_MATERIALS,
];

const FLOOR_METADATA: Record<FloorType, { name: string; levelIndex: number }> = {
  basement: { name: "Basement Level", levelIndex: -1 },
  ground: { name: "Ground Floor", levelIndex: 0 },
  first: { name: "First Floor", levelIndex: 1 },
  second: { name: "Second Floor", levelIndex: 2 },
  third: { name: "Third Floor", levelIndex: 3 },
  rooftop: { name: "Rooftop Terrace", levelIndex: 4 },
  custom: { name: "Custom Floor", levelIndex: 2 },
};

function createFloorsFromTypes(
  floorTypes: FloorType[],
  ceilingHeightFt: number,
  plotWidth: number,
  plotLength: number,
  setbacks: { front: number; back: number; left: number; right: number },
  templateId: CreateProjectInput["templateId"]
): Floor[] {
  const orderedTypes = [...floorTypes].sort(
    (a, b) => FLOOR_METADATA[a].levelIndex - FLOOR_METADATA[b].levelIndex
  );

  const buildX = setbacks.left;
  const buildY = setbacks.front;
  const buildW = Math.max(16, plotWidth - setbacks.left - setbacks.right);
  const buildL = Math.max(20, plotLength - setbacks.front - setbacks.back);

  return orderedTypes.map((type, idx) => {
    const meta = FLOOR_METADATA[type];
    const floorId = `floor-${type}-${idx + 1}`;
    const elevation = meta.levelIndex * (ceilingHeightFt + 0.5);

    if (templateId === "blank") {
      return {
        id: floorId,
        name: meta.name,
        type,
        levelIndex: meta.levelIndex,
        elevation,
        floorHeight: 0.5,
        ceilingHeight: ceilingHeightFt,
        visible: true,
        locked: false,
        rooms: [],
        walls: [],
        openings: [],
        objects: [],
      };
    }

    // Build realistic architectural rooms & perimeter walls for curated starter templates
    const midX = Math.round(buildX + buildW * 0.55);
    const midY1 = Math.round(buildY + buildL * 0.42);
    const midY2 = Math.round(buildY + buildL * 0.72);

    const rooms: Floor["rooms"] =
      type === "ground"
        ? [
            {
              id: `${floorId}-room-living`,
              floorId,
              type: "living_room",
              name: "Grand Living Lounge",
              polygon: [
                { x: buildX, y: buildY },
                { x: midX, y: buildY },
                { x: midX, y: midY1 },
                { x: buildX, y: midY1 },
              ],
              dimensions: {
                width: midX - buildX,
                length: midY1 - buildY,
                area: (midX - buildX) * (midY1 - buildY),
              },
              floorMaterialId: "mat-floor-italian-marble",
              wallMaterialId: "mat-wall-plaster-white",
              color: "#F5F2EB",
            },
            {
              id: `${floorId}-room-dining`,
              floorId,
              type: "dining_room",
              name: "Formal Dining Hall",
              polygon: [
                { x: buildX, y: midY1 },
                { x: midX, y: midY1 },
                { x: midX, y: midY2 },
                { x: buildX, y: midY2 },
              ],
              dimensions: {
                width: midX - buildX,
                length: midY2 - midY1,
                area: (midX - buildX) * (midY2 - midY1),
              },
              floorMaterialId: "mat-floor-italian-marble",
              wallMaterialId: "mat-wall-plaster-white",
              color: "#F3EFE6",
            },
            {
              id: `${floorId}-room-kitchen`,
              floorId,
              type: "kitchen",
              name: "Chef's Modular Kitchen",
              polygon: [
                { x: midX, y: buildY },
                { x: buildX + buildW, y: buildY },
                { x: buildX + buildW, y: midY1 },
                { x: midX, y: midY1 },
              ],
              dimensions: {
                width: buildX + buildW - midX,
                length: midY1 - buildY,
                area: (buildX + buildW - midX) * (midY1 - buildY),
              },
              floorMaterialId: "mat-floor-vitrified-matte",
              wallMaterialId: "mat-wall-plaster-white",
              color: "#EFECE6",
            },
            {
              id: `${floorId}-room-master`,
              floorId,
              type: "master_bedroom",
              name: "Primary Suite",
              polygon: [
                { x: buildX, y: midY2 },
                { x: midX, y: midY2 },
                { x: midX, y: buildY + buildL },
                { x: buildX, y: buildY + buildL },
              ],
              dimensions: {
                width: midX - buildX,
                length: buildY + buildL - midY2,
                area: (midX - buildX) * (buildY + buildL - midY2),
              },
              floorMaterialId: "mat-floor-oak-herringbone",
              wallMaterialId: "mat-wall-plaster-white",
              color: "#EDE6DC",
            },
            {
              id: `${floorId}-room-bedroom-2`,
              floorId,
              type: "bedroom",
              name: "Guest Suite",
              polygon: [
                { x: midX, y: midY1 },
                { x: buildX + buildW, y: midY1 },
                { x: buildX + buildW, y: midY2 },
                { x: midX, y: midY2 },
              ],
              dimensions: {
                width: buildX + buildW - midX,
                length: midY2 - midY1,
                area: (buildX + buildW - midX) * (midY2 - midY1),
              },
              floorMaterialId: "mat-floor-oak-herringbone",
              wallMaterialId: "mat-wall-plaster-white",
              color: "#F0EAE1",
            },
            {
              id: `${floorId}-room-bath`,
              floorId,
              type: "bathroom",
              name: "En-Suite Bath",
              polygon: [
                { x: midX, y: midY2 },
                { x: buildX + buildW, y: midY2 },
                { x: buildX + buildW, y: buildY + buildL },
                { x: midX, y: buildY + buildL },
              ],
              dimensions: {
                width: buildX + buildW - midX,
                length: buildY + buildL - midY2,
                area: (buildX + buildW - midX) * (buildY + buildL - midY2),
              },
              floorMaterialId: "mat-floor-vitrified-matte",
              wallMaterialId: "mat-wall-travertine",
              color: "#E8ECEB",
            },
          ]
        : [
            {
              id: `${floorId}-room-upper-master`,
              floorId,
              type: "master_bedroom",
              name: `${meta.name} Master Lounge`,
              polygon: [
                { x: buildX, y: buildY },
                { x: midX, y: buildY },
                { x: midX, y: midY2 },
                { x: buildX, y: midY2 },
              ],
              dimensions: {
                width: midX - buildX,
                length: midY2 - buildY,
                area: (midX - buildX) * (midY2 - buildY),
              },
              floorMaterialId: "mat-floor-oak-herringbone",
              wallMaterialId: "mat-wall-plaster-white",
              color: "#EFE9DF",
            },
            {
              id: `${floorId}-room-study`,
              floorId,
              type: "study_room",
              name: "Architectural Atelier & Study",
              polygon: [
                { x: midX, y: buildY },
                { x: buildX + buildW, y: buildY },
                { x: buildX + buildW, y: midY2 },
                { x: midX, y: midY2 },
              ],
              dimensions: {
                width: buildX + buildW - midX,
                length: midY2 - buildY,
                area: (buildX + buildW - midX) * (midY2 - buildY),
              },
              floorMaterialId: "mat-floor-oak-herringbone",
              wallMaterialId: "mat-wall-plaster-white",
              color: "#F3EFE8",
            },
            {
              id: `${floorId}-room-balcony`,
              floorId,
              type: "balcony",
              name: "Cantilevered Terrace",
              polygon: [
                { x: buildX, y: midY2 },
                { x: buildX + buildW, y: midY2 },
                { x: buildX + buildW, y: buildY + buildL },
                { x: buildX, y: buildY + buildL },
              ],
              dimensions: {
                width: buildW,
                length: buildY + buildL - midY2,
                area: buildW * (buildY + buildL - midY2),
              },
              floorMaterialId: "mat-wall-travertine",
              wallMaterialId: "mat-wall-travertine",
              color: "#EBF0EC",
            },
          ];

    const walls: Floor["walls"] = [
      {
        id: `${floorId}-wall-n`,
        floorId,
        startPoint: { x: buildX, y: buildY },
        endPoint: { x: buildX + buildW, y: buildY },
        height: ceilingHeightFt,
        thickness: 0.75,
        materialId: "mat-wall-plaster-white",
        isExterior: true,
        isStructural: true,
      },
      {
        id: `${floorId}-wall-e`,
        floorId,
        startPoint: { x: buildX + buildW, y: buildY },
        endPoint: { x: buildX + buildW, y: buildY + buildL },
        height: ceilingHeightFt,
        thickness: 0.75,
        materialId: "mat-wall-plaster-white",
        isExterior: true,
        isStructural: true,
      },
      {
        id: `${floorId}-wall-s`,
        floorId,
        startPoint: { x: buildX + buildW, y: buildY + buildL },
        endPoint: { x: buildX, y: buildY + buildL },
        height: ceilingHeightFt,
        thickness: 0.75,
        materialId: "mat-wall-plaster-white",
        isExterior: true,
        isStructural: true,
      },
      {
        id: `${floorId}-wall-w`,
        floorId,
        startPoint: { x: buildX, y: buildY + buildL },
        endPoint: { x: buildX, y: buildY },
        height: ceilingHeightFt,
        thickness: 0.75,
        materialId: "mat-wall-plaster-white",
        isExterior: true,
        isStructural: true,
      },
      {
        id: `${floorId}-wall-spine`,
        floorId,
        startPoint: { x: midX, y: buildY },
        endPoint: { x: midX, y: buildY + buildL },
        height: ceilingHeightFt,
        thickness: 0.5,
        materialId: "mat-wall-plaster-white",
        isExterior: false,
        isStructural: true,
      },
    ];

    return {
      id: floorId,
      name: meta.name,
      type,
      levelIndex: meta.levelIndex,
      elevation,
      floorHeight: 0.5,
      ceilingHeight: ceilingHeightFt,
      visible: true,
      locked: false,
      rooms,
      walls,
      openings: [
        {
          id: `${floorId}-open-main`,
          floorId,
          wallId: `${floorId}-wall-n`,
          type: "double_door",
          name: "Main Entrance Portal",
          position: 0.28,
          offsetFromStart: Math.round(buildW * 0.28),
          width: 5,
          height: 8,
          sillHeight: 0,
          materialId: "mat-floor-oak-herringbone",
          swingDirection: "inward",
        },
        {
          id: `${floorId}-open-win-1`,
          floorId,
          wallId: `${floorId}-wall-w`,
          type: "french_window",
          name: "Full-Height Picture Window",
          position: 0.35,
          offsetFromStart: Math.round(buildL * 0.35),
          width: 6,
          height: 7,
          sillHeight: 1.5,
          materialId: "mat-glass-low-e",
        },
      ],
      objects: [],
    };
  });
}

export const STARTER_HOME_PROJECTS: BuildingProject[] = [
  {
    id: "proj-aurelia-pavilion",
    ownerId: "workspace-default",
    name: "The Aurelia Courtyard Residence",
    description:
      "Contemporary two-story limestone & timber pavilion featuring a double-height living gallery, 4 bedrooms, and wrap-around setbacks.",
    location: "Indiranagar, Bangalore",
    plot: {
      shape: "rectangular",
      width: 50,
      length: 80,
      vertices: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 80 },
        { x: 0, y: 80 },
      ],
      orientation: 0,
      northDirection: "N",
      roadFacing: "north",
      setbacks: { front: 8, back: 6, left: 5, right: 5 },
      gridSize: 1,
      showGrid: true,
      snapToGrid: true,
      snapToWall: true,
    },
    floors: createFloorsFromTypes(
      ["ground", "first"],
      10.5,
      50,
      80,
      { front: 8, back: 6, left: 5, right: 5 },
      "modern_villa_3bhk"
    ),
    materials: DEFAULT_ARCHITECTURAL_MATERIALS,
    settings: {
      displayUnit: "ft",
      RoofStyle: "parapet",
      roofHeight: 3.5,
      ambientLightIntensity: 0.75,
      sunAzimuth: 135,
      sunElevation: 52,
      showDimensions: true,
      showRoomLabels: true,
      showSetbacks: true,
      showFurniture2D: true,
      showRoof3D: false,
      sectionCutHeight: 28,
      costConfig: {
        location: "Bangalore",
        cityTier: "Tier 1 (Metro)",
        finishQuality: "premium",
        materialQualityMultiplier: 1.15,
        labourRatePerSqFt: 460,
        contingencyPercentage: 5,
        architecturalFeePercentage: 4,
        otherExpenses: 150000,
        currency: "INR",
      },
    },
    version: 1,
    createdAt: "2026-10-14T10:30:00.000Z",
    updatedAt: "2026-11-08T16:45:00.000Z",
  },
  {
    id: "proj-solstice-atelier",
    ownerId: "workspace-default",
    name: "Villa Solstice — 3-Story Modernist Estate",
    description:
      "Three-level architectural villa with subterranean basement lounge, cantilevered upper study terrace, and Vastu-aligned east road frontage.",
    location: "Jubilee Hills, Hyderabad",
    plot: {
      shape: "rectangular",
      width: 60,
      length: 90,
      vertices: [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 60, y: 90 },
        { x: 0, y: 90 },
      ],
      orientation: 90,
      northDirection: "N",
      roadFacing: "east",
      setbacks: { front: 10, back: 8, left: 6, right: 6 },
      gridSize: 1,
      showGrid: true,
      snapToGrid: true,
      snapToWall: true,
    },
    floors: createFloorsFromTypes(
      ["basement", "ground", "first"],
      11,
      60,
      90,
      { front: 10, back: 8, left: 6, right: 6 },
      "executive_duplex_4bhk"
    ),
    materials: DEFAULT_ARCHITECTURAL_MATERIALS,
    settings: {
      displayUnit: "ft",
      RoofStyle: "flat",
      roofHeight: 3,
      ambientLightIntensity: 0.8,
      sunAzimuth: 120,
      sunElevation: 48,
      showDimensions: true,
      showRoomLabels: true,
      showSetbacks: true,
      showFurniture2D: true,
      showRoof3D: false,
      sectionCutHeight: 35,
      costConfig: {
        location: "Hyderabad",
        cityTier: "Tier 1 (Metro)",
        finishQuality: "premium",
        materialQualityMultiplier: 1.2,
        labourRatePerSqFt: 440,
        contingencyPercentage: 5,
        architecturalFeePercentage: 5,
        otherExpenses: 200000,
        currency: "INR",
      },
    },
    version: 1,
    createdAt: "2026-10-22T09:15:00.000Z",
    updatedAt: "2026-11-09T11:20:00.000Z",
  },
  {
    id: "proj-verandah-bungalow",
    ownerId: "workspace-default",
    name: "Serene Verandah Single-Level Residence",
    description:
      "Thoughtfully proportioned single-floor courtyard bungalow crafted for effortless indoor-outdoor living and cross-ventilation.",
    location: "Koregaon Park, Pune",
    plot: {
      shape: "rectangular",
      width: 40,
      length: 60,
      vertices: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 60 },
        { x: 0, y: 60 },
      ],
      orientation: 0,
      northDirection: "N",
      roadFacing: "south",
      setbacks: { front: 6, back: 5, left: 4, right: 4 },
      gridSize: 1,
      showGrid: true,
      snapToGrid: true,
      snapToWall: true,
    },
    floors: createFloorsFromTypes(
      ["ground"],
      10,
      40,
      60,
      { front: 6, back: 5, left: 4, right: 4 },
      "compact_courtyard_2bhk"
    ),
    materials: DEFAULT_ARCHITECTURAL_MATERIALS,
    settings: {
      displayUnit: "ft",
      RoofStyle: "hip",
      roofHeight: 5,
      ambientLightIntensity: 0.75,
      sunAzimuth: 150,
      sunElevation: 55,
      showDimensions: true,
      showRoomLabels: true,
      showSetbacks: true,
      showFurniture2D: true,
      showRoof3D: false,
      sectionCutHeight: 18,
      costConfig: {
        location: "Pune",
        cityTier: "Tier 1 (Metro)",
        finishQuality: "standard",
        materialQualityMultiplier: 1.0,
        labourRatePerSqFt: 390,
        contingencyPercentage: 5,
        architecturalFeePercentage: 3.5,
        otherExpenses: 90000,
        currency: "INR",
      },
    },
    version: 1,
    createdAt: "2026-10-28T14:00:00.000Z",
    updatedAt: "2026-11-06T18:10:00.000Z",
  },
];

export function calculateProjectMetrics(project: BuildingProject): {
  plotAreaSqFt: number;
  singleFloorFootprintSqFt: number;
  totalBuiltUpAreaSqFt: number;
  totalRoomsCount: number;
  totalWallsCount: number;
  floorCount: number;
} {
  const plotAreaSqFt = Math.round(project.plot.width * project.plot.length);
  const buildableW = Math.max(
    0,
    project.plot.width - project.plot.setbacks.left - project.plot.setbacks.right
  );
  const buildableL = Math.max(
    0,
    project.plot.length - project.plot.setbacks.front - project.plot.setbacks.back
  );
  const defaultFootprint = Math.round(buildableW * buildableL);

  let totalBuiltUpAreaSqFt = 0;
  let totalRoomsCount = 0;
  let totalWallsCount = 0;

  for (const floor of project.floors) {
    totalRoomsCount += floor.rooms.length;
    totalWallsCount += floor.walls.length;

    const roomsSum = floor.rooms.reduce((acc, r) => acc + (r.dimensions?.area || 0), 0);
    if (roomsSum > 0) {
      totalBuiltUpAreaSqFt += Math.round(roomsSum);
    } else {
      totalBuiltUpAreaSqFt += defaultFootprint;
    }
  }

  return {
    plotAreaSqFt,
    singleFloorFootprintSqFt: defaultFootprint,
    totalBuiltUpAreaSqFt,
    totalRoomsCount,
    totalWallsCount,
    floorCount: project.floors.length,
  };
}

export function formatDimension(valueFt: number, unit: UnitSystem): string {
  if (unit === "m") {
    return `${(valueFt * 0.3048).toFixed(2)} m`;
  }
  const wholeFeet = Math.floor(valueFt);
  const inches = Math.round((valueFt - wholeFeet) * 12);
  if (inches === 0 || inches === 12) {
    return `${wholeFeet + (inches === 12 ? 1 : 0)}' 0"`;
  }
  return `${wholeFeet}' ${inches}"`;
}

export function formatArea(areaSqFt: number, unit: UnitSystem): string {
  if (unit === "m") {
    const sqm = areaSqFt * 0.092903;
    return `${sqm.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq m`;
  }
  return `${Math.round(areaSqFt).toLocaleString()} sq ft`;
}

export function loadHomeStudioProjects(): BuildingProject[] {
  if (typeof window === "undefined") {
    return STARTER_HOME_PROJECTS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(STARTER_HOME_PROJECTS));
      return STARTER_HOME_PROJECTS;
    }
    const parsed = JSON.parse(raw) as BuildingProject[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return STARTER_HOME_PROJECTS;
    }
    return parsed;
  } catch (err) {
    console.warn("Unable to read Home Studio projects from storage, using defaults.", err);
    return STARTER_HOME_PROJECTS;
  }
}

export function saveHomeStudioProjects(projects: BuildingProject[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error("Failed to save Home Studio projects:", err);
  }
}

export function getHomeStudioProjectById(projectId: string): BuildingProject | null {
  const projects = loadHomeStudioProjects();
  return projects.find((p) => p.id === projectId) || null;
}

export function createNewHomeStudioProject(input: CreateProjectInput): BuildingProject {
  const projects = loadHomeStudioProjects();
  const now = new Date().toISOString();
  const id = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const setbacks = {
    front: Math.max(0, input.frontSetbackFt),
    back: Math.max(0, input.backSetbackFt),
    left: Math.max(0, input.leftSetbackFt),
    right: Math.max(0, input.rightSetbackFt),
  };

  const floors = createFloorsFromTypes(
    input.initialFloors.length > 0 ? input.initialFloors : ["ground"],
    input.ceilingHeightFt || 10,
    input.plotWidthFt,
    input.plotLengthFt,
    setbacks,
    input.templateId
  );

  const vertices =
    input.plotShape === "polygon"
      ? [
          { x: 0, y: 0 },
          { x: input.plotWidthFt, y: 0 },
          { x: input.plotWidthFt, y: Math.round(input.plotLengthFt * 0.75) },
          { x: Math.round(input.plotWidthFt * 0.82), y: input.plotLengthFt },
          { x: 0, y: input.plotLengthFt },
        ]
      : [
          { x: 0, y: 0 },
          { x: input.plotWidthFt, y: 0 },
          { x: input.plotWidthFt, y: input.plotLengthFt },
          { x: 0, y: input.plotLengthFt },
        ];

  const newProject: BuildingProject = {
    id,
    ownerId: "workspace-default",
    name: input.name.trim() || "Untitled Architectural Residence",
    description:
      input.description.trim() ||
      "Custom architectural residence configured in HMX Home Studio.",
    location: input.location.trim() || "Bangalore, India",
    plot: {
      shape: input.plotShape,
      width: input.plotWidthFt,
      length: input.plotLengthFt,
      vertices,
      orientation: 0,
      northDirection: input.northDirection,
      roadFacing: input.roadFacing,
      setbacks,
      gridSize: 1,
      showGrid: true,
      snapToGrid: true,
      snapToWall: true,
    },
    floors,
    materials: DEFAULT_ARCHITECTURAL_MATERIALS,
    settings: {
      displayUnit: input.displayUnit,
      RoofStyle: "parapet",
      roofHeight: 3.5,
      ambientLightIntensity: 0.75,
      sunAzimuth: 135,
      sunElevation: 50,
      showDimensions: true,
      showRoomLabels: true,
      showSetbacks: true,
      showFurniture2D: true,
      showRoof3D: false,
      sectionCutHeight: 28,
      costConfig: {
        location: input.location.split(",")[0]?.trim() || "Bangalore",
        cityTier: "Tier 1 (Metro)",
        finishQuality: "standard",
        materialQualityMultiplier: 1.0,
        labourRatePerSqFt: 420,
        contingencyPercentage: 5,
        architecturalFeePercentage: 4,
        otherExpenses: 100000,
        currency: "INR",
      },
    },
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newProject, ...projects];
  saveHomeStudioProjects(updated);
  return newProject;
}

export function duplicateHomeStudioProject(projectId: string): BuildingProject | null {
  const projects = loadHomeStudioProjects();
  const target = projects.find((p) => p.id === projectId);
  if (!target) return null;

  const now = new Date().toISOString();
  const duplicate: BuildingProject = {
    ...JSON.parse(JSON.stringify(target)),
    id: `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    name: `${target.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [duplicate, ...projects];
  saveHomeStudioProjects(updated);
  return duplicate;
}

export function deleteHomeStudioProject(projectId: string): BuildingProject[] {
  const projects = loadHomeStudioProjects();
  const updated = projects.filter((p) => p.id !== projectId);
  saveHomeStudioProjects(updated);
  return updated;
}

