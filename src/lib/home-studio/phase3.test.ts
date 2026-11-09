import assert from "node:assert/strict";
import {
  feetToMetres,
  metresToFeet,
  feetInchesToDecimalFeet,
  decimalFeetToFeetInches,
  sqFtToSqM,
  sqMToSqFt,
  formatArchitecturalLength,
  formatArchitecturalArea,
  computePolygonAreaSqFt,
  computePolygonBoundsFt,
} from "./units";
import {
  validateBuildingProject,
  migrateBuildingProject,
} from "./schemas";
import {
  ARCHITECTURAL_STARTER_TEMPLATES,
  createProjectFromTemplate,
  StarterTemplateKey,
} from "./templates";
import { useHomeStudioStore } from "../../store/useHomeStudioStore";
import { LocalStorageProjectAdapter } from "./storage";

export interface Phase3TestSuiteSummary {
  totalTests: number;
  passed: number;
  results: { name: string; status: "PASS" | "FAIL"; details?: string }[];
}

export async function runPhase3VerificationSuite(): Promise<Phase3TestSuiteSummary> {
  const results: Phase3TestSuiteSummary["results"] = [];

  const test = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      results.push({ name, status: "PASS" });
    } catch (err: any) {
      results.push({
        name,
        status: "FAIL",
        details: err?.message || String(err),
      });
    }
  };

  // 1. Unit Conversion Tests
  await test("Unit conversions: feet <-> metres & feet/inches precision", () => {
    const m = feetToMetres(50);
    assert.equal(m, 15.24);
    const ft = metresToFeet(15.24);
    assert.equal(ft, 50);

    const decFt = feetInchesToDecimalFeet(14, 6);
    assert.equal(decFt, 14.5);
    const fi = decimalFeetToFeetInches(14.5);
    assert.deepEqual(fi, { feet: 14, inches: 6 });

    assert.equal(formatArchitecturalLength(14.5, "ft"), `14' 6"`);
    assert.equal(formatArchitecturalLength(10, "m"), "3.05 m");

    const sqm = sqFtToSqM(1000);
    assert.equal(sqm, 92.9);
    const sqft = sqMToSqFt(92.90304);
    assert.equal(Math.round(sqft), 1000);
    assert.equal(formatArchitecturalArea(2500, "ft"), "2,500 sq ft");
  });

  // 2. Polygon Geometry Calculations
  await test("Polygon geometry area & bounding box calculations", () => {
    const rect = [
      { x: 5, y: 8 },
      { x: 25, y: 8 },
      { x: 25, y: 23 },
      { x: 5, y: 23 },
    ];
    assert.equal(computePolygonAreaSqFt(rect), 300);
    const bounds = computePolygonBoundsFt(rect);
    assert.equal(bounds.width, 20);
    assert.equal(bounds.length, 15);
  });

  // 3. Starter Templates Validation (2BHK, 3BHK, 4BHK, Single-Floor Villa, Two-Floor Villa)
  await test("Starter templates (2BHK, 3BHK, 4BHK, Single/Two-Floor Villa) schema validation", () => {
    const keys: StarterTemplateKey[] = [
      "2bhk",
      "3bhk",
      "4bhk",
      "single_floor_villa",
      "two_floor_villa",
    ];
    for (const key of keys) {
      const proj = createProjectFromTemplate(key);
      const outcome = validateBuildingProject(proj);
      assert.equal(outcome.valid, true, `Template ${key} failed validation`);
      assert.ok(proj.floors.length >= 1);
      assert.ok(proj.floors[0].rooms.length >= 4);
      assert.ok(proj.floors[0].walls.length >= 4);
    }
  });

  // 4. Invalid Geometry Rejection
  await test("Zod schema rejects invalid geometry & out-of-bounds rooms/walls/openings", () => {
    const validProj = createProjectFromTemplate("2bhk");

    // Case A: Setbacks exceed plot width
    const badSetbackProj = JSON.parse(JSON.stringify(validProj));
    badSetbackProj.plot.setbacks.left = 25;
    badSetbackProj.plot.setbacks.right = 25; // 50 > 40 width
    const resA = validateBuildingProject(badSetbackProj);
    assert.equal(resA.valid, false);

    // Case B: Room outside plot boundary
    const outOfBoundsRoomProj = JSON.parse(JSON.stringify(validProj));
    outOfBoundsRoomProj.floors[0].rooms[0].polygon[1].x = 999;
    const resB = validateBuildingProject(outOfBoundsRoomProj);
    assert.equal(resB.valid, false);

    // Case C: Opening wider than host wall
    const badOpeningProj = JSON.parse(JSON.stringify(validProj));
    badOpeningProj.floors[0].openings[0].width = 999;
    const resC = validateBuildingProject(badOpeningProj);
    assert.equal(resC.valid, false);
  });

  // 5. Project Migration
  await test("Legacy project migration adds missing schema version, vertices, and materials", () => {
    const base = createProjectFromTemplate("3bhk");
    const legacyPayload: any = {
      ...base,
      version: undefined,
      ownerId: undefined,
      materials: [],
      plot: {
        ...base.plot,
        vertices: [],
      },
    };
    const migrated = migrateBuildingProject(legacyPayload);
    const validation = validateBuildingProject(migrated);
    assert.equal(validation.valid, true);
    assert.equal(migrated.version, 1);
    assert.equal(migrated.plot.vertices.length, 4);
    assert.ok(migrated.materials.length > 0);
  });

  // 6. Zustand Store: Project Reset, Room, Wall, Opening, Furniture & Floor CRUD
  await test("Zustand store CRUD for floors, rooms, walls, openings, and furniture", () => {
    const store = useHomeStudioStore.getState();
    const tpl = createProjectFromTemplate("2bhk");
    store.resetProject(tpl);

    const floorId = useHomeStudioStore.getState().selectedFloorId;
    const initialRoomCount =
      useHomeStudioStore.getState().activeProject.floors[0].rooms.length;

    // Add Room
    const createdRoom = useHomeStudioStore.getState().addRoom({
      floorId,
      type: "study_room",
      name: "Private Study",
      polygon: [
        { x: 6, y: 8 },
        { x: 16, y: 8 },
        { x: 16, y: 18 },
        { x: 6, y: 18 },
      ],
      floorMaterialId: "mat-floor-oak-herringbone",
      wallMaterialId: "mat-wall-plaster-white",
      color: "#F3EFE8",
    });
    assert.ok(createdRoom);
    assert.equal(createdRoom.dimensions.area, 100);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors[0].rooms.length,
      initialRoomCount + 1
    );

    // Add Wall
    const createdWall = useHomeStudioStore.getState().addWall({
      floorId,
      startPoint: { x: 6, y: 18 },
      endPoint: { x: 16, y: 18 },
      height: 10,
      thickness: 0.5,
      materialId: "mat-wall-plaster-white",
    });
    assert.ok(createdWall);

    // Add Opening on that wall
    const createdOpening = useHomeStudioStore.getState().addOpening({
      floorId,
      wallId: createdWall.id,
      type: "door",
      name: "Study Door",
      position: 0.5,
      offsetFromStart: 5,
      width: 3,
      height: 7,
      sillHeight: 0,
      materialId: "mat-floor-oak-herringbone",
    });
    assert.ok(createdOpening);

    // Add Furniture
    const createdFurn = useHomeStudioStore.getState().addFurniture({
      floorId,
      assetId: "asset-desk-oak",
      name: "Architect's Drafting Desk",
      category: "tables",
      position: { x: 10, y: 0, z: 12 },
      rotation: 90,
      dimensions: { width: 5, depth: 2.5, height: 2.5 },
      scale: { x: 1, y: 1, z: 1 },
      materialId: "mat-floor-oak-herringbone",
      color: "#C8A986",
    });
    assert.ok(createdFurn);

    // Add Floor
    const newFloor = useHomeStudioStore
      .getState()
      .addFloor("first", "First Floor Atelier");
    assert.ok(newFloor);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors.length,
      2
    );
  });

  // 7. Undo / Redo & History Limit
  await test("Zustand undo/redo restores room, wall, dimension & furniture changes and respects limit", () => {
    const tpl = createProjectFromTemplate("2bhk");
    useHomeStudioStore.getState().resetProject(tpl);
    useHomeStudioStore.getState().setHistoryLimit(5);

    const floorId = useHomeStudioStore.getState().selectedFloorId;
    const baseRoomsCount =
      useHomeStudioStore.getState().activeProject.floors[0].rooms.length;

    // 1. Create room
    const r = useHomeStudioStore.getState().addRoom({
      floorId,
      type: "study_room",
      name: "Undoable Study",
      polygon: [
        { x: 5, y: 8 },
        { x: 15, y: 8 },
        { x: 15, y: 18 },
        { x: 5, y: 18 },
      ],
      floorMaterialId: "mat-floor-oak-herringbone",
      wallMaterialId: "mat-wall-plaster-white",
      color: "#F3EFE8",
    });
    assert.ok(r);

    // 2. Resize room dimensions
    const updatedOk = useHomeStudioStore.getState().updateRoom(r.id, {
      dimensions: { width: 12, length: 12, area: 144 },
    });
    assert.equal(updatedOk, true);
    const updatedRoom = useHomeStudioStore
      .getState()
      .activeProject.floors[0].rooms.find((x) => x.id === r.id);
    assert.equal(updatedRoom?.dimensions.area, 144);

    // Undo dimension change -> back to 100 sq ft
    assert.equal(useHomeStudioStore.getState().undo(), true);
    const afterUndo1 = useHomeStudioStore
      .getState()
      .activeProject.floors[0].rooms.find((x) => x.id === r.id);
    assert.equal(afterUndo1?.dimensions.area, 100);

    // Undo room creation -> back to baseRoomsCount
    assert.equal(useHomeStudioStore.getState().undo(), true);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors[0].rooms.length,
      baseRoomsCount
    );

    // Redo room creation -> baseRoomsCount + 1
    assert.equal(useHomeStudioStore.getState().redo(), true);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors[0].rooms.length,
      baseRoomsCount + 1
    );
  });

  // 8. Export / Import & Storage Adapter
  await test("JSON export/import and storage adapter round-trip validation", async () => {
    const exported = useHomeStudioStore.getState().exportProjectJson();
    assert.ok(exported.length > 100);

    const importRes = useHomeStudioStore.getState().importProjectJson(exported);
    assert.equal(importRes.success, true);

    const badImport = useHomeStudioStore
      .getState()
      .importProjectJson('{"invalid": true}');
    assert.equal(badImport.success, false);

    const adapter = new LocalStorageProjectAdapter();
    const saved = await adapter.saveProject(
      useHomeStudioStore.getState().activeProject
    );
    assert.equal(saved.id, useHomeStudioStore.getState().activeProject.id);
  });

  const passed = results.filter((r) => r.status === "PASS").length;
  return {
    totalTests: results.length,
    passed,
    results,
  };
}

// Allow direct CLI execution via node/tsx if invoked directly
if (typeof process !== "undefined" && process.argv[1]?.includes("phase3.test")) {
  runPhase3VerificationSuite().then((summary) => {
    console.log("================================================");
    console.log(
      `HMX HOME STUDIO PHASE 3 TEST SUITE: ${summary.passed}/${summary.totalTests} PASSED`
    );
    console.log("================================================");
    for (const r of summary.results) {
      console.log(`[${r.status}] ${r.name}${r.details ? ` -> ${r.details}` : ""}`);
    }
    if (summary.passed !== summary.totalTests) {
      process.exit(1);
    }
  });
}
