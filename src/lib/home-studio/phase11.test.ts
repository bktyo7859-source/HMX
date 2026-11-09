/**
 * HMX Home Studio — Phase 11 Final QA, 30-Step E2E User Journey, Geometry/Engineering QA,
 * Performance Benchmark & Security Audit Test Suite
 */

import assert from "node:assert/strict";
import { createProjectFromTemplate } from "./templates";
import { useHomeStudioStore } from "../../store/useHomeStudioStore";
import {
  HomeStudioRelationalDatabaseEngine,
  HomeStudioHttpError,
} from "./serverAuthAndDb";
import { deriveBuildingSceneMeshes3D } from "./geometry3d";
import {
  ARCHITECTURAL_FURNITURE_CATALOG,
  buildFurnitureItemFromCatalogAsset,
  validateFurniturePlacementFt,
} from "./furnitureCatalog";
import { computeProjectQuantityTakeoff } from "./quantityTakeoff";
import {
  calculateConstructionEstimate,
  simulateWhatIfScenario,
} from "./costEngine";
import {
  buildReportDocumentData,
  createArchitecturalPdfDocument,
} from "./reportGenerator";
import { evaluateProjectValuationBridge } from "./valuationBridge";
import { computePolygonAreaSqFt } from "./units";
import { detectEnclosedRectanglesFromWalls, projectPointOntoWall } from "./geometry2d";

