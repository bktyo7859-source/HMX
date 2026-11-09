import { z } from "zod";
import { BuildingProject } from "../../types/homeStudio";
import { DEFAULT_ARCHITECTURAL_MATERIALS } from "../../data/homeStudioProjects";

export const CURRENT_PROJECT_SCHEMA_VERSION = 1;

export const UnitSystemSchema = z.enum(["ft", "m"]);

export const CardinalDirectionSchema = z.enum([
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
]);

export const RoadSideSchema = z.enum(["north", "south", "east", "west"]);

export const FloorTypeSchema = z.enum([
  "basement",
  "ground",
  "first",
  "second",
  "third",
  "rooftop",
  "custom",
]);

export const StaircaseTypeSchema = z.enum([
  "straight",
  "l_shaped",
  "u_shaped",
  "spiral",
]);

export const StaircaseMetadataSchema = z.object({
  stairType: StaircaseTypeSchema,
  widthFt: z.number().positive().max(20),
  totalRiseFt: z.number().positive().max(30),
  riserCount: z.number().int().min(2).max(60),
  riserHeightInches: z.number().positive().max(12),
  treadDepthInches: z.number().positive().max(24),
  startingFloorId: z.string().min(1),
  destinationFloorId: z.string().min(1),
  landingDepthFt: z.number().min(0).max(15),
  headroomClearanceFt: z.number().positive().max(25),
});

export const RoomTypeSchema = z.enum([
  "bedroom",
  "master_bedroom",
  "bathroom",
  "kitchen",
  "living_room",
  "dining_room",
  "study_room",
  "balcony",
  "garage",
  "utility_room",
  "storage_room",
  "custom_room",
]);

export const OpeningTypeSchema = z.enum([
  "door",
  "double_door",
  "sliding_door",
  "window",
  "double_window",
  "sliding_window",
  "french_window",
  "ventilator",
]);

export const FurnitureCategorySchema = z.enum([
  "bedroom_furniture",
  "living_room_furniture",
  "dining_furniture",
  "kitchen_furniture",
  "bathroom_fixtures",
  "wardrobes_and_cabinets",
  "office_furniture",
  "lighting",
  "electronics",
  "storage",
  "outdoor_furniture",
  "balcony_furniture",
  "doors",
  "windows",
  "decorative",
  "appliances",
  "custom_objects",
  "beds",
  "sofas",
  "chairs",
  "tables",
  "wardrobes",
  "kitchen_cabinets",
  "kitchen_appliances",
  "toilets",
  "washbasins",
  "bathtubs",
  "shower_units",
  "lights",
  "ceiling_fans",
  "staircases",
]);

export const FinishQualitySchema = z.enum(["economy", "standard", "premium"]);

export const Point2DSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const Point3DSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

export const SetbackConfigSchema = z.object({
  front: z.number().min(0).max(150),
  back: z.number().min(0).max(150),
  left: z.number().min(0).max(150),
  right: z.number().min(0).max(150),
});

export const PlotConfigSchema = z
  .object({
    shape: z.enum(["rectangular", "polygon"]),
    width: z.number().positive().max(1000),
    length: z.number().positive().max(1000),
    vertices: z.array(Point2DSchema).min(3),
    orientation: z.number().min(0).max(360),
    northDirection: CardinalDirectionSchema,
    roadFacing: RoadSideSchema,
    setbacks: SetbackConfigSchema,
    gridSize: z.number().positive().max(20),
    showGrid: z.boolean(),
    snapToGrid: z.boolean(),
    snapToWall: z.boolean(),
  })
  .refine(
    (plot) =>
      plot.setbacks.left + plot.setbacks.right < plot.width &&
      plot.setbacks.front + plot.setbacks.back < plot.length,
    {
      message:
        "Combined left/right or front/back setbacks cannot exceed plot width or length.",
    }
  );

export const WallSchema = z
  .object({
    id: z.string().min(1),
    floorId: z.string().min(1),
    startPoint: Point2DSchema,
    endPoint: Point2DSchema,
    height: z.number().positive().max(50),
    thickness: z.number().positive().max(5),
    materialId: z.string().min(1),
    isExterior: z.boolean().optional(),
    isStructural: z.boolean().optional(),
  })
  .refine(
    (w) => {
      const dx = w.endPoint.x - w.startPoint.x;
      const dy = w.endPoint.y - w.startPoint.y;
      return Math.hypot(dx, dy) >= 0.25;
    },
    {
      message: "Wall length must be at least 0.25 ft (3 inches).",
    }
  );

