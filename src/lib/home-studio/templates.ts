import { BuildingProject, Floor, FloorType, Room, Wall, Opening } from "../../types/homeStudio";
import { DEFAULT_ARCHITECTURAL_MATERIALS } from "../../data/homeStudioProjects";
import { CURRENT_PROJECT_SCHEMA_VERSION, validateBuildingProject } from "./schemas";

export type StarterTemplateKey =
  | "2bhk"
  | "3bhk"
  | "4bhk"
  | "single_floor_villa"
  | "two_floor_villa";

export interface ArchitecturalStarterTemplate {
  key: StarterTemplateKey;
  title: string;
  subtitle: string;
  bedroomsCount: number;
  bathroomsCount: number;
  plotWidthFt: number;
  plotLengthFt: number;
  floors: FloorType[];
  buildProject: (customName?: string, customLocation?: string) => BuildingProject;
}

function makeRectangularRoom(
  id: string,
  floorId: string,
  type: Room["type"],
  name: string,
  x: number,
  y: number,
  w: number,
  l: number,
  color: string,
  floorMaterialId = "mat-floor-italian-marble"
): Room {
  return {
    id,
    floorId,
    type,
    name,
    polygon: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + l },
      { x, y: y + l },
    ],
    dimensions: {
      width: w,
      length: l,
      area: Math.round(w * l * 100) / 100,
    },
    floorMaterialId,
    wallMaterialId: "mat-wall-plaster-white",
    color,
  };
}

function makePerimeterAndSpineWalls(
  floorId: string,
  x: number,
  y: number,
  w: number,
  l: number,
  spineX: number,
  height: number
): { walls: Wall[]; openings: Opening[] } {
  const walls: Wall[] = [
    {
      id: `${floorId}-wall-north`,
      floorId,
      startPoint: { x, y },
      endPoint: { x: x + w, y },
      height,
      thickness: 0.75,
      materialId: "mat-wall-plaster-white",
      isExterior: true,
      isStructural: true,
    },
    {
      id: `${floorId}-wall-east`,
      floorId,
      startPoint: { x: x + w, y },
      endPoint: { x: x + w, y: y + l },
      height,
      thickness: 0.75,
      materialId: "mat-wall-plaster-white",
      isExterior: true,
      isStructural: true,
    },
    {
      id: `${floorId}-wall-south`,
      floorId,
      startPoint: { x: x + w, y: y + l },
      endPoint: { x, y: y + l },
      height,
      thickness: 0.75,
      materialId: "mat-wall-plaster-white",
      isExterior: true,
      isStructural: true,
    },
    {
      id: `${floorId}-wall-west`,
      floorId,
      startPoint: { x, y: y + l },
      endPoint: { x, y },
      height,
      thickness: 0.75,
      materialId: "mat-wall-plaster-white",
      isExterior: true,
      isStructural: true,
    },
    {
      id: `${floorId}-wall-spine`,
      floorId,
      startPoint: { x: spineX, y },
      endPoint: { x: spineX, y: y + l },
      height,
      thickness: 0.5,
      materialId: "mat-wall-plaster-white",
      isExterior: false,
      isStructural: true,
    },
  ];

  const openings: Opening[] = [
    {
      id: `${floorId}-door-main`,
      floorId,
      wallId: `${floorId}-wall-north`,
      type: "double_door",
      name: "Main Entrance Door",
      position: 0.28,
      offsetFromStart: Math.round(w * 0.28 * 10) / 10,
      width: 4.5,
      height: 7.5,
      sillHeight: 0,
      materialId: "mat-floor-oak-herringbone",
      swingDirection: "inward",
    },
    {
      id: `${floorId}-win-west`,
      floorId,
      wallId: `${floorId}-wall-west`,
      type: "french_window",
      name: "Living Gallery Window",
      position: 0.35,
      offsetFromStart: Math.round(l * 0.35 * 10) / 10,
      width: 6,
      height: 6.5,
      sillHeight: 1.5,
      materialId: "mat-glass-low-e",
    },
    {
      id: `${floorId}-win-east`,
      floorId,
      wallId: `${floorId}-wall-east`,
      type: "window",
      name: "East Daylight Casement",
      position: 0.5,
      offsetFromStart: Math.round(l * 0.5 * 10) / 10,
      width: 5,
      height: 4.5,
      sillHeight: 3,
      materialId: "mat-glass-low-e",
    },
  ];

  return { walls, openings };
}

