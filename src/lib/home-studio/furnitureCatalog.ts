import {
  ArchitecturalMaterial,
  ArchitecturalMaterialCategory,
  Floor,
  FurnitureCategory,
  FurnitureItem,
  RoomType,
} from "../../types/homeStudio";
import { BoxMeshSpec3D } from "./geometry3d";
import { computePolygonBoundsFt, roundToPrecision } from "./units";

export interface CatalogFurnitureAsset {
  assetId: string;
  name: string;
  category: FurnitureCategory;
  preferredRoomTypes: RoomType[];
  description: string;
  thumbnailSvg: string;
  geometryDefinition: "procedural_multi_mesh" | "gltf";
  gltfModelUrl?: string;
  dimensions: {
    width: number;  // real-world width (ft)
    depth: number;  // real-world length/depth (ft)
    length: number; // alias for depth (ft)
    height: number; // real-world height (ft)
  };
  defaultElevationOffsetFt: number;
  defaultMaterialId: string;
  availableMaterialIds: string[];
  defaultColor: string;
  collisionFootprint: {
    marginFt: number;
    snapToWall: boolean;
    allowOutdoor: boolean;
  };
  complexityLevel: "standard" | "high_detail" | "architectural_bespoke";
  estimatedUnitCostInr: number;
}

export const FURNITURE_CATEGORY_META: {
  id: FurnitureCategory;
  label: string;
  shortLabel: string;
  aliases: FurnitureCategory[];
}[] = [
  {
    id: "bedroom_furniture",
    label: "1. Bedroom Furniture",
    shortLabel: "Bedroom",
    aliases: ["bedroom_furniture", "beds"],
  },
  {
    id: "living_room_furniture",
    label: "2. Living Room Furniture",
    shortLabel: "Living",
    aliases: ["living_room_furniture", "sofas", "chairs"],
  },
  {
    id: "dining_furniture",
    label: "3. Dining Furniture",
    shortLabel: "Dining",
    aliases: ["dining_furniture", "tables"],
  },
  {
    id: "kitchen_furniture",
    label: "4. Kitchen Furniture",
    shortLabel: "Kitchen",
    aliases: ["kitchen_furniture", "kitchen_cabinets"],
  },
  {
    id: "bathroom_fixtures",
    label: "5. Bathroom Fixtures",
    shortLabel: "Bathroom",
    aliases: [
      "bathroom_fixtures",
      "toilets",
      "washbasins",
      "bathtubs",
      "shower_units",
    ],
  },
  {
    id: "wardrobes_and_cabinets",
    label: "6. Wardrobes & Cabinets",
    shortLabel: "Wardrobes",
    aliases: ["wardrobes_and_cabinets", "wardrobes"],
  },
  {
    id: "office_furniture",
    label: "7. Office Furniture",
    shortLabel: "Office",
    aliases: ["office_furniture"],
  },
  {
    id: "lighting",
    label: "8. Lighting & Luminaires",
    shortLabel: "Lighting",
    aliases: ["lighting", "lights", "ceiling_fans"],
  },
  {
    id: "electronics",
    label: "9. Electronics & Media",
    shortLabel: "Electronics",
    aliases: ["electronics"],
  },
  {
    id: "storage",
    label: "10. Storage & Shelving",
    shortLabel: "Storage",
    aliases: ["storage"],
  },
  {
    id: "outdoor_furniture",
    label: "11. Outdoor Furniture",
    shortLabel: "Outdoor",
    aliases: ["outdoor_furniture"],
  },
  {
    id: "balcony_furniture",
    label: "12. Balcony Furniture",
    shortLabel: "Balcony",
    aliases: ["balcony_furniture"],
  },
  {
    id: "doors",
    label: "13. Doors & Portals",
    shortLabel: "Doors",
    aliases: ["doors"],
  },
  {
    id: "windows",
    label: "14. Windows & Glazing",
    shortLabel: "Windows",
    aliases: ["windows"],
  },
  {
    id: "decorative",
    label: "15. Decorative Objects",
    shortLabel: "Decor",
    aliases: ["decorative"],
  },
  {
    id: "appliances",
    label: "16. Appliances",
    shortLabel: "Appliances",
    aliases: ["appliances", "kitchen_appliances"],
  },
  {
    id: "custom_objects",
    label: "17. Custom Objects",
    shortLabel: "Custom",
    aliases: ["custom_objects", "staircases"],
  },
];

export const MATERIAL_CATEGORY_META: {
  id: ArchitecturalMaterialCategory;
  label: string;
}[] = [
  { id: "wall_paint", label: "Wall Paint" },
  { id: "interior_plaster", label: "Interior Plaster" },
  { id: "exterior_paint", label: "Exterior Paint" },
  { id: "marble", label: "Marble" },
  { id: "granite", label: "Granite" },
  { id: "ceramic_tiles", label: "Ceramic Tiles" },
  { id: "porcelain_tiles", label: "Porcelain Tiles" },
  { id: "wooden_flooring", label: "Wooden Flooring" },
  { id: "laminate", label: "Laminate" },
  { id: "concrete", label: "Concrete" },
  { id: "glass", label: "Glass" },
  { id: "metal", label: "Metal" },
  { id: "fabric", label: "Fabric" },
  { id: "cabinet_finishes", label: "Cabinet Finishes" },
  { id: "ceiling_materials", label: "Ceiling Materials" },
];

