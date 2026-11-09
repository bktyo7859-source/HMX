export type UnitSystem = "ft" | "m";

export type CardinalDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type RoadSide = "north" | "south" | "east" | "west";

export type FloorType =
  | "basement"
  | "ground"
  | "first"
  | "second"
  | "third"
  | "rooftop"
  | "custom";

export type StaircaseType = "straight" | "l_shaped" | "u_shaped" | "spiral";

export interface StaircaseMetadata {
  stairType: StaircaseType;
  widthFt: number;
  totalRiseFt: number;
  riserCount: number;
  riserHeightInches: number;
  treadDepthInches: number;
  startingFloorId: string;
  destinationFloorId: string;
  landingDepthFt: number;
  headroomClearanceFt: number;
}

export type RoomType =
  | "bedroom"
  | "master_bedroom"
  | "bathroom"
  | "kitchen"
  | "living_room"
  | "dining_room"
  | "study_room"
  | "balcony"
  | "garage"
  | "utility_room"
  | "storage_room"
  | "custom_room";

export type OpeningType =
  | "door"
  | "double_door"
  | "sliding_door"
  | "window"
  | "double_window"
  | "sliding_window"
  | "french_window"
  | "ventilator";

export type FurnitureCategory =
  | "bedroom_furniture"
  | "living_room_furniture"
  | "dining_furniture"
  | "kitchen_furniture"
  | "bathroom_fixtures"
  | "wardrobes_and_cabinets"
  | "office_furniture"
  | "lighting"
  | "electronics"
  | "storage"
  | "outdoor_furniture"
  | "balcony_furniture"
  | "doors"
  | "windows"
  | "decorative"
  | "appliances"
  | "custom_objects"
  | "beds"
  | "sofas"
  | "chairs"
  | "tables"
  | "wardrobes"
  | "kitchen_cabinets"
  | "kitchen_appliances"
  | "toilets"
  | "washbasins"
  | "bathtubs"
  | "shower_units"
  | "lights"
  | "ceiling_fans"
  | "staircases";

export type ArchitecturalMaterialCategory =
  | "wall_paint"
  | "interior_plaster"
  | "exterior_paint"
  | "marble"
  | "granite"
  | "ceramic_tiles"
  | "porcelain_tiles"
  | "wooden_flooring"
  | "laminate"
  | "concrete"
  | "glass"
  | "metal"
  | "fabric"
  | "cabinet_finishes"
  | "ceiling_materials"
  | "wall"
  | "floor"
  | "roof"
  | "wood"
  | "stone";

export type FinishQuality = "economy" | "standard" | "premium";