export const RoomSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  type: RoomTypeSchema,
  name: z.string().min(1),
  polygon: z.array(Point2DSchema).min(3),
  dimensions: z.object({
    width: z.number().positive(),
    length: z.number().positive(),
    area: z.number().positive(),
  }),
  floorMaterialId: z.string().min(1),
  wallMaterialId: z.string().min(1),
  ceilingMaterialId: z.string().min(1).optional(),
  color: z.string().min(1),
});

export const OpeningSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  wallId: z.string().min(1),
  type: OpeningTypeSchema,
  name: z.string().min(1),
  position: z.number().min(0).max(1),
  offsetFromStart: z.number().min(0),
  width: z.number().positive().max(40),
  height: z.number().positive().max(25),
  sillHeight: z.number().min(0).max(20),
  materialId: z.string().min(1),
  swingDirection: z.enum(["left", "right", "inward", "outward"]).optional(),
});

export const FurnitureItemSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  assetId: z.string().min(1),
  name: z.string().min(1),
  category: FurnitureCategorySchema,
  position: Point3DSchema,
  rotation: z.number().min(-360).max(360),
  dimensions: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive(),
  }),
  scale: Point3DSchema,
  materialId: z.string().min(1),
  color: z.string().min(1),
  isStructural: z.boolean().optional(),
  allowOutsideRoom: z.boolean().optional(),
  stairMetadata: StaircaseMetadataSchema.optional(),
});

export const FloorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: FloorTypeSchema,
  levelIndex: z.number().int().min(-5).max(20),
  elevation: z.number().finite(),
  floorHeight: z.number().positive().max(5),
  ceilingHeight: z.number().positive().max(30),
  visible: z.boolean(),
  locked: z.boolean(),
  rooms: z.array(RoomSchema),
  walls: z.array(WallSchema),
  openings: z.array(OpeningSchema),
  objects: z.array(FurnitureItemSchema),
});

export const ArchitecturalMaterialSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    "wall_paint",
    "interior_plaster",
    "exterior_paint",
    "marble",
    "granite",
    "ceramic_tiles",
    "porcelain_tiles",
    "wooden_flooring",
    "laminate",
    "concrete",
    "glass",
    "metal",
    "fabric",
    "cabinet_finishes",
    "ceiling_materials",
    "wall",
    "floor",
    "roof",
    "wood",
    "stone",
  ]),
  color: z.string().min(1),
  roughness: z.number().min(0).max(1),
  metalness: z.number().min(0).max(1),
  opacity: z.number().min(0).max(1).optional(),
  pattern: z
    .enum(["solid", "wood", "tile", "marble", "brick", "concrete", "glass"])
    .optional(),
  textureReference: z.string().optional(),
  normalMapUrl: z.string().optional(),
  bumpMapUrl: z.string().optional(),
  repeatScale: z.number().positive().max(100).optional(),
  finishQuality: FinishQualitySchema.optional(),
  previewThumbnail: z.string().optional(),
  unitCostPerSqFt: z.number().min(0),
});

export const CostConfigurationSchema = z.object({
  location: z.string().min(1),
  cityTier: z.enum(["Tier 1 (Metro)", "Tier 2 (Urban)", "Tier 3 (Suburban)"]),
  finishQuality: FinishQualitySchema,
  materialQualityMultiplier: z.number().min(0.5).max(3.0),
  labourRatePerSqFt: z.number().min(50).max(5000),
  contingencyPercentage: z.number().min(0).max(50),
  architecturalFeePercentage: z.number().min(0).max(30),
  otherExpenses: z.number().min(0),
  currency: z.enum(["INR", "USD"]),
  customRates: z.record(z.string(), z.number().min(0)).optional(),
});

export const BuildingSettingsSchema = z.object({
  displayUnit: UnitSystemSchema,
  RoofStyle: z.enum(["flat", "gable", "hip", "parapet"]),
  roofHeight: z.number().min(0).max(30),
  ambientLightIntensity: z.number().min(0).max(3),
  daylightIntensity: z.number().min(0).max(5).optional(),
  timeOfDayHours: z.number().min(0).max(24).optional(),
  interiorLightsEnabled: z.boolean().optional(),
  sunAzimuth: z.number().min(0).max(360),
  sunElevation: z.number().min(0).max(90),
  showDimensions: z.boolean(),
  showRoomLabels: z.boolean(),
  showSetbacks: z.boolean(),
  showFurniture2D: z.boolean(),
  showRoof3D: z.boolean(),
  sectionCutHeight: z.number().min(0).max(200),
  costConfig: CostConfigurationSchema,
});

export const ProjectSettingsSchema = BuildingSettingsSchema;

export const ProjectVersionSchema = z.object({
  version: z.number().int().min(1),
  schemaVersion: z.number().int().min(1),
  timestamp: z.string().min(1),
  summary: z.string().min(1),
  authorId: z.string().min(1),
});