export const ARCHITECTURAL_FURNITURE_CATALOG: CatalogFurnitureAsset[] = [
  // 1. Bedroom furniture
  {
    assetId: "asset-bed-king-atelier",
    name: "Atelier King Platform Bed",
    category: "bedroom_furniture",
    preferredRoomTypes: ["master_bedroom", "bedroom"],
    description: "6'6\" × 7'0\" upholstered king bed with walnut headboard & twin nightstands.",
    thumbnailSvg: "M4 6h24v20H4z M6 8h9v5H6z M17 8h9v5h-9z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 6.5, depth: 7.0, length: 7.0, height: 3.6 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wood-teak",
    availableMaterialIds: ["mat-wood-teak", "mat-fabric-boucle", "mat-wood-oak"],
    defaultColor: "#D8CFC2",
    collisionFootprint: { marginFt: 0.5, snapToWall: true, allowOutdoor: false },
    complexityLevel: "architectural_bespoke",
    estimatedUnitCostInr: 145000,
  },
  {
    assetId: "asset-bed-queen-linen",
    name: "Serene Queen Upholstered Bed",
    category: "bedroom_furniture",
    preferredRoomTypes: ["bedroom", "master_bedroom"],
    description: "5'6\" × 6'9\" queen bed with ivory Belgian bouclé frame.",
    thumbnailSvg: "M5 6h22v20H5z M7 8h8v5H7z M17 8h8v5h-8z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 5.5, depth: 6.8, length: 6.8, height: 3.4 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-fabric-boucle",
    availableMaterialIds: ["mat-fabric-boucle", "mat-fabric-linen-taupe", "mat-wood-oak"],
    defaultColor: "#EAE4DC",
    collisionFootprint: { marginFt: 0.4, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 110000,
  },
  // 2. Living room furniture
  {
    assetId: "asset-sofa-3seater-boucle",
    name: "Milano 3-Seater Lounge Sofa",
    category: "living_room_furniture",
    preferredRoomTypes: ["living_room", "study_room"],
    description: "8'0\" deep-seated architectural sofa in warm ivory bouclé.",
    thumbnailSvg: "M3 10h26v12H3z M3 8h26v3H3z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 8.0, depth: 3.2, length: 3.2, height: 2.8 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-fabric-boucle",
    availableMaterialIds: ["mat-fabric-boucle", "mat-fabric-linen-taupe", "mat-wood-teak"],
    defaultColor: "#E8E2D8",
    collisionFootprint: { marginFt: 0.5, snapToWall: true, allowOutdoor: false },
    complexityLevel: "architectural_bespoke",
    estimatedUnitCostInr: 165000,
  },
  {
    assetId: "asset-chair-lounge-teak",
    name: "Pierre Teak & Cane Lounge Chair",
    category: "living_room_furniture",
    preferredRoomTypes: ["living_room", "study_room", "master_bedroom"],
    description: "Sculpted Burma teak armchair with tailored linen seat cushion.",
    thumbnailSvg: "M8 8h16v16H8z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 2.8, depth: 2.8, length: 2.8, height: 2.7 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wood-teak",
    availableMaterialIds: ["mat-wood-teak", "mat-wood-oak", "mat-fabric-boucle"],
    defaultColor: "#B6916B",
    collisionFootprint: { marginFt: 0.3, snapToWall: false, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 38000,
  },
  // 3. Dining furniture
  {
    assetId: "asset-table-dining-8",
    name: "Travertine 8-Seater Dining Suite",
    category: "dining_furniture",
    preferredRoomTypes: ["dining_room", "living_room"],
    description: "7'6\" × 3'6\" honed travertine slab dining table with sculpted chairs.",
    thumbnailSvg: "M4 8h24v16H4z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 7.5, depth: 3.8, length: 3.8, height: 2.5 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-floor-marble-statuario",
    availableMaterialIds: ["mat-floor-marble-statuario", "mat-wood-teak", "mat-granite-nero"],
    defaultColor: "#EAE5DC",
    collisionFootprint: { marginFt: 1.0, snapToWall: false, allowOutdoor: false },
    complexityLevel: "architectural_bespoke",
    estimatedUnitCostInr: 185000,
  },
  // 4. Kitchen furniture
  {
    assetId: "asset-kitchen-island-8ft",
    name: "Quartz Waterfall Culinary Island",
    category: "kitchen_furniture",
    preferredRoomTypes: ["kitchen", "dining_room"],
    description: "8'0\" × 3'0\" kitchen island with integrated undermount sink & brass mixer.",
    thumbnailSvg: "M3 9h26v14H3z M18 11h7v9h-7z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 8.0, depth: 3.0, length: 3.0, height: 3.0 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-floor-marble-statuario",
    availableMaterialIds: ["mat-floor-marble-statuario", "mat-granite-nero", "mat-cabinet-fluted-oak"],
    defaultColor: "#F2EFE9",
    collisionFootprint: { marginFt: 0.5, snapToWall: true, allowOutdoor: false },
    complexityLevel: "architectural_bespoke",
    estimatedUnitCostInr: 195000,
  },
  // 5. Bathroom fixtures
  {
    assetId: "asset-bathtub-freestanding",
    name: "Oval Stone Resin Freestanding Tub",
    category: "bathroom_fixtures",
    preferredRoomTypes: ["bathroom"],
    description: "5'6\" sculptural matte stone soaking bathtub with floor filler.",
    thumbnailSvg: "M5 9h22v14 rx7 ry7z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 5.5, depth: 2.7, length: 2.7, height: 2.0 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wall-paint-ivory",
    availableMaterialIds: ["mat-wall-paint-ivory", "mat-floor-marble-statuario", "mat-granite-nero"],
    defaultColor: "#FFFFFF",
    collisionFootprint: { marginFt: 0.3, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 135000,
  },
  {
    assetId: "asset-washbasin-vanity-4ft",
    name: "Floating Marble Vanity & Vessel Basin",
    category: "bathroom_fixtures",
    preferredRoomTypes: ["bathroom"],
    description: "42-inch floating travertine vanity counter with vessel basin & mirror.",
    thumbnailSvg: "M6 10h20v12H6z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 3.5, depth: 1.8, length: 1.8, height: 2.8 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-floor-marble-statuario",
    availableMaterialIds: ["mat-floor-marble-statuario", "mat-wood-teak", "mat-cabinet-fluted-oak"],
    defaultColor: "#EFECE6",
    collisionFootprint: { marginFt: 0.2, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 58000,
  },
  // 6. Wardrobes and cabinets
  {
    assetId: "asset-wardrobe-fluted-6ft",
    name: "Fluted Oak & Bronze Armoire Wardrobe",
    category: "wardrobes_and_cabinets",
    preferredRoomTypes: ["master_bedroom", "bedroom", "storage_room"],
    description: "Full-height 6'0\" × 2'0\" modular wardrobe with champagne bronze pulls.",
    thumbnailSvg: "M4 11h24v10H4z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 6.0, depth: 2.0, length: 2.0, height: 8.5 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-cabinet-fluted-oak",
    availableMaterialIds: ["mat-cabinet-fluted-oak", "mat-wood-teak", "mat-laminate-walnut"],
    defaultColor: "#C5A880",
    collisionFootprint: { marginFt: 0.2, snapToWall: true, allowOutdoor: false },
    complexityLevel: "architectural_bespoke",
    estimatedUnitCostInr: 140000,
  },
  // 7. Office furniture
  {
    assetId: "asset-office-executive-desk",
    name: "Architect's Walnut Executive Desk & Chair",
    category: "office_furniture",
    preferredRoomTypes: ["study_room", "master_bedroom", "bedroom"],
    description: "5'6\" cantilevered walnut writing desk with ergonomic leather chair.",
    thumbnailSvg: "M5 9h22v12H5z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 5.5, depth: 2.8, length: 2.8, height: 2.5 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wood-teak",
    availableMaterialIds: ["mat-wood-teak", "mat-wood-oak", "mat-laminate-walnut"],
    defaultColor: "#9A744C",
    collisionFootprint: { marginFt: 0.4, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 74000,
  },
  // 8. Lighting
  {
    assetId: "asset-light-chandelier-halo",
    name: "Alabaster & Brass Halo Chandelier",
    category: "lighting",
    preferredRoomTypes: ["living_room", "dining_room", "master_bedroom"],
    description: "Suspended architectural brass ring pendant luminaire (3000K warm glow).",
    thumbnailSvg: "M16 6a10 10 0 1 0 0 20a10 10 0 1 0 0-20z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 3.4, depth: 3.4, length: 3.4, height: 1.5 },
    defaultElevationOffsetFt: 7.8,
    defaultMaterialId: "mat-metal-champagne",
    availableMaterialIds: ["mat-metal-champagne", "mat-glass-clear"],
    defaultColor: "#DFC39D",
    collisionFootprint: { marginFt: 0.1, snapToWall: false, allowOutdoor: false },
    complexityLevel: "architectural_bespoke",
    estimatedUnitCostInr: 72000,
  },
  {
    assetId: "asset-light-floor-lamp-arc",
    name: "Travertine Base Brass Arc Floor Lamp",
    category: "lighting",
    preferredRoomTypes: ["living_room", "study_room", "master_bedroom"],
    description: "6'2\" freestanding brass floor luminaire with warm Linen diffuser.",
    thumbnailSvg: "M12 12h8v8h-8z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 1.8, depth: 1.8, length: 1.8, height: 6.2 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-metal-champagne",
    availableMaterialIds: ["mat-metal-champagne", "mat-floor-marble-statuario"],
    defaultColor: "#C5A880",
    collisionFootprint: { marginFt: 0.2, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 34000,
  },
  // 9. Electronics
  {
    assetId: "asset-elec-oled-media-console",
    name: "77\" Gallery OLED Media Console Wall",
    category: "electronics",
    preferredRoomTypes: ["living_room", "master_bedroom", "study_room"],
    description: "Low-slung fluted timber media credenza with ultra-thin 77\" display.",
    thumbnailSvg: "M3 12h26v6H3z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 7.0, depth: 1.6, length: 1.6, height: 4.8 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wood-oak",
    availableMaterialIds: ["mat-wood-oak", "mat-wood-teak", "mat-metal-champagne"],
    defaultColor: "#262624",
    collisionFootprint: { marginFt: 0.2, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 220000,
  },
  // 10. Storage
  {
    assetId: "asset-storage-open-atelier-shelf",
    name: "Atelier Brass & Oak Bookcase Shelving",
    category: "storage",
    preferredRoomTypes: ["study_room", "living_room", "storage_room"],
    description: "5'0\" open architectural shelving system with 5 tiers.",
    thumbnailSvg: "M4 11h24v8H4z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 5.0, depth: 1.4, length: 1.4, height: 7.2 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wood-oak",
    availableMaterialIds: ["mat-wood-oak", "mat-wood-teak", "mat-metal-champagne"],
    defaultColor: "#C8A986",
    collisionFootprint: { marginFt: 0.2, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 68000,
  },
  // 11. Outdoor furniture
  {
    assetId: "asset-outdoor-teak-daybed",
    name: "Resort Teak Poolside Lounger Daybed",
    category: "outdoor_furniture",
    preferredRoomTypes: ["balcony", "custom_room", "living_room"],
    description: "6'8\" weather-resistant teak sun lounger with Sunbrella cushions.",
    thumbnailSvg: "M4 8h24v14H4z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 3.2, depth: 6.6, length: 6.6, height: 2.2 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wood-teak",
    availableMaterialIds: ["mat-wood-teak", "mat-fabric-boucle"],
    defaultColor: "#C8A986",
    collisionFootprint: { marginFt: 0.4, snapToWall: false, allowOutdoor: true },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 82000,
  },
  // 12. Balcony furniture
  {
    assetId: "asset-balcony-bistro-set",
    name: "Riviera Travertine Balcony Bistro Set",
    category: "balcony_furniture",
    preferredRoomTypes: ["balcony", "living_room"],
    description: "Compact 3'6\" cafés table with pair of woven terrace chairs.",
    thumbnailSvg: "M8 8h16v16H8z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 3.5, depth: 3.5, length: 3.5, height: 2.5 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-floor-travertine-honed",
    availableMaterialIds: ["mat-floor-travertine-honed", "mat-wood-teak"],
    defaultColor: "#E8E0D2",
    collisionFootprint: { marginFt: 0.3, snapToWall: false, allowOutdoor: true },
    complexityLevel: "standard",
    estimatedUnitCostInr: 46000,
  },
  // 13. Doors
  {
    assetId: "asset-door-pivot-fluted",
    name: "Architectural Pivot Entrance Portal",
    category: "doors",
    preferredRoomTypes: ["living_room", "master_bedroom"],
    description: "4'0\" × 8'0\" solid Burma teak pivot door assembly.",
    thumbnailSvg: "M6 13h20v6H6z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 4.0, depth: 0.6, length: 0.6, height: 8.0 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-wood-teak",
    availableMaterialIds: ["mat-wood-teak", "mat-wood-oak", "mat-metal-champagne"],
    defaultColor: "#9A744C",
    collisionFootprint: { marginFt: 0.1, snapToWall: true, allowOutdoor: true },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 95000,
  },
  // 14. Windows
  {
    assetId: "asset-window-bay-seat",
    name: "Architectural Bay Window Lounge Seat",
    category: "windows",
    preferredRoomTypes: ["living_room", "master_bedroom", "study_room"],
    description: "5'0\" glazed bay window box with upholstered reading bench.",
    thumbnailSvg: "M4 11h24v8H4z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 5.0, depth: 1.8, length: 1.8, height: 5.5 },
    defaultElevationOffsetFt: 1.2,
    defaultMaterialId: "mat-glass-clear",
    availableMaterialIds: ["mat-glass-clear", "mat-metal-champagne"],
    defaultColor: "#C8E0EC",
    collisionFootprint: { marginFt: 0.1, snapToWall: true, allowOutdoor: true },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 78000,
  },
  // 15. Decorative objects
  {
    assetId: "asset-decor-olive-tree",
    name: "Mediterranean Olive Tree in Limestone Planter",
    category: "decorative",
    preferredRoomTypes: ["living_room", "balcony", "dining_room"],
    description: "5'2\" indoor architectural specimen olive tree in carved stone pot.",
    thumbnailSvg: "M10 10h12v12H10z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 2.2, depth: 2.2, length: 2.2, height: 5.2 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-floor-terracotta",
    availableMaterialIds: ["mat-floor-terracotta", "mat-floor-marble-statuario"],
    defaultColor: "#8FA382",
    collisionFootprint: { marginFt: 0.2, snapToWall: false, allowOutdoor: true },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 24000,
  },
  // 16. Appliances
  {
    assetId: "asset-appliance-fridge-french",
    name: "Built-In French Door Wine & Sub-Zero Fridge",
    category: "appliances",
    preferredRoomTypes: ["kitchen", "utility_room", "dining_room"],
    description: "36-inch counter-depth architectural champagne steel refrigerator.",
    thumbnailSvg: "M8 8h16v16H8z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 3.0, depth: 2.6, length: 2.6, height: 6.5 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-metal-champagne",
    availableMaterialIds: ["mat-metal-champagne", "mat-cabinet-fluted-oak"],
    defaultColor: "#C8C5BE",
    collisionFootprint: { marginFt: 0.2, snapToWall: true, allowOutdoor: false },
    complexityLevel: "high_detail",
    estimatedUnitCostInr: 155000,
  },
  // 17. Custom objects
  {
    assetId: "asset-custom-sculptural-plinth",
    name: "Gallery Travertine Sculpture Pedestal",
    category: "custom_objects",
    preferredRoomTypes: ["living_room", "dining_room", "study_room"],
    description: "Customizable architectural stone plinth & bronze art object.",
    thumbnailSvg: "M10 10h12v12H10z",
    geometryDefinition: "procedural_multi_mesh",
    dimensions: { width: 2.4, depth: 2.4, length: 2.4, height: 3.8 },
    defaultElevationOffsetFt: 0,
    defaultMaterialId: "mat-floor-marble-statuario",
    availableMaterialIds: [
      "mat-floor-marble-statuario",
      "mat-metal-champagne",
      "mat-wood-teak",
    ],
    defaultColor: "#EAE6DF",
    collisionFootprint: { marginFt: 0.2, snapToWall: false, allowOutdoor: true },
    complexityLevel: "architectural_bespoke",
    estimatedUnitCostInr: 45000,
  },
];

export const EXTENDED_ARCHITECTURAL_MATERIALS: ArchitecturalMaterial[] = [
  // 1. Wall paint
  {
    id: "mat-wall-paint-ivory",
    name: "Warm Ivory Matte Paint",
    category: "wall_paint",
    color: "#F9F8F6",
    roughness: 0.85,
    metalness: 0.02,
    pattern: "solid",
    repeatScale: 1,
    finishQuality: "premium",
    unitCostPerSqFt: 65,
  },
  // 2. Interior plaster
  {
    id: "mat-wall-limewash-sand",
    name: "Venetian Sand Micro-Plaster",
    category: "interior_plaster",
    color: "#EFECE4",
    roughness: 0.78,
    metalness: 0.03,
    pattern: "solid",
    repeatScale: 2,
    finishQuality: "premium",
    unitCostPerSqFt: 145,
  },
  // 3. Exterior paint
  {
    id: "mat-exterior-weather-alabaster",
    name: "Elastomeric Alabaster Exterior Coat",
    category: "exterior_paint",
    color: "#F3F0E8",
    roughness: 0.88,
    metalness: 0.01,
    pattern: "solid",
    repeatScale: 1,
    finishQuality: "standard",
    unitCostPerSqFt: 85,
  },
  // 4. Marble
  {
    id: "mat-floor-marble-statuario",
    name: "Italian Statuario White Marble",
    category: "marble",
    color: "#F4F3EF",
    roughness: 0.16,
    metalness: 0.08,
    pattern: "marble",
    repeatScale: 2,
    finishQuality: "premium",
    unitCostPerSqFt: 420,
  },
  {
    id: "mat-floor-travertine-honed",
    name: "Honed Roman Travertine Marble",
    category: "marble",
    color: "#E8E0D2",
    roughness: 0.35,
    metalness: 0.04,
    pattern: "marble",
    repeatScale: 2,
    finishQuality: "premium",
    unitCostPerSqFt: 360,
  },
  // 5. Granite
  {
    id: "mat-granite-nero",
    name: "Flamed Nero Assoluto Granite",
    category: "granite",
    color: "#3A3937",
    roughness: 0.32,
    metalness: 0.12,
    pattern: "marble",
    repeatScale: 3,
    finishQuality: "premium",
    unitCostPerSqFt: 290,
  },
  // 6. Ceramic tiles
  {
    id: "mat-floor-terracotta",
    name: "Artisanal Sandstone Ceramic Tile",
    category: "ceramic_tiles",
    color: "#DFD3C3",
    roughness: 0.55,
    metalness: 0.04,
    pattern: "tile",
    repeatScale: 4,
    finishQuality: "standard",
    unitCostPerSqFt: 140,
  },
  // 7. Porcelain tiles
  {
    id: "mat-porcelain-large-slab",
    name: "Sintered Pietra Grey Porcelain Slab",
    category: "porcelain_tiles",
    color: "#D5D1C8",
    roughness: 0.28,
    metalness: 0.06,
    pattern: "tile",
    repeatScale: 2,
    finishQuality: "premium",
    unitCostPerSqFt: 220,
  },
  // 8. Wooden flooring
  {
    id: "mat-wood-oak",
    name: "European Smoked Oak Herringbone",
    category: "wooden_flooring",
    color: "#C8A986",
    roughness: 0.42,
    metalness: 0.05,
    pattern: "wood",
    repeatScale: 3,
    finishQuality: "premium",
    unitCostPerSqFt: 280,
  },
  {
    id: "mat-wood-teak",
    name: "Burma Teak Architectural Plank",
    category: "wooden_flooring",
    color: "#9A744C",
    roughness: 0.38,
    metalness: 0.06,
    pattern: "wood",
    repeatScale: 3,
    finishQuality: "premium",
    unitCostPerSqFt: 340,
  },
  // 9. Laminate
  {
    id: "mat-laminate-walnut",
    name: "Matte American Walnut Laminate",
    category: "laminate",
    color: "#8C6948",
    roughness: 0.48,
    metalness: 0.03,
    pattern: "wood",
    repeatScale: 2,
    finishQuality: "economy",
    unitCostPerSqFt: 135,
  },
  // 10. Concrete
  {
    id: "mat-concrete-architectural",
    name: "Board-Formed Fair-Faced Concrete",
    category: "concrete",
    color: "#CBC7BE",
    roughness: 0.76,
    metalness: 0.04,
    pattern: "concrete",
    repeatScale: 2,
    finishQuality: "standard",
    unitCostPerSqFt: 165,
  },
  // 11. Glass
  {
    id: "mat-glass-clear",
    name: "Double-Glazed Low-E Architectural Glass",
    category: "glass",
    color: "#D8E8F0",
    roughness: 0.08,
    metalness: 0.15,
    opacity: 0.38,
    pattern: "glass",
    repeatScale: 1,
    finishQuality: "premium",
    unitCostPerSqFt: 310,
  },
  // 12. Metal
  {
    id: "mat-metal-champagne",
    name: "Brushed Champagne Gold Anodized",
    category: "metal",
    color: "#C5A880",
    roughness: 0.25,
    metalness: 0.82,
    pattern: "solid",
    repeatScale: 1,
    finishQuality: "premium",
    unitCostPerSqFt: 520,
  },
  // 13. Fabric
  {
    id: "mat-fabric-boucle",
    name: "Alabaster Belgian Bouclé Upholstery",
    category: "fabric",
    color: "#EDE8DF",
    roughness: 0.92,
    metalness: 0.01,
    pattern: "solid",
    repeatScale: 4,
    finishQuality: "premium",
    unitCostPerSqFt: 210,
  },
  {
    id: "mat-fabric-linen-taupe",
    name: "Warm Taupe Architectural Linen",
    category: "fabric",
    color: "#D6CEC2",
    roughness: 0.88,
    metalness: 0.01,
    pattern: "solid",
    repeatScale: 4,
    finishQuality: "standard",
    unitCostPerSqFt: 185,
  },
  // 14. Cabinet finishes
  {
    id: "mat-cabinet-fluted-oak",
    name: "Fluted White Oak Veneer & Bronze",
    category: "cabinet_finishes",
    color: "#C4A77D",
    roughness: 0.4,
    metalness: 0.08,
    pattern: "wood",
    repeatScale: 3,
    finishQuality: "premium",
    unitCostPerSqFt: 320,
  },
  // 15. Ceiling materials
  {
    id: "mat-ceiling-acoustic-gypsum",
    name: "Seamless Acoustic Gypsum Coffers",
    category: "ceiling_materials",
    color: "#FBFBF9",
    roughness: 0.9,
    metalness: 0.01,
    pattern: "solid",
    repeatScale: 1,
    finishQuality: "standard",
    unitCostPerSqFt: 115,
  },
];

export function getCatalogAssetsByCategory(
  category?: FurnitureCategory | "all",
  searchQuery?: string
): CatalogFurnitureAsset[] {
  const q = (searchQuery || "").trim().toLowerCase();
  const groupMeta = FURNITURE_CATEGORY_META.find(
    (m) => m.id === category || m.aliases.includes(category as FurnitureCategory)
  );

  return ARCHITECTURAL_FURNITURE_CATALOG.filter((asset) => {
    if (category && category !== "all") {
      const matchesGroup = groupMeta
        ? groupMeta.aliases.includes(asset.category)
        : asset.category === category;
      if (!matchesGroup) return false;
    }
    if (
      q &&
      !asset.name.toLowerCase().includes(q) &&
      !asset.description.toLowerCase().includes(q) &&
      !asset.category.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });
}

export interface FurniturePlacementValidation {
  valid: boolean;
  insideBuildingRoom: boolean;
  withinPlotBounds: boolean;
  collidingObjectIds: string[];
  snappedPositionFt: { x: number; z: number };
  warningMessage: string | null;
}

/**
 * Validates and snaps a candidate furniture position (in real-world feet) against:
 * 1. Grid and wall alignment snapping
 * 2. Plot and room enclosure boundaries
 * 3. Collision footprints with existing furniture objects on the active floor
 */
export function validateFurniturePlacementFt(params: {
  floor: Floor;
  plotWidth: number;
  plotLength: number;
  candidateX: number;
  candidateZ: number;
  widthFt: number;
  depthFt: number;
  excludeObjectId?: string;
  snapToGrid?: boolean;
  gridSizeFt?: number;
  snapToWall?: boolean;
  allowOutsideRoom?: boolean;
}): FurniturePlacementValidation {
  const {
    floor,
    plotWidth,
    plotLength,
    widthFt,
    depthFt,
    excludeObjectId,
    snapToGrid = true,
    gridSizeFt = 0.5,
    snapToWall = true,
    allowOutsideRoom = false,
  } = params;

  let x = params.candidateX;
  let z = params.candidateZ;

  if (snapToGrid && gridSizeFt > 0) {
    x = Math.round(x / gridSizeFt) * gridSizeFt;
    z = Math.round(z / gridSizeFt) * gridSizeFt;
  }

  // Snap to nearby horizontal/vertical room or wall edges within 0.8 ft
  if (snapToWall) {
    const snapTol = 0.85;
    for (const r of floor.rooms) {
      const b = computePolygonBoundsFt(r.polygon);
      if (Math.abs(x - b.minX) <= snapTol) x = b.minX + 0.15;
      else if (Math.abs(x + widthFt - b.maxX) <= snapTol)
        x = b.maxX - widthFt - 0.15;

      if (Math.abs(z - b.minY) <= snapTol) z = b.minY + 0.15;
      else if (Math.abs(z + depthFt - b.maxY) <= snapTol)
        z = b.maxY - depthFt - 0.15;
    }
  }

  x = roundToPrecision(Math.max(0.5, Math.min(plotWidth - widthFt - 0.5, x)), 2);
  z = roundToPrecision(Math.max(0.5, Math.min(plotLength - depthFt - 0.5, z)), 2);

  const withinPlotBounds =
    x >= 0 &&
    z >= 0 &&
    x + widthFt <= plotWidth &&
    z + depthFt <= plotLength;

  // Check if furniture center lies within at least one room polygon bounding box on the floor
  const cx = x + widthFt / 2;
  const cz = z + depthFt / 2;
  const insideBuildingRoom =
    floor.rooms.length === 0 ||
    floor.rooms.some((r) => {
      const b = computePolygonBoundsFt(r.polygon);
      return cx >= b.minX && cx <= b.maxX && cz >= b.minY && cz <= b.maxY;
    });

  // Check AABB collision against other floor objects (except ceiling lights/fans)
  const collidingObjectIds: string[] = [];
  for (const other of floor.objects) {
    if (other.id === excludeObjectId) continue;
    if (
      other.category === "lighting" ||
      other.category === "lights" ||
      other.category === "ceiling_fans"
    ) {
      continue;
    }
    const ox1 = other.position.x;
    const oz1 = other.position.z;
    const ox2 = ox1 + other.dimensions.width;
    const oz2 = oz1 + other.dimensions.depth;

    const overlapX = x < ox2 - 0.1 && x + widthFt > ox1 + 0.1;
    const overlapZ = z < oz2 - 0.1 && z + depthFt > oz1 + 0.1;
    if (overlapX && overlapZ) {
      collidingObjectIds.push(other.id);
    }
  }

  let warningMessage: string | null = null;
  if (!insideBuildingRoom && !allowOutsideRoom) {
    warningMessage =
      "Furniture is outside enclosed room boundaries. Move inside a room or enable 'Allow Outdoor Placement'.";
  } else if (collidingObjectIds.length > 0) {
    warningMessage = `Collision detected: overlaps with ${collidingObjectIds.length} existing object(s).`;
  }

  return {
    valid:
      withinPlotBounds &&
      (insideBuildingRoom || allowOutsideRoom) &&
      collidingObjectIds.length === 0,
    insideBuildingRoom,
    withinPlotBounds,
    collidingObjectIds,
    snappedPositionFt: { x, z },
    warningMessage,
  };
}

/**
 * Finds an intelligent placement coordinate inside a matching room on the floor
 * (or defaults to a clean interior spot within the plot).
 */
export function findOptimalRoomPlacementForAsset(
  floor: Floor,
  plotWidth: number,
  plotLength: number,
  asset: CatalogFurnitureAsset
): { x: number; z: number } {
  const matchingRoom =
    floor.rooms.find((r) => asset.preferredRoomTypes.includes(r.type)) ||
    floor.rooms[0];

  if (matchingRoom) {
    const b = computePolygonBoundsFt(matchingRoom.polygon);
    const existingCount = floor.objects.filter((obj) => {
      const cx = obj.position.x + obj.dimensions.width / 2;
      const cz = obj.position.z + obj.dimensions.depth / 2;
      return cx >= b.minX && cx <= b.maxX && cz >= b.minY && cz <= b.maxY;
    }).length;

    const offsetStep = (existingCount % 3) * 1.5;
    const targetX = Math.max(
      b.minX + 0.5,
      Math.min(
        b.maxX - asset.dimensions.width - 0.5,
        b.minX + (b.width - asset.dimensions.width) / 2 + offsetStep
      )
    );
    const targetZ = Math.max(
      b.minY + 0.5,
      Math.min(
        b.maxY - asset.dimensions.depth - 0.5,
        b.minY + (b.length - asset.dimensions.depth) / 2 + offsetStep
      )
    );

    return {
      x: roundToPrecision(
        Math.max(1, Math.min(plotWidth - asset.dimensions.width - 1, targetX)),
        2
      ),
      z: roundToPrecision(
        Math.max(1, Math.min(plotLength - asset.dimensions.depth - 1, targetZ)),
        2
      ),
    };
  }

  return {
    x: roundToPrecision(Math.max(2, (plotWidth - asset.dimensions.width) / 2), 2),
    z: roundToPrecision(Math.max(2, (plotLength - asset.dimensions.depth) / 2), 2),
  };
}

/**
 * Builds a validated `FurnitureItem` payload ready for `useHomeStudioStore.addFurniture()`.
 */
export function buildFurnitureItemFromCatalogAsset(
  asset: CatalogFurnitureAsset,
  floor: Floor,
  plotWidth: number,
  plotLength: number,
  positionOverrideFt?: { x: number; z: number },
  rotationDeg: number = 0
): Omit<FurnitureItem, "id"> {
  const pos =
    positionOverrideFt ||
    findOptimalRoomPlacementForAsset(floor, plotWidth, plotLength, asset);

  return {
    floorId: floor.id,
    assetId: asset.assetId,
    name: asset.name,
    category: asset.category,
    position: {
      x: pos.x,
      y: asset.defaultElevationOffsetFt,
      z: pos.z,
    },
    rotation: rotationDeg,
    dimensions: {
      width: asset.dimensions.width,
      depth: asset.dimensions.depth,
      height: asset.dimensions.height,
    },
    scale: { x: 1, y: 1, z: 1 },
    materialId: asset.defaultMaterialId,
    color: asset.defaultColor,
    isStructural: asset.category === "staircases",
    allowOutsideRoom: asset.collisionFootprint.allowOutdoor,
  };
}

/**
 * Generates multi-part procedural 3D architectural sub-meshes for a placed `FurnitureItem`
 * so beds, sofas, tables, wardrobes, kitchen islands, toilets, bathtubs, desks, media consoles,
 * and luminaires render with realistic multi-component silhouettes in the 3D viewport.
 */
export function generateProceduralFurnitureMeshes3D(
  obj: FurnitureItem,
  effectiveElevationFt: number,
  materialColorOverride?: string,
  roughness: number = 0.48,
  metalness: number = 0.08
): BoxMeshSpec3D[] {
  const sx = obj.scale?.x || 1;
  const sy = obj.scale?.y || 1;
  const sz = obj.scale?.z || 1;

  const w = obj.dimensions.width * sx;
  const h = obj.dimensions.height * sy;
  const d = obj.dimensions.depth * sz;
  const rotRad = ((obj.rotation || 0) * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  const cx = obj.position.x + w / 2;
  const baseBottomY = effectiveElevationFt + (obj.position.y || 0);
  const cz = obj.position.z + d / 2;
  const baseColor = materialColorOverride || obj.color || "#C5A880";

  const makePart = (
    suffix: string,
    lx: number,
    lyBottom: number,
    lz: number,
    pw: number,
    ph: number,
    pd: number,
    partColor: string,
    partRoughness: number = roughness,
    partMetalness: number = metalness,
    partOpacity: number = 1
  ): BoxMeshSpec3D => {
    const worldX = cx + lx * cosR + lz * sinR;
    const worldZ = cz - lx * sinR + lz * cosR;
    const worldY = baseBottomY + lyBottom + ph / 2;

    return {
      id: `furn-${obj.id}-${suffix}`,
      sourceObjectId: obj.id,
      floorId: obj.floorId,
      kind: "furniture",
      position: {
        x: roundToPrecision(worldX, 3),
        y: roundToPrecision(worldY, 3),
        z: roundToPrecision(worldZ, 3),
      },
      dimensions: {
        width: roundToPrecision(Math.max(0.12, pw), 3),
        height: roundToPrecision(Math.max(0.08, ph), 3),
        depth: roundToPrecision(Math.max(0.12, pd), 3),
      },
      rotationYRad: rotRad,
      color: partColor,
      opacity: partOpacity,
      roughness: partRoughness,
      metalness: partMetalness,
    };
  };

  const cat = obj.category;

  // 1. Bedroom Furniture / Beds
  if (cat === "bedroom_furniture" || cat === "beds") {
    return [
      makePart("plinth", 0, 0, 0, w, h * 0.28, d, "#9A744C", 0.45, 0.05),
      makePart(
        "mattress",
        0,
        h * 0.28,
        d * 0.04,
        w * 0.92,
        h * 0.26,
        d * 0.86,
        "#F7F5F0",
        0.85,
        0.01
      ),
      makePart(
        "headboard",
        0,
        0,
        -d * 0.44,
        w,
        h,
        Math.max(0.35, d * 0.1),
        baseColor,
        0.65,
        0.04
      ),
      makePart(
        "pillow-l",
        -w * 0.22,
        h * 0.54,
        -d * 0.28,
        w * 0.34,
        h * 0.12,
        d * 0.18,
        "#FFFFFF",
        0.9,
        0.01
      ),
      makePart(
        "pillow-r",
        w * 0.22,
        h * 0.54,
        -d * 0.28,
        w * 0.34,
        h * 0.12,
        d * 0.18,
        "#FFFFFF",
        0.9,
        0.01
      ),
    ];
  }

  // 2. Living Room / Outdoor / Balcony Sofas & Chairs
  if (
    cat === "living_room_furniture" ||
    cat === "sofas" ||
    cat === "chairs" ||
    cat === "outdoor_furniture"
  ) {
    return [
      makePart(
        "seat",
        0,
        0,
        d * 0.05,
        w,
        h * 0.46,
        d * 0.88,
        baseColor,
        0.85,
        0.02
      ),
      makePart(
        "backrest",
        0,
        h * 0.45,
        -d * 0.36,
        w,
        h * 0.55,
        Math.max(0.4, d * 0.22),
        baseColor,
        0.85,
        0.02
      ),
      makePart(
        "arm-l",
        -w * 0.44,
        h * 0.42,
        0,
        Math.max(0.35, w * 0.12),
        h * 0.34,
        d * 0.88,
        baseColor,
        0.82,
        0.02
      ),
      makePart(
        "arm-r",
        w * 0.44,
        h * 0.42,
        0,
        Math.max(0.35, w * 0.12),
        h * 0.34,
        d * 0.88,
        baseColor,
        0.82,
        0.02
      ),
    ];
  }

  // 3. Dining / Office / Balcony Tables & Desks
  if (
    cat === "dining_furniture" ||
    cat === "tables" ||
    cat === "office_furniture" ||
    cat === "balcony_furniture"
  ) {
    const legW = Math.min(0.35, w * 0.12);
    const legD = Math.min(0.35, d * 0.12);
    return [
      makePart("top", 0, h * 0.86, 0, w, h * 0.14, d, baseColor, 0.28, 0.08),
      makePart(
        "leg-fl",
        -w * 0.38,
        0,
        -d * 0.36,
        legW,
        h * 0.86,
        legD,
        "#8B6947",
        0.45,
        0.1
      ),
      makePart(
        "leg-fr",
        w * 0.38,
        0,
        -d * 0.36,
        legW,
        h * 0.86,
        legD,
        "#8B6947",
        0.45,
        0.1
      ),
      makePart(
        "leg-bl",
        -w * 0.38,
        0,
        d * 0.36,
        legW,
        h * 0.86,
        legD,
        "#8B6947",
        0.45,
        0.1
      ),
      makePart(
        "leg-br",
        w * 0.38,
        0,
        d * 0.36,
        legW,
        h * 0.86,
        legD,
        "#8B6947",
        0.45,
        0.1
      ),
    ];
  }

  // 4. Kitchen / Wardrobes / Storage / Appliances
  if (
    cat === "kitchen_furniture" ||
    cat === "kitchen_cabinets" ||
    cat === "wardrobes_and_cabinets" ||
    cat === "wardrobes" ||
    cat === "storage" ||
    cat === "appliances" ||
    cat === "kitchen_appliances"
  ) {
    return [
      makePart(
        "carcass",
        0,
        0,
        0,
        w,
        h * 0.92,
        d * 0.94,
        baseColor,
        0.42,
        0.08
      ),
      makePart(
        "crown",
        0,
        h * 0.92,
        0,
        w + 0.08,
        h * 0.08,
        d,
        "#F4F3EF",
        0.2,
        0.1
      ),
      makePart(
        "handle-trim",
        0,
        h * 0.45,
        d * 0.48,
        w * 0.25,
        Math.min(0.8, h * 0.18),
        0.08,
        "#C5A880",
        0.25,
        0.82
      ),
    ];
  }

  // 5. Bathroom Fixtures (Bathtubs, Vanities, WCs, Showers)
  if (
    cat === "bathroom_fixtures" ||
    cat === "bathtubs" ||
    cat === "washbasins" ||
    cat === "toilets" ||
    cat === "shower_units"
  ) {
    return [
      makePart(
        "fixture-base",
        0,
        0,
        0,
        w,
        h * 0.72,
        d,
        baseColor,
        0.2,
        0.05,
        cat === "shower_units" ? 0.38 : 1
      ),
      makePart(
        "fixture-rim",
        0,
        h * 0.72,
        -d * 0.25,
        w * 0.85,
        h * 0.28,
        d * 0.45,
        "#C5A880",
        0.25,
        0.75
      ),
    ];
  }

  // 6. Lighting & Ceiling Fans
  if (cat === "lighting" || cat === "lights" || cat === "ceiling_fans") {
    return [
      makePart("hub", 0, h * 0.5, 0, 0.8, h * 0.5, 0.8, "#C5A880", 0.25, 0.82),
      makePart(
        "diffuser-ring",
        0,
        0,
        0,
        w,
        Math.max(0.2, h * 0.35),
        d,
        "#FFFDF7",
        0.15,
        0.1,
        0.95
      ),
    ];
  }

  // 7. Electronics / Decorative / Custom Objects / Doors / Windows
  return [
    makePart("plinth", 0, 0, 0, w, h * 0.38, d, "#D8CFC2", 0.6, 0.04),
    makePart(
      "feature",
      0,
      h * 0.38,
      0,
      w * 0.82,
      h * 0.62,
      d * 0.78,
      baseColor,
      roughness,
      metalness,
      cat === "windows" ? 0.42 : 1
    ),
  ];
}