function buildValidatedTemplateProject(
  key: StarterTemplateKey,
  defaultName: string,
  description: string,
  plotW: number,
  plotL: number,
  setbacks: { front: number; back: number; left: number; right: number },
  floorsFactory: (bx: number, by: number, bw: number, bl: number) => Floor[],
  customName?: string,
  customLocation?: string
): BuildingProject {
  const now = new Date().toISOString();
  const bx = setbacks.left;
  const by = setbacks.front;
  const bw = plotW - setbacks.left - setbacks.right;
  const bl = plotL - setbacks.front - setbacks.back;

  const project: BuildingProject = {
    id: `proj-${key}-${Date.now().toString(36)}`,
    ownerId: "workspace-default",
    name: customName || defaultName,
    description,
    location: customLocation || "Indiranagar, Bangalore",
    plot: {
      shape: "rectangular",
      width: plotW,
      length: plotL,
      vertices: [
        { x: 0, y: 0 },
        { x: plotW, y: 0 },
        { x: plotW, y: plotL },
        { x: 0, y: plotL },
      ],
      orientation: 0,
      northDirection: "N",
      roadFacing: "north",
      setbacks,
      gridSize: 1,
      showGrid: true,
      snapToGrid: true,
      snapToWall: true,
    },
    floors: floorsFactory(bx, by, bw, bl),
    materials: DEFAULT_ARCHITECTURAL_MATERIALS,
    settings: {
      displayUnit: "ft",
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
        location: "Bangalore",
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
    version: CURRENT_PROJECT_SCHEMA_VERSION,
    revisionHistory: [
      {
        version: 1,
        schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
        timestamp: now,
        summary: `Initialized from ${key} architectural starter template`,
        authorId: "workspace-default",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const validation = validateBuildingProject(project);
  if (!validation.valid || !validation.project) {
    throw new Error(
      `Template "${key}" failed validation: ${validation.errors.join("; ")}`
    );
  }
  return validation.project;
}

export const ARCHITECTURAL_STARTER_TEMPLATES: Record<
  StarterTemplateKey,
  ArchitecturalStarterTemplate
> = {
  "2bhk": {
    key: "2bhk",
    title: "2BHK Courtyard Residence",
    subtitle: "40' × 60' Plot • Ground Floor • 1,568 sq ft",
    bedroomsCount: 2,
    bathroomsCount: 2,
    plotWidthFt: 40,
    plotLengthFt: 60,
    floors: ["ground"],
    buildProject: (name, loc) =>
      buildValidatedTemplateProject(
        "2bhk",
        "2BHK Courtyard Residence",
        "Efficient 2-bedroom single-level architectural layout with cross-ventilated living and dining core.",
        40,
        60,
        { front: 6, back: 5, left: 4, right: 4 },
        (bx, by, bw, bl) => {
          const fId = "floor-ground-1";
          const midX = bx + Math.round(bw * 0.56);
          const y1 = by + Math.round(bl * 0.45);
          const y2 = by + Math.round(bl * 0.76);
          const { walls, openings } = makePerimeterAndSpineWalls(
            fId,
            bx,
            by,
            bw,
            bl,
            midX,
            10
          );

          return [
            {
              id: fId,
              name: "Ground Floor",
              type: "ground",
              levelIndex: 0,
              elevation: 0,
              floorHeight: 0.5,
              ceilingHeight: 10,
              visible: true,
              locked: false,
              rooms: [
                makeRectangularRoom(
                  `${fId}-living`,
                  fId,
                  "living_room",
                  "Living & Dining Lounge",
                  bx,
                  by,
                  midX - bx,
                  y1 - by,
                  "#F5F2EB"
                ),
                makeRectangularRoom(
                  `${fId}-kitchen`,
                  fId,
                  "kitchen",
                  "Modular Kitchen",
                  midX,
                  by,
                  bx + bw - midX,
                  y1 - by,
                  "#EFECE6",
                  "mat-floor-vitrified-matte"
                ),
                makeRectangularRoom(
                  `${fId}-master`,
                  fId,
                  "master_bedroom",
                  "Master Bedroom",
                  bx,
                  y1,
                  midX - bx,
                  by + bl - y1,
                  "#EDE6DC",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${fId}-bed2`,
                  fId,
                  "bedroom",
                  "Guest Bedroom",
                  midX,
                  y1,
                  bx + bw - midX,
                  y2 - y1,
                  "#F0EAE1",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${fId}-bath1`,
                  fId,
                  "bathroom",
                  "Common & En-Suite Bath",
                  midX,
                  y2,
                  bx + bw - midX,
                  by + bl - y2,
                  "#E8ECEB",
                  "mat-floor-vitrified-matte"
                ),
              ],
              walls,
              openings,
              objects: [],
            },
          ];
        },
        name,
        loc
      ),
  },

  "3bhk": {
    key: "3bhk",
    title: "3BHK Contemporary Pavilion",
    subtitle: "50' × 70' Plot • Ground Floor • 2,240 sq ft",
    bedroomsCount: 3,
    bathroomsCount: 3,
    plotWidthFt: 50,
    plotLengthFt: 70,
    floors: ["ground"],
    buildProject: (name, loc) =>
      buildValidatedTemplateProject(
        "3bhk",
        "3BHK Contemporary Pavilion",
        "Spacious 3-bedroom residence with formal living room, dining hall, modular kitchen, and 3 suites.",
        50,
        70,
        { front: 7, back: 6, left: 5, right: 5 },
        (bx, by, bw, bl) => {
          const fId = "floor-ground-1";
          const midX = bx + Math.round(bw * 0.55);
          const y1 = by + Math.round(bl * 0.38);
          const y2 = by + Math.round(bl * 0.68);
          const { walls, openings } = makePerimeterAndSpineWalls(
            fId,
            bx,
            by,
            bw,
            bl,
            midX,
            10.5
          );

          return [
            {
              id: fId,
              name: "Ground Floor",
              type: "ground",
              levelIndex: 0,
              elevation: 0,
              floorHeight: 0.5,
              ceilingHeight: 10.5,
              visible: true,
              locked: false,
              rooms: [
                makeRectangularRoom(
                  `${fId}-living`,
                  fId,
                  "living_room",
                  "Formal Living Hall",
                  bx,
                  by,
                  midX - bx,
                  y1 - by,
                  "#F5F2EB"
                ),
                makeRectangularRoom(
                  `${fId}-kitchen`,
                  fId,
                  "kitchen",
                  "Chef's Kitchen & Utility",
                  midX,
                  by,
                  bx + bw - midX,
                  y1 - by,
                  "#EFECE6",
                  "mat-floor-vitrified-matte"
                ),
                makeRectangularRoom(
                  `${fId}-master`,
                  fId,
                  "master_bedroom",
                  "Primary Master Suite",
                  bx,
                  y1,
                  midX - bx,
                  y2 - y1,
                  "#EDE6DC",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${fId}-bed2`,
                  fId,
                  "bedroom",
                  "Bedroom 2",
                  midX,
                  y1,
                  bx + bw - midX,
                  y2 - y1,
                  "#F0EAE1",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${fId}-bed3`,
                  fId,
                  "bedroom",
                  "Bedroom 3",
                  bx,
                  y2,
                  midX - bx,
                  by + bl - y2,
                  "#EFE9DF",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${fId}-bath`,
                  fId,
                  "bathroom",
                  "Bathrooms & Dress",
                  midX,
                  y2,
                  bx + bw - midX,
                  by + bl - y2,
                  "#E8ECEB",
                  "mat-floor-vitrified-matte"
                ),
              ],
              walls,
              openings,
              objects: [],
            },
          ];
        },
        name,
        loc
      ),
  },

  "4bhk": {
    key: "4bhk",
    title: "4BHK Executive Duplex Residence",
    subtitle: "50' × 80' Plot • Ground + First Floor • 5,292 sq ft",
    bedroomsCount: 4,
    bathroomsCount: 4,
    plotWidthFt: 50,
    plotLengthFt: 80,
    floors: ["ground", "first"],
    buildProject: (name, loc) =>
      buildValidatedTemplateProject(
        "4bhk",
        "4BHK Executive Duplex Residence",
        "Two-level 4-bedroom luxury residence featuring ground-level entertaining spaces and upper private suites.",
        50,
        80,
        { front: 8, back: 6, left: 5, right: 5 },
        (bx, by, bw, bl) => {
          const midX = bx + Math.round(bw * 0.55);
          const y1 = by + Math.round(bl * 0.44);
          const y2 = by + Math.round(bl * 0.74);

          const gfId = "floor-ground-1";
          const ffId = "floor-first-2";

          const gStruct = makePerimeterAndSpineWalls(gfId, bx, by, bw, bl, midX, 10.5);
          const fStruct = makePerimeterAndSpineWalls(ffId, bx, by, bw, bl, midX, 10.5);

          return [
            {
              id: gfId,
              name: "Ground Floor",
              type: "ground",
              levelIndex: 0,
              elevation: 0,
              floorHeight: 0.5,
              ceilingHeight: 10.5,
              visible: true,
              locked: false,
              rooms: [
                makeRectangularRoom(
                  `${gfId}-living`,
                  gfId,
                  "living_room",
                  "Grand Living & Foyer",
                  bx,
                  by,
                  midX - bx,
                  y1 - by,
                  "#F5F2EB"
                ),
                makeRectangularRoom(
                  `${gfId}-kitchen`,
                  gfId,
                  "kitchen",
                  "Island Kitchen & Pantry",
                  midX,
                  by,
                  bx + bw - midX,
                  y1 - by,
                  "#EFECE6"
                ),
                makeRectangularRoom(
                  `${gfId}-dining`,
                  gfId,
                  "dining_room",
                  "Formal Dining Gallery",
                  bx,
                  y1,
                  midX - bx,
                  y2 - y1,
                  "#F3EFE6"
                ),
                makeRectangularRoom(
                  `${gfId}-bed1`,
                  gfId,
                  "bedroom",
                  "Ground Guest Suite (Bed 1)",
                  midX,
                  y1,
                  bx + bw - midX,
                  y2 - y1,
                  "#F0EAE1",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${gfId}-bed2`,
                  gfId,
                  "master_bedroom",
                  "Ground Primary Suite (Bed 2)",
                  bx,
                  y2,
                  midX - bx,
                  by + bl - y2,
                  "#EDE6DC",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${gfId}-bath`,
                  gfId,
                  "bathroom",
                  "Ground En-Suite Baths",
                  midX,
                  y2,
                  bx + bw - midX,
                  by + bl - y2,
                  "#E8ECEB"
                ),
              ],
              walls: gStruct.walls,
              openings: gStruct.openings,
              objects: [],
            },
            {
              id: ffId,
              name: "First Floor",
              type: "first",
              levelIndex: 1,
              elevation: 11,
              floorHeight: 0.5,
              ceilingHeight: 10.5,
              visible: true,
              locked: false,
              rooms: [
                makeRectangularRoom(
                  `${ffId}-bed3`,
                  ffId,
                  "master_bedroom",
                  "Upper Master Suite (Bed 3)",
                  bx,
                  by,
                  midX - bx,
                  y1 - by,
                  "#EDE6DC",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${ffId}-bed4`,
                  ffId,
                  "bedroom",
                  "Upper Suite (Bed 4)",
                  midX,
                  by,
                  bx + bw - midX,
                  y1 - by,
                  "#F0EAE1",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${ffId}-study`,
                  ffId,
                  "study_room",
                  "Family Lounge & Study",
                  bx,
                  y1,
                  midX - bx,
                  y2 - y1,
                  "#F3EFE8"
                ),
                makeRectangularRoom(
                  `${ffId}-bath2`,
                  ffId,
                  "bathroom",
                  "Upper Spa Bathroom",
                  midX,
                  y1,
                  bx + bw - midX,
                  y2 - y1,
                  "#E8ECEB"
                ),
                makeRectangularRoom(
                  `${ffId}-terrace`,
                  ffId,
                  "balcony",
                  "Covered Sky Terrace",
                  bx,
                  y2,
                  bw,
                  by + bl - y2,
                  "#EBF0EC"
                ),
              ],
              walls: fStruct.walls,
              openings: fStruct.openings,
              objects: [],
            },
          ];
        },
        name,
        loc
      ),
  },

  single_floor_villa: {
    key: "single_floor_villa",
    title: "Single-Floor Luxury Courtyard Villa",
    subtitle: "60' × 80' Plot • Single Level • 3,120 sq ft",
    bedroomsCount: 3,
    bathroomsCount: 3,
    plotWidthFt: 60,
    plotLengthFt: 80,
    floors: ["ground"],
    buildProject: (name, loc) =>
      buildValidatedTemplateProject(
        "single_floor_villa",
        "Single-Floor Luxury Courtyard Villa",
        "Sprawling single-story luxury villa with garage, verandah balcony, and generous setback gardens.",
        60,
        80,
        { front: 8, back: 7, left: 6, right: 6 },
        (bx, by, bw, bl) => {
          const fId = "floor-ground-1";
          const midX = bx + Math.round(bw * 0.54);
          const y1 = by + Math.round(bl * 0.36);
          const y2 = by + Math.round(bl * 0.7);
          const { walls, openings } = makePerimeterAndSpineWalls(
            fId,
            bx,
            by,
            bw,
            bl,
            midX,
            11
          );

          return [
            {
              id: fId,
              name: "Ground Floor",
              type: "ground",
              levelIndex: 0,
              elevation: 0,
              floorHeight: 0.5,
              ceilingHeight: 11,
              visible: true,
              locked: false,
              rooms: [
                makeRectangularRoom(
                  `${fId}-living`,
                  fId,
                  "living_room",
                  "Pavilion Living Salon",
                  bx,
                  by,
                  midX - bx,
                  y1 - by,
                  "#F5F2EB"
                ),
                makeRectangularRoom(
                  `${fId}-garage`,
                  fId,
                  "garage",
                  "Covered Garage & Foyer",
                  midX,
                  by,
                  bx + bw - midX,
                  y1 - by,
                  "#EAE8E3"
                ),
                makeRectangularRoom(
                  `${fId}-master`,
                  fId,
                  "master_bedroom",
                  "Villa Master Wing",
                  bx,
                  y1,
                  midX - bx,
                  y2 - y1,
                  "#EDE6DC",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${fId}-kitchen`,
                  fId,
                  "kitchen",
                  "Gourmet Kitchen & Dining",
                  midX,
                  y1,
                  bx + bw - midX,
                  y2 - y1,
                  "#EFECE6"
                ),
                makeRectangularRoom(
                  `${fId}-bed2`,
                  fId,
                  "bedroom",
                  "Garden Suite",
                  bx,
                  y2,
                  midX - bx,
                  by + bl - y2,
                  "#F0EAE1",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${fId}-bath`,
                  fId,
                  "bathroom",
                  "Luxury Bath & Utility",
                  midX,
                  y2,
                  bx + bw - midX,
                  by + bl - y2,
                  "#E8ECEB"
                ),
              ],
              walls,
              openings,
              objects: [],
            },
          ];
        },
        name,
        loc
      ),
  },

  two_floor_villa: {
    key: "two_floor_villa",
    title: "Two-Floor Signature Architectural Villa",
    subtitle: "60' × 90' Plot • Ground + First Floor • 7,056 sq ft",
    bedroomsCount: 4,
    bathroomsCount: 4,
    plotWidthFt: 60,
    plotLengthFt: 90,
    floors: ["ground", "first"],
    buildProject: (name, loc) =>
      buildValidatedTemplateProject(
        "two_floor_villa",
        "Two-Floor Signature Architectural Villa",
        "Flagship two-story architectural estate with double-height living pavilion, 4 bedroom suites, garage, and cantilevered terrace.",
        60,
        90,
        { front: 10, back: 8, left: 6, right: 6 },
        (bx, by, bw, bl) => {
          const midX = bx + Math.round(bw * 0.55);
          const y1 = by + Math.round(bl * 0.4);
          const y2 = by + Math.round(bl * 0.72);

          const gfId = "floor-ground-1";
          const ffId = "floor-first-2";
          const gStruct = makePerimeterAndSpineWalls(gfId, bx, by, bw, bl, midX, 11);
          const fStruct = makePerimeterAndSpineWalls(ffId, bx, by, bw, bl, midX, 11);

          return [
            {
              id: gfId,
              name: "Ground Floor",
              type: "ground",
              levelIndex: 0,
              elevation: 0,
              floorHeight: 0.5,
              ceilingHeight: 11,
              visible: true,
              locked: false,
              rooms: [
                makeRectangularRoom(
                  `${gfId}-living`,
                  gfId,
                  "living_room",
                  "Double-Height Great Room",
                  bx,
                  by,
                  midX - bx,
                  y1 - by,
                  "#F5F2EB"
                ),
                makeRectangularRoom(
                  `${gfId}-garage`,
                  gfId,
                  "garage",
                  "Dual Car Garage",
                  midX,
                  by,
                  bx + bw - midX,
                  y1 - by,
                  "#EAE8E3"
                ),
                makeRectangularRoom(
                  `${gfId}-dining`,
                  gfId,
                  "dining_room",
                  "Formal Dining Pavilion",
                  bx,
                  y1,
                  midX - bx,
                  y2 - y1,
                  "#F3EFE6"
                ),
                makeRectangularRoom(
                  `${gfId}-kitchen`,
                  gfId,
                  "kitchen",
                  "Show Kitchen & Scullery",
                  midX,
                  y1,
                  bx + bw - midX,
                  y2 - y1,
                  "#EFECE6"
                ),
                makeRectangularRoom(
                  `${gfId}-guest`,
                  gfId,
                  "bedroom",
                  "Ground Guest Suite",
                  bx,
                  y2,
                  midX - bx,
                  by + bl - y2,
                  "#F0EAE1",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${gfId}-bath`,
                  gfId,
                  "bathroom",
                  "Powder & En-Suite Bath",
                  midX,
                  y2,
                  bx + bw - midX,
                  by + bl - y2,
                  "#E8ECEB"
                ),
              ],
              walls: gStruct.walls,
              openings: gStruct.openings,
              objects: [],
            },
            {
              id: ffId,
              name: "First Floor",
              type: "first",
              levelIndex: 1,
              elevation: 11.5,
              floorHeight: 0.5,
              ceilingHeight: 11,
              visible: true,
              locked: false,
              rooms: [
                makeRectangularRoom(
                  `${ffId}-master`,
                  ffId,
                  "master_bedroom",
                  "Primary Owner's Suite",
                  bx,
                  by,
                  midX - bx,
                  y1 - by,
                  "#EDE6DC",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${ffId}-bed2`,
                  ffId,
                  "bedroom",
                  "Junior Suite East",
                  midX,
                  by,
                  bx + bw - midX,
                  y1 - by,
                  "#F0EAE1",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${ffId}-bed3`,
                  ffId,
                  "bedroom",
                  "Suite West",
                  bx,
                  y1,
                  midX - bx,
                  y2 - y1,
                  "#EFE9DF",
                  "mat-floor-oak-herringbone"
                ),
                makeRectangularRoom(
                  `${ffId}-study`,
                  ffId,
                  "study_room",
                  "Private Library & Study",
                  midX,
                  y1,
                  bx + bw - midX,
                  y2 - y1,
                  "#F3EFE8"
                ),
                makeRectangularRoom(
                  `${ffId}-terrace`,
                  ffId,
                  "balcony",
                  "Panoramic Garden Terrace",
                  bx,
                  y2,
                  bw,
                  by + bl - y2,
                  "#EBF0EC"
                ),
              ],
              walls: fStruct.walls,
              openings: fStruct.openings,
              objects: [],
            },
          ];
        },
        name,
        loc
      ),
  },
};

export function createProjectFromTemplate(
  templateKey: StarterTemplateKey,
  customName?: string,
  customLocation?: string
): BuildingProject {
  const template = ARCHITECTURAL_STARTER_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown starter template: ${templateKey}`);
  }
  return template.buildProject(customName, customLocation);
}