export interface Point2D {
  x: number; // stored in canonical feet (ft)
  y: number; // stored in canonical feet (ft)
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface SetbackConfig {
  front: number; // ft
  back: number;  // ft
  left: number;  // ft
  right: number; // ft
}

export interface PlotConfig {
  shape: "rectangular" | "polygon";
  width: number;  // ft
  length: number; // ft
  vertices: Point2D[]; // in ft relative to plot origin (0,0)
  orientation: number; // degrees 0-360
  northDirection: CardinalDirection;
  roadFacing: RoadSide;
  setbacks: SetbackConfig;
  gridSize: number; // ft (e.g. 1 ft or 0.5 ft)
  showGrid: boolean;
  snapToGrid: boolean;
  snapToWall: boolean;
}

export interface Wall {
  id: string;
  floorId: string;
  startPoint: Point2D; // ft
  endPoint: Point2D;   // ft
  height: number;      // ft
  thickness: number;   // ft (e.g. 0.75 ft = 9 inches exterior, 0.375 ft = 4.5 inches interior)
  materialId: string;
  isExterior?: boolean;
  isStructural?: boolean;
}

export interface Room {
  id: string;
  floorId: string;
  type: RoomType;
  name: string;
  polygon: Point2D[]; // vertices in ft (minimum 3 points, typically 4 for rectangular room)
  dimensions: {
    width: number;  // ft
    length: number; // ft
    area: number;   // sq ft
  };
  floorMaterialId: string;
  wallMaterialId: string;
  ceilingMaterialId?: string;
  color: string;
}

export interface Opening {
  id: string;
  floorId: string;
  wallId: string;
  type: OpeningType;
  name: string;
  position: number; // normalized distance 0.0 to 1.0 along wall from startPoint to endPoint
  offsetFromStart: number; // ft from startPoint
  width: number;    // ft
  height: number;   // ft
  sillHeight: number; // ft from floor (0 for doors, e.g. 3 ft for windows)
  materialId: string;
  swingDirection?: "left" | "right" | "inward" | "outward";
}

export interface FurnitureItem {
  id: string;
  floorId: string;
  assetId: string;
  name: string;
  category: FurnitureCategory;
  position: Point3D; // x, z on floor plane in ft; y elevation offset in ft
  rotation: number;  // degrees (0 - 360) around Y axis
  dimensions: {
    width: number;   // ft (X)
    depth: number;   // ft (Z)
    height: number;  // ft (Y)
  };
  scale: Point3D;
  materialId: string;
  color: string;
  isStructural?: boolean; // true for staircases/columns aligned vertically
  allowOutsideRoom?: boolean; // explicit override for outdoor/terrace placement
  stairMetadata?: StaircaseMetadata;
}

export interface Floor {
  id: string;
  name: string;
  type: FloorType;
  levelIndex: number; // -1 for basement, 0 for ground, 1 for first, etc.
  elevation: number;  // ft from ground datum
  floorHeight: number; // slab thickness ft (default 0.5 ft)
  ceilingHeight: number; // clear floor-to-ceiling height in ft (default 10 ft)
  visible: boolean;
  locked: boolean;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  objects: FurnitureItem[];
}

export interface ArchitecturalMaterial {
  id: string;
  name: string;
  category: ArchitecturalMaterialCategory;
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  pattern?: "solid" | "wood" | "tile" | "marble" | "brick" | "concrete" | "glass";
  textureReference?: string;
  normalMapUrl?: string;
  bumpMapUrl?: string;
  repeatScale?: number;
  finishQuality?: FinishQuality;
  previewThumbnail?: string;
  unitCostPerSqFt: number; // INR
}

export interface CostConfiguration {
  location: string;
  cityTier: "Tier 1 (Metro)" | "Tier 2 (Urban)" | "Tier 3 (Suburban)";
  finishQuality: FinishQuality;
  materialQualityMultiplier: number; // 0.85 to 1.35
  labourRatePerSqFt: number; // INR
  contingencyPercentage: number; // 0 to 25%
  architecturalFeePercentage: number; // 0 to 15%
  otherExpenses: number; // INR flat
  currency: "INR" | "USD";
  customRates?: Record<string, number>;
}

export type ProjectSettings = BuildingSettings;

export interface BuildingSettings {
  displayUnit: UnitSystem;
  RoofStyle: "flat" | "gable" | "hip" | "parapet";
  roofHeight: number; // ft
  ambientLightIntensity: number;
  daylightIntensity?: number;
  timeOfDayHours?: number; // 6 to 22 (e.g. 10.5 = 10:30 AM, 17.5 = Golden Hour, 20 = Evening Interior)
  interiorLightsEnabled?: boolean;
  sunAzimuth: number;
  sunElevation: number;
  showDimensions: boolean;
  showRoomLabels: boolean;
  showSetbacks: boolean;
  showFurniture2D: boolean;
  showRoof3D: boolean;
  sectionCutHeight: number; // ft (for 3D section cut mode)
  costConfig: CostConfiguration;
}

export interface ProjectVersion {
  version: number;
  schemaVersion: number;
  timestamp: string;
  summary: string;
  authorId: string;
}

export interface BuildingProject {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  location: string;
  plot: PlotConfig;
  floors: Floor[];
  materials: ArchitecturalMaterial[];
  settings: BuildingSettings;
  version: number;
  revisionHistory?: ProjectVersion[];
  thumbnailDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FurnitureCatalogAsset {
  id: string;
  name: string;
  category: FurnitureCategory;
  defaultDimensions: {
    width: number;  // ft
    depth: number;  // ft
    height: number; // ft
  };
  defaultColor: string;
  defaultMaterialId: string;
  resizable: boolean;
  isStructural?: boolean;
  estimatedUnitCostINR: number;
  description: string;
}

export interface QuantityTakeoffItem {
  id: string;
  category:
    | "Excavation"
    | "Foundation"
    | "Concrete (RCC)"
    | "Reinforcement Steel"
    | "Bricks & Masonry"
    | "Plastering"
    | "Flooring"
    | "Roofing"
    | "Electrical Work"
    | "Plumbing & Sanitary"
    | "Doors"
    | "Windows"
    | "Painting"
    | "Waterproofing"
    | "Labour"
    | "Finishing & Interiors";
  description: string;
  quantity: number;
  unit: string;
  unitRateINR: number;
  totalCostINR: number;
  formulaUsed: string;
}

export interface ConstructionCostEstimate {
  projectId: string;
  calculatedAt: string;
  rateSource: string;
  rateUpdateDate: string;
  currency: "INR" | "USD";
  totalBuiltUpAreaSqFt: number;
  totalCarpetAreaSqFt: number;
  plotAreaSqFt: number;
  groundCoveragePercentage: number;
  farRatio: number;
  totalWallLengthFt: number;
  grossWallVolumeCuFt: number;
  openingDeductionVolumeCuFt: number;
  netWallVolumeCuFt: number;
  slabConcreteVolumeCuFt: number;
  estimatedBricksCount: number;
  estimatedSteelKg: number;
  estimatedCementBags: number;
  materialCostINR: number;
  labourCostINR: number;
  interiorAssetsCostINR: number;
  subTotalCostINR: number;
  contingencyCostINR: number;
  architecturalFeeINR: number;
  otherExpensesINR: number;
  totalEstimatedCostINR: number;
  costPerSqFtINR: number;
  items: QuantityTakeoffItem[];
  assumptions: string[];
  disclaimer: string;
}

export type EditorTool =
  | "select"
  | "wall"
  | "room"
  | "door"
  | "window"
  | "furniture"
  | "measure"
  | "delete";

export type ViewMode3D =
  | "orbit"
  | "dollhouse"
  | "floor_isolation"
  | "section"
  | "walkthrough"
  | "top_ortho";

export type ActiveWorkspaceTab =
  | "2d"
  | "3d"
  | "split"
  | "cost"
  | "valuation"
  | "export";