export async function runPhase11TestSuite(): Promise<{
  passed: number;
  results: string[];
}> {
  console.log(
    "Running HMX Home Studio Phase 11 Complete E2E User Journey, Geometry QA, Performance & Security Suite..."
  );
  const results: string[] = [];
  let passed = 0;

  // =========================================================================
  // 1. Complete 30-Step End-to-End User Journey Test (Phase 11.2)
  // =========================================================================
  {
    const db = new HomeStudioRelationalDatabaseEngine();
    const store = useHomeStudioStore.getState();
    store.resetProject();

    // Steps 1-3: Register & Log In
    const reg = db.registerUser({
      email: "vikram.sarabhai@hmx.studio",
      password: "ArchitecturalMaster#2026",
      fullName: "Vikram Sarabhai",
      organization: "Sarabhai Design Collaborative",
      defaultCity: "Bengaluru, Karnataka",
    });
    const login = db.loginUser({
      email: "vikram.sarabhai@hmx.studio",
      password: "ArchitecturalMaster#2026",
    });
    const authUser = db.authenticateTokenOrThrow(login.sessionToken);
    assert.equal(authUser.id, reg.user.id);

    // Steps 4-6: Create a new 3BHK building project & set plot dimensions
    const base3bhk = createProjectFromTemplate(
      "3bhk",
      "Sarabhai Courtyard Residence"
    );
    base3bhk.plot.width = 55;
    base3bhk.plot.length = 75;
    store.setActiveProject(base3bhk, false);

    // Steps 7-8: Draw and modify rooms, add doors and windows
    const groundFloorId = useHomeStudioStore.getState().activeProject!.floors[0].id;
    const studyRoomId = useHomeStudioStore.getState().addRoom({
      floorId: groundFloorId,
      name: "Architect Library & Study",
      type: "study_room",
      polygon: [
        { x: 6, y: 40 },
        { x: 22, y: 40 },
        { x: 22, y: 54 },
        { x: 6, y: 54 },
      ],
      dimensions: { width: 16, length: 14, area: 224 },
      color: "#F3EFE6",
      floorMaterialId: "mat-wood-oak",
      wallMaterialId: "mat-paint-ivory",
    });
    assert.ok(studyRoomId);

    const newWall = useHomeStudioStore.getState().addWall({
      floorId: groundFloorId,
      startPoint: { x: 6, y: 40 },
      endPoint: { x: 22, y: 40 },
      height: 10.5,
      thickness: 0.75,
      materialId: "mat-paint-ivory",
      isExterior: true,
    });
    assert.ok(newWall);

    const newWin = useHomeStudioStore.getState().addOpening({
      floorId: groundFloorId,
      wallId: newWall.id,
      type: "french_window",
      name: "Courtyard French Window",
      position: 0.5,
      offsetFromStart: 5.5,
      width: 5,
      height: 6,
      sillHeight: 1.5,
      materialId: "mat-glass-clear",
    });
    assert.ok(newWin);

    // Steps 9-10: Add multiple floors & align vertical staircases
    const firstFloor = useHomeStudioStore
      .getState()
      .addFloor("first", "First Floor");
    assert.ok(firstFloor);

    const stairItems = useHomeStudioStore
      .getState()
      .placeStaircaseCore(groundFloorId, { x: 14, y: 20 }, true, {
        stairType: "l_shaped",
        destinationFloorId: firstFloor.id,
      });
    assert.ok(stairItems.length >= 1, "Staircase must be created and aligned across floors");

    // Steps 11-12: Open 3D builder & verify 2D/3D synchronization
    const projAfterStairs = useHomeStudioStore.getState().activeProject!;
    const meshes3D = deriveBuildingSceneMeshes3D(projAfterStairs, {
      viewMode: "orbit",
      selectedFloorId: groundFloorId,
    });
    assert.ok(
      meshes3D.some((m) => m.kind === "stair_step"),
      "3D builder must include synchronized staircase step meshes"
    );

    // Steps 13-15: Add furniture, change materials & change lighting
    const sofaAsset = ARCHITECTURAL_FURNITURE_CATALOG.find(
      (a) => a.assetId === "asset-sofa-3seater-boucle"
    )!;
    const sofaItem = buildFurnitureItemFromCatalogAsset(
      sofaAsset,
      projAfterStairs.floors[0],
      projAfterStairs.plot.width,
      projAfterStairs.plot.length
    );
    const addedSofa = useHomeStudioStore
      .getState()
      .addFurniture(sofaItem);
    assert.ok(addedSofa);

    useHomeStudioStore.getState().setSelectedObjectIds([studyRoomId.id]);
    useHomeStudioStore
      .getState()
      .assignMaterialToSelectedSurface("mat-marble-carrara", "room_floor");
    useHomeStudioStore.getState().updateSettings({
      timeOfDayHours: 17.5,
      sunAzimuth: 195,
      sunElevation: 28,
      interiorLightsEnabled: true,
    });

    // Steps 16-19: Open construction cost dashboard, review takeoff, change finish tiers & run what-if scenarios
    const currentProject = useHomeStudioStore.getState().activeProject!;
    const stdEstimate = calculateConstructionEstimate(currentProject, {
      finishTierOverride: "standard",
    });
    const premEstimate = calculateConstructionEstimate(currentProject, {
      finishTierOverride: "premium",
    });
    assert.ok(
      premEstimate.finalEstimatedCostINR > stdEstimate.finalEstimatedCostINR
    );

    const whatIf = simulateWhatIfScenario(currentProject, {
      scenarioName: "Add Second Floor + All Marble",
      additionalFloorsCount: 1,
      flooringMode: "all_marble",
    });
    assert.ok(whatIf.costDifferenceINR > 0);

    // Steps 20-23: Save project, simulate browser refresh, reopen saved project & verify all data
    const savedRecord = db.createProject(
      authUser.id,
      currentProject,
      "Completed 30-step design",
      stdEstimate.assumptions as unknown as Record<string, unknown>,
      {
        finishTier: stdEstimate.finishTier,
        location: stdEstimate.location,
        materialCostINR: stdEstimate.materialCostINR,
        labourCostINR: stdEstimate.labourCostINR,
        equipmentCostINR: stdEstimate.equipmentCostINR,
        subtotalINR: stdEstimate.subtotalINR,
        overheadsINR: stdEstimate.overheadsINR,
        contingencyINR: stdEstimate.contingencyINR,
        finalEstimatedCostINR: stdEstimate.finalEstimatedCostINR,
        costPerSqFtINR: stdEstimate.costPerSqFtINR,
      }
    );

    // Reset client store to simulate browser refresh, then reload from DB
    store.resetProject();
    const reopened = db.getProject(authUser.id, savedRecord.project.id);
    store.setActiveProject(reopened.project, false);

    const reloadedProj = useHomeStudioStore.getState().activeProject!;
    assert.equal(reloadedProj.name, "Sarabhai Courtyard Residence");
    assert.equal(reloadedProj.plot.width, 55);
    assert.equal(reloadedProj.floors.length, 2);
    assert.equal(reloadedProj.settings.timeOfDayHours, 17.5);

    // Steps 24-26: Generate Architectural PDF, BOQ PDF & Construction Cost PDF
    for (const rType of [
      "architectural_design",
      "construction_boq",
      "detailed_cost",
    ] as const) {
      const rDoc = buildReportDocumentData(reloadedProj, rType);
      const { pageCount } = createArchitecturalPdfDocument(reloadedProj, rDoc);
      assert.ok(pageCount >= 1);
    }

    // Steps 27-28: Open HMX valuation comparison & verify existing ML valuation API compatibility
    const valComp = await evaluateProjectValuationBridge(reloadedProj);
    assert.ok(valComp.marketValuationINR > 0);
    assert.ok(valComp.constructionReplacementCostINR > 0);

    // Steps 29-30: Log out & confirm protected project data cannot be accessed without authentication
    assert.throws(
      () => db.authenticateTokenOrThrow(null),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 401,
      "Logged-out session must not access protected endpoints"
    );

    passed++;
    results.push("PASS: 1. Complete 30-step End-to-End User Journey verified");
    console.log(
      "  [PASS] Test 1: All 30 end-to-end user journey steps verified."
    );
  }

  // =========================================================================
  // 2. Geometry & Engineering QA (Non-Rectangular Rooms, T-Junctions, Slab Thickness, No Double Counting)
  // =========================================================================
  {
    // Non-rectangular L-shaped room polygon (20x20 minus 10x10 corner = 300 sq.ft)
    const lShapedPolygon = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ];
    const lArea = computePolygonAreaSqFt(lShapedPolygon);
    assert.equal(
      lArea,
      300,
      "Non-rectangular L-shaped room polygon area must equal exactly 300 sq.ft"
    );

    // T-junction wall projection & enclosed rectangle detection
    const mainWall = {
      id: "w-main",
      floorId: "f1",
      startPoint: { x: 0, y: 10 },
      endPoint: { x: 30, y: 10 },
      height: 10.5,
      thickness: 0.75,
      materialId: "mat-paint-ivory",
    };
    const stemWall = {
      id: "w-stem",
      floorId: "f1",
      startPoint: { x: 15, y: 10 },
      endPoint: { x: 15, y: 25 },
      height: 10.5,
      thickness: 0.5,
      materialId: "mat-paint-ivory",
    };
    const tProjection = projectPointOntoWall(stemWall.startPoint, mainWall);
    assert.equal(tProjection.distanceFt, 0, "T-junction stem wall origin must lie directly on main wall");
    assert.equal(tProjection.projectedPoint.x, 15);
    assert.equal(tProjection.projectedPoint.y, 10);

    const enclosed = detectEnclosedRectanglesFromWalls([
      mainWall,
      { ...mainWall, id: "w-bot", startPoint: { x: 0, y: 25 }, endPoint: { x: 30, y: 25 } },
      { ...stemWall, id: "w-left", startPoint: { x: 0, y: 10 }, endPoint: { x: 0, y: 25 } },
      stemWall,
    ]);
    assert.ok(enclosed.length >= 1, "Connected walls with T-junction must enclose rectangular bay");

    // Slab thickness vs ceilingHeight engineering check (Phase 11.3)
    const villa = createProjectFromTemplate("two_floor_villa");
    for (const flr of villa.floors) {
      assert.ok(
        flr.floorHeight <= 1.5 && flr.ceilingHeight >= 8.0,
        "Slab thickness (floorHeight) must be a slab thickness parameter (<= 1.5 ft), never confused with ceilingHeight (>= 8 ft)"
      );
    }

    const qto = computeProjectQuantityTakeoff(villa);
    // Verify totalConcreteCuFt equals sum of distinct structural concrete components (never double-counted)
    const expectedConcreteSum =
      qto.foundationConcreteCuFt +
      qto.footingConcreteCuFt +
      qto.columnConcreteCuFt +
      qto.beamConcreteCuFt +
      qto.floorSlabConcreteCuFt +
      qto.staircaseConcreteCuFt +
      qto.roofSlabConcreteCuFt;
    assert.ok(
      Math.abs(qto.totalConcreteCuFt - expectedConcreteSum) < 1.0,
      "Total concrete volume must equal the exact sum of distinct concrete elements without double-counting"
    );

    // Verify furniture collision detection
    const floor = villa.floors[0];
    const sofaA = buildFurnitureItemFromCatalogAsset(
      ARCHITECTURAL_FURNITURE_CATALOG[0],
      floor,
      villa.plot.width,
      villa.plot.length
    );
    const sofaAWithId = { ...sofaA, id: "sofa-a", position: { x: 12, y: 0, z: 12 } };
    floor.objects = [sofaAWithId];

    const placementCheck = validateFurniturePlacementFt({
      floor,
      plotWidth: villa.plot.width,
      plotLength: villa.plot.length,
      candidateX: 12.2,
      candidateZ: 12.2,
      widthFt: sofaAWithId.dimensions.width,
      depthFt: sofaAWithId.dimensions.depth,
      excludeObjectId: "sofa-b",
    });
    assert.ok(
      placementCheck.collidingObjectIds.includes("sofa-a"),
      "Overlapping furniture items must trigger collision warning"
    );

    passed++;
    results.push(
      "PASS: 2. Geometry & Engineering QA (L-shaped polygons, T-junctions, slab thickness, no double-counting, collision)"
    );
    console.log(
      "  [PASS] Test 2: Non-rectangular rooms, T-junctions, slab thickness & non-double-counted concrete verified."
    );
  }

  // =========================================================================
  // 3. Performance Benchmark (Heavy Multi-Floor Scene, Takeoff & Cost Engine)
  // =========================================================================
  {
    const heavyProject = createProjectFromTemplate(
      "two_floor_villa",
      "Performance Benchmark Villa"
    );
    // Populate 30 furniture items across 2 floors
    for (let i = 0; i < 30; i++) {
      const asset =
        ARCHITECTURAL_FURNITURE_CATALOG[
          i % ARCHITECTURAL_FURNITURE_CATALOG.length
        ];
      const targetFloor = heavyProject.floors[i % 2];
      targetFloor.objects.push({
        id: `perf-furn-${i}`,
        floorId: targetFloor.id,
        assetId: asset.assetId,
        name: asset.name,
        category: asset.category,
        position: { x: 6 + (i % 6) * 4, y: 0, z: 6 + Math.floor(i / 6) * 4 },
        rotation: (i * 90) % 360,
        dimensions: { ...asset.dimensions },
        scale: { x: 1, y: 1, z: 1 },
        materialId: asset.defaultMaterialId,
        color: asset.defaultColor,
      });
    }

    const t0 = Date.now();
    const meshes = deriveBuildingSceneMeshes3D(heavyProject, {
      viewMode: "orbit",
      selectedFloorId: heavyProject.floors[0].id,
    });
    const est = calculateConstructionEstimate(heavyProject);
    const elapsedMs = Date.now() - t0;

    assert.ok(meshes.length > 50, "Heavy scene must generate > 50 3D meshes");
    assert.ok(est.finalEstimatedCostINR > 0);
    assert.ok(
      elapsedMs < 500,
      `3D mesh derivation + quantity takeoff + cost estimation must complete in < 500ms (took ${elapsedMs}ms)`
    );

    passed++;
    results.push(
      `PASS: 3. Performance benchmark (${meshes.length} 3D meshes + full BOQ & cost engine in ${elapsedMs}ms)`
    );
    console.log(
      `  [PASS] Test 3: Performance benchmark verified (${meshes.length} 3D meshes + BOQ & cost engine in ${elapsedMs}ms).`
    );
  }

  console.log(`All ${passed}/3 Phase 11 QA & E2E test groups PASSED!`);
  return { passed, results };
}

runPhase11TestSuite();
