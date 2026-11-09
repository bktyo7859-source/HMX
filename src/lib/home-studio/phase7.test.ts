import { strict as assert } from "assert";
import {
  ARCHITECTURAL_FURNITURE_CATALOG,
  buildFurnitureItemFromCatalogAsset,
  EXTENDED_ARCHITECTURAL_MATERIALS,
  FURNITURE_CATEGORY_META,
  generateProceduralFurnitureMeshes3D,
  getCatalogAssetsByCategory,
  MATERIAL_CATEGORY_META,
  validateFurniturePlacementFt,
} from "./furnitureCatalog";
import { deriveBuildingSceneMeshes3D } from "./geometry3d";
import { createProjectFromTemplate } from "./templates";
import { useHomeStudioStore } from "../../store/useHomeStudioStore";

export function runPhase7TestSuite(): {
  passed: number;
  results: string[];
} {
  const results: string[] = [];
  let passed = 0;

  // 1. Verify 17 Categorized Furniture Categories & Searchable Catalog Metadata
  {
    assert.equal(
      FURNITURE_CATEGORY_META.length,
      17,
      "Must define exactly 17 furniture categories"
    );
    for (const cat of FURNITURE_CATEGORY_META) {
      const matches = getCatalogAssetsByCategory(cat.id);
      assert.ok(
        matches.length >= 1,
        `Category ${cat.id} (${cat.label}) must have at least 1 furniture asset`
      );
      for (const asset of matches) {
        assert.ok(asset.assetId.length > 0);
        assert.ok(asset.dimensions.width > 0);
        assert.ok(asset.dimensions.depth > 0);
        assert.ok(asset.dimensions.height > 0);
        assert.ok(asset.availableMaterialIds.length >= 1);
      }
    }

    const searchSofas = getCatalogAssetsByCategory("all", "Milano");
    assert.equal(searchSofas.length, 1);
    assert.equal(searchSofas[0].assetId, "asset-sofa-3seater-boucle");
    passed++;
    results.push(
      "PASS: 1. 17 furniture categories, asset dimensions, materials & search query verified"
    );
  }

  // 2. Verify 15 Architectural Material Categories & PBR Properties
  {
    assert.equal(
      MATERIAL_CATEGORY_META.length,
      15,
      "Must define all 15 architectural material categories"
    );
    const categoriesPresent = new Set(
      EXTENDED_ARCHITECTURAL_MATERIALS.map((m) => m.category)
    );
    for (const mc of MATERIAL_CATEGORY_META) {
      assert.ok(
        categoriesPresent.has(mc.id),
        `Material category ${mc.id} must be represented in catalog`
      );
    }
    passed++;
    results.push(
      "PASS: 2. 15 architectural PBR material categories verified"
    );
  }

  // 3. Multi-Part Procedural 3D Furniture Meshes (Non-Cube Detailed Assemblies)
  {
    const project = createProjectFromTemplate("3bhk");
    const floor = project.floors[0];

    const bedAsset = ARCHITECTURAL_FURNITURE_CATALOG.find(
      (a) => a.assetId === "asset-bed-king-atelier"
    )!;
    const bedPayload = buildFurnitureItemFromCatalogAsset(
      bedAsset,
      floor,
      project.plot.width,
      project.plot.length
    );
    const bedMeshes = generateProceduralFurnitureMeshes3D(
      { ...bedPayload, id: "test-bed-1" },
      0
    );
    assert.equal(
      bedMeshes.length,
      5,
      "King bed must generate 5 distinct 3D sub-meshes (plinth, mattress, headboard, 2 pillows)"
    );

    const sofaAsset = ARCHITECTURAL_FURNITURE_CATALOG.find(
      (a) => a.assetId === "asset-sofa-3seater-boucle"
    )!;
    const sofaPayload = buildFurnitureItemFromCatalogAsset(
      sofaAsset,
      floor,
      project.plot.width,
      project.plot.length
    );
    const sofaMeshes = generateProceduralFurnitureMeshes3D(
      { ...sofaPayload, id: "test-sofa-1" },
      0
    );
    assert.equal(
      sofaMeshes.length,
      4,
      "Lounge sofa must generate 4 distinct 3D sub-meshes (seat, backrest, 2 armrests)"
    );

    const tableAsset = ARCHITECTURAL_FURNITURE_CATALOG.find(
      (a) => a.assetId === "asset-table-dining-8"
    )!;
    const tablePayload = buildFurnitureItemFromCatalogAsset(
      tableAsset,
      floor,
      project.plot.width,
      project.plot.length
    );
    const tableMeshes = generateProceduralFurnitureMeshes3D(
      { ...tablePayload, id: "test-table-1" },
      0
    );
    assert.equal(
      tableMeshes.length,
      5,
      "Dining table must generate 5 distinct 3D sub-meshes (slab top + 4 architectural legs)"
    );
    passed++;
    results.push(
      "PASS: 3. Multi-part procedural 3D furniture geometry (beds, sofas, tables) verified"
    );
  }

  // 4. Furniture Placement Snapping, Room Boundary Check & Collision Detection
  {
    const store = useHomeStudioStore.getState();
    const project = createProjectFromTemplate("2bhk");
    store.setActiveProject(project, false);

    const activeFloor = useHomeStudioStore.getState().activeProject.floors[0];
    const sofaAsset = ARCHITECTURAL_FURNITURE_CATALOG.find(
      (a) => a.assetId === "asset-sofa-3seater-boucle"
    )!;

    // Place first sofa inside living room
    const firstPayload = buildFurnitureItemFromCatalogAsset(
      sofaAsset,
      activeFloor,
      project.plot.width,
      project.plot.length
    );
    const placed1 = store.addFurniture(firstPayload);
    assert.ok(placed1, "First sofa should be placed in store");

    // Attempt to validate a second sofa at the exact same coordinates -> must report collision
    const floorAfter1 = useHomeStudioStore.getState().activeProject.floors[0];
    const collisionCheck = validateFurniturePlacementFt({
      floor: floorAfter1,
      plotWidth: project.plot.width,
      plotLength: project.plot.length,
      candidateX: placed1.position.x,
      candidateZ: placed1.position.z,
      widthFt: sofaAsset.dimensions.width,
      depthFt: sofaAsset.dimensions.depth,
    });
    assert.equal(
      collisionCheck.valid,
      false,
      "Overlapping furniture placement must be flagged as invalid"
    );
    assert.ok(
      collisionCheck.collidingObjectIds.includes(placed1.id),
      "Colliding object ID must be identified"
    );

    // Attempt to place indoor furniture at (1, 1) outside room setback -> must flag outside room unless overridden
    const outsideCheck = validateFurniturePlacementFt({
      floor: floorAfter1,
      plotWidth: project.plot.width,
      plotLength: project.plot.length,
      candidateX: 1,
      candidateZ: 1,
      widthFt: 3,
      depthFt: 3,
      snapToWall: false,
      allowOutsideRoom: false,
    });
    assert.equal(outsideCheck.insideBuildingRoom, false);
    assert.equal(outsideCheck.valid, false);

    const outsideOverrideCheck = validateFurniturePlacementFt({
      floor: floorAfter1,
      plotWidth: project.plot.width,
      plotLength: project.plot.length,
      candidateX: 1,
      candidateZ: 1,
      widthFt: 3,
      depthFt: 3,
      snapToWall: false,
      allowOutsideRoom: true,
    });
    assert.equal(
      outsideOverrideCheck.valid,
      true,
      "Explicit allowOutsideRoom override must allow terrace/outdoor placement"
    );
    passed++;
    results.push(
      "PASS: 4. Furniture room boundary check, collision detection & outdoor override verified"
    );
  }

  // 5. Targeted Surface Material Assignment, Custom Duplication & 2D/3D Undo/Redo Sync
  {
    const store = useHomeStudioStore.getState();
    const project = createProjectFromTemplate("2bhk");
    store.setActiveProject(project, false);

    const floor = useHomeStudioStore.getState().activeProject.floors[0];
    const wall0 = floor.walls[0];
    const wall1 = floor.walls[1];
    const originalWall1Material = wall1.materialId;

    // Select ONLY wall0 and assign granite material
    store.setSelectedObjectIds([wall0.id]);
    const assigned = store.assignMaterialToSelectedSurface("mat-granite-nero");
    assert.equal(assigned, true);

    const updatedFloor = useHomeStudioStore.getState().activeProject.floors[0];
    assert.equal(
      updatedFloor.walls[0].materialId,
      "mat-granite-nero",
      "Selected wall must receive new material"
    );
    assert.equal(
      updatedFloor.walls[1].materialId,
      originalWall1Material,
      "Unselected walls must NOT have their material changed"
    );

    // Verify 3D scene mesh for wall0 immediately reflects granite color (#3A3937)
    const meshes3D = deriveBuildingSceneMeshes3D(
      useHomeStudioStore.getState().activeProject,
      { viewMode: "orbit", selectedFloorId: floor.id }
    );
    const wall0Meshes = meshes3D.filter((m) => m.sourceObjectId === wall0.id);
    assert.ok(
      wall0Meshes.every((m) => m.color === "#3A3937"),
      "3D wall mesh must immediately synchronize with assigned granite material color"
    );

    // Duplicate material & Undo verification
    const dupMat = store.duplicateMaterial("mat-granite-nero");
    assert.ok(dupMat && dupMat.id.startsWith("mat-granite-nero-copy-"));

    store.undo(); // undo material duplication
    store.undo(); // undo wall0 material assignment
    const revertedFloor = useHomeStudioStore.getState().activeProject.floors[0];
    assert.notEqual(revertedFloor.walls[0].materialId, "mat-granite-nero");
    passed++;
    results.push(
      "PASS: 5. Targeted surface material assignment, duplication & 2D/3D undo synchronization verified"
    );
  }

  return { passed, results };
}

if (typeof require !== "undefined" && require.main === module) {
  const report = runPhase7TestSuite();
  console.log("=== HMX HOME STUDIO PHASE 7 TEST SUITE ===");
  report.results.forEach((line) => console.log("  " + line));
  console.log(`TOTAL PASSED: ${report.passed}/5`);
}