export const BuildingProjectSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  location: z.string().min(1),
  plot: PlotConfigSchema,
  floors: z.array(FloorSchema).min(1),
  materials: z.array(ArchitecturalMaterialSchema).min(1),
  settings: BuildingSettingsSchema,
  version: z.number().int().min(1),
  revisionHistory: z.array(ProjectVersionSchema).optional(),
  thumbnailDataUrl: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
  project?: BuildingProject;
}

/**
 * Migrates older or partial project payloads to the latest schema version (v1)
 * before running strict Zod validation.
 */
export function migrateBuildingProject(raw: unknown): BuildingProject {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid building project payload: expected an object.");
  }

  const candidate = { ...(raw as Record<string, any>) };

  // Version 0 -> Version 1 migration
  if (!candidate.version || typeof candidate.version !== "number") {
    candidate.version = CURRENT_PROJECT_SCHEMA_VERSION;
  }

  if (!candidate.ownerId) {
    candidate.ownerId = "workspace-default";
  }

  if (!Array.isArray(candidate.materials) || candidate.materials.length === 0) {
    candidate.materials = DEFAULT_ARCHITECTURAL_MATERIALS;
  }

  if (candidate.plot && (!Array.isArray(candidate.plot.vertices) || candidate.plot.vertices.length < 3)) {
    const w = Number(candidate.plot.width) || 50;
    const l = Number(candidate.plot.length) || 80;
    candidate.plot.vertices = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: l },
      { x: 0, y: l },
    ];
  }

  if (!candidate.createdAt) {
    candidate.createdAt = new Date().toISOString();
  }
  if (!candidate.updatedAt) {
    candidate.updatedAt = new Date().toISOString();
  }

  return candidate as BuildingProject;
}

/**
 * Validates a BuildingProject against the centralized Zod schema and checks
 * relational integrity (e.g. openings reference valid walls on the same floor).
 */
export function validateBuildingProject(raw: unknown): ValidationOutcome {
  try {
    const migrated = migrateBuildingProject(raw);
    const parsed = BuildingProjectSchema.safeParse(migrated);

    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`
      );
      return { valid: false, errors: issues };
    }

    const project = parsed.data;
    const relationalErrors: string[] = [];

    const seenFloorIds = new Set<string>();
    for (const floor of project.floors) {
      if (seenFloorIds.has(floor.id)) {
        relationalErrors.push(`Duplicate floor ID detected: "${floor.id}".`);
      }
      seenFloorIds.add(floor.id);
    }

    for (const floor of project.floors) {
      const wallMap = new Map(floor.walls.map((w) => [w.id, w]));

      for (const room of floor.rooms) {
        for (const pt of room.polygon) {
          if (
            pt.x < -0.01 ||
            pt.y < -0.01 ||
            pt.x > project.plot.width + 0.01 ||
            pt.y > project.plot.length + 0.01
          ) {
            relationalErrors.push(
              `Room "${room.name}" on floor "${floor.name}" has vertex (${pt.x}, ${pt.y}) outside plot boundary (${project.plot.width}' × ${project.plot.length}').`
            );
            break;
          }
        }
      }

      for (const wall of floor.walls) {
        const pts = [wall.startPoint, wall.endPoint];
        for (const pt of pts) {
          if (
            pt.x < -0.01 ||
            pt.y < -0.01 ||
            pt.x > project.plot.width + 0.01 ||
            pt.y > project.plot.length + 0.01
          ) {
            relationalErrors.push(
              `Wall "${wall.id}" on floor "${floor.name}" extends outside plot boundary (${project.plot.width}' × ${project.plot.length}').`
            );
            break;
          }
        }
      }

      for (const opening of floor.openings) {
        const hostWall = wallMap.get(opening.wallId);
        if (!hostWall) {
          relationalErrors.push(
            `Opening "${opening.name}" (${opening.id}) references non-existent wall "${opening.wallId}" on floor "${floor.name}".`
          );
          continue;
        }
        const wallLength = Math.hypot(
          hostWall.endPoint.x - hostWall.startPoint.x,
          hostWall.endPoint.y - hostWall.startPoint.y
        );
        if (opening.width >= wallLength) {
          relationalErrors.push(
            `Opening "${opening.name}" width (${opening.width} ft) exceeds host wall length (${wallLength.toFixed(2)} ft).`
          );
        }
      }
    }

    if (relationalErrors.length > 0) {
      return { valid: false, errors: relationalErrors };
    }

    return {
      valid: true,
      errors: [],
      project: project as BuildingProject,
    };
  } catch (err: any) {
    return {
      valid: false,
      errors: [err?.message || "Unknown validation error"],
    };
  }
}
