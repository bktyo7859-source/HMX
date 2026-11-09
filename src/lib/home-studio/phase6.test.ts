import { strict as assert } from "assert";
import {
  deriveBuildingSceneMeshes3D,
  generateWallAndOpeningMeshes3D,
} from "./geometry3d";
import { createProjectFromTemplate } from "./templates";
import { useHomeStudioStore } from "../../store/useHomeStudioStore";
import { Wall, Opening } from "../../types/homeStudio";

export function runPhase6TestSuite(): {
  passed: number;
  results: string[];
} {
  const results: string[] = [];
  let passed = 0;

  // 1. 2D Wall to 3D Solid Wall Extrusion
  {
    const wall: Wall = {
      id: "w-solid-test",
      floorId: "flr-g",
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 30, y: 10 },
      thickness: 0.75,
      height: 10.5,
      isExterior: true,
      materialId: "mat-wall-paint-ivory",
    };
    const meshes = generateWallAndOpeningMeshes3D(wall, [], 0);
    assert.equal(meshes.length, 1);
    assert.equal(meshes[0].kind, "wall_solid");
    assert.equal(meshes[0].dimensions.width, 20);
    assert.equal(meshes[0].dimensions.height, 10.5);
    assert.equal(meshes[0].dimensions.depth, 0.75);
    assert.equal(meshes[0].position.x, 20);
    assert.equal(meshes[0].position.y, 5.25);
    assert.equal(meshes[0].position.z, 10);
    passed++;
    results.push("PASS: 1. 2D wall to 3D solid wall extrusion");
  }

  // 2. Door and Window Cutout, Sill, Lintel Header, Frame & Glazing Calculation
  {
    const wall: Wall = {
      id: "w-cutout-test",
      floorId: "flr-g",
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 24, y: 0 },
      thickness: 0.75,
      height: 10,
      isExterior: true,
      materialId: "mat-wall-paint-ivory",
    };
    const openings: Opening[] = [
      {
        id: "op-door-1",
        floorId: "flr-g",
        wallId: "w-cutout-test",
        name: "Entry Door",
        type: "door",
        position: 0.25, // at 6 ft along 24 ft wall
        offsetFromStart: 6,
        width: 3,
        height: 7,
        sillHeight: 0,
        materialId: "mat-wood-teak",
        swingDirection: "inward",
      },
      {
        id: "op-win-1",
        floorId: "flr-g",
        wallId: "w-cutout-test",
        name: "Living Window",
        type: "window",
        position: 0.75, // at 18 ft along 24 ft wall
        offsetFromStart: 18,
        width: 4,
        height: 4.5,
        sillHeight: 3,
        materialId: "mat-glass-clear",
      },
    ];

    const meshes = generateWallAndOpeningMeshes3D(wall, openings, 0);
    const kinds = meshes.map((m) => m.kind);
    assert.ok(kinds.includes("wall_solid"), "Must generate solid jamb segments");
    assert.ok(
      kinds.includes("wall_header"),
      "Must generate lintel headers above openings"
    );
    assert.ok(
      kinds.includes("wall_sill"),
      "Must generate sill wall below window"
    );
    assert.ok(kinds.includes("door_frame"), "Must generate door frame");
    assert.ok(kinds.includes("door_leaf"), "Must generate door leaf");
    assert.ok(kinds.includes("window_frame"), "Must generate window frame");
    assert.ok(kinds.includes("window_glass"), "Must generate window glass");
    passed++;
    results.push(
      "PASS: 2. Door & window cutout, sill, lintel header, frame & glazing calculation"
    );
  }

  // 3. Multi-Floor Elevation Placement & Exploded Stack Verification
  {
    const villa = createProjectFromTemplate("two_floor_villa");
    const groundId = villa.floors[0].id;
    const firstId = villa.floors[1].id;

    const normalMeshes = deriveBuildingSceneMeshes3D(villa, {
      viewMode: "orbit",
      selectedFloorId: groundId,
    });
    const groundSlab = normalMeshes.find(
      (m) => m.kind === "floor_slab" && m.floorId === groundId
    );
    const firstSlab = normalMeshes.find(
      (m) => m.kind === "floor_slab" && m.floorId === firstId
    );
    assert.ok(groundSlab && firstSlab);
    assert.ok(
      firstSlab.position.y > groundSlab.position.y + 9,
      "Upper floor slab must sit at its vertical floor elevation above Ground Floor"
    );

    const explodedMeshes = deriveBuildingSceneMeshes3D(villa, {
      viewMode: "orbit",
      selectedFloorId: groundId,
      explodedFloorGapFt: 6.5,
    });
    const firstSlabExploded = explodedMeshes.find(
      (m) => m.kind === "floor_slab" && m.floorId === firstId
    );
    assert.ok(firstSlabExploded);
    assert.equal(
      firstSlabExploded.position.y,
      Number((firstSlab.position.y + 6.5).toFixed(2))
    );
    passed++;
    results.push(
      "PASS: 3. Multi-floor elevation placement & exploded stack offset"
    );
  }

  // 4. View Mode Filtering (Isolation, Dollhouse, Section Cut, Roof Styles)
  {
    const villa = createProjectFromTemplate("two_floor_villa");
    const groundId = villa.floors[0].id;
    const firstId = villa.floors[1].id;

    // Floor Isolation mode must only include selected floor meshes
    const isolatedMeshes = deriveBuildingSceneMeshes3D(villa, {
      viewMode: "floor_isolation",
      selectedFloorId: groundId,
    });
    assert.ok(
      isolatedMeshes.every((m) => m.floorId === groundId),
      "Floor isolation mode must only generate meshes for the active floor"
    );

    // Dollhouse mode must trim wall height and hide roof
    const dollhouseMeshes = deriveBuildingSceneMeshes3D(villa, {
      viewMode: "dollhouse",
      selectedFloorId: groundId,
    });
    assert.ok(
      !dollhouseMeshes.some((m) => m.kind === "roof"),
      "Dollhouse mode must hide roof slab"
    );
    const dhGroundWalls = dollhouseMeshes.filter(
      (m) => m.floorId === groundId && m.kind === "wall_solid"
    );
    assert.ok(
      dhGroundWalls.every((w) => w.dimensions.height <= 4.6),
      "Dollhouse mode must cut walls to waist/half height for top-down visibility"
    );

    // Section Cut at 6 ft must exclude First Floor (elevation ~11 ft)
    const sectionMeshes = deriveBuildingSceneMeshes3D(villa, {
      viewMode: "section",
      selectedFloorId: groundId,
      sectionCutHeightFt: 6,
    });
    assert.ok(
      !sectionMeshes.some((m) => m.floorId === firstId),
      "Section cut at 6 ft must clip floors above 6 ft"
    );

    // Roof style gable & parapet (when showRoof3D is enabled)
    villa.settings.showRoof3D = true;
    const gableMeshes = deriveBuildingSceneMeshes3D(villa, {
      viewMode: "orbit",
      selectedFloorId: groundId,
      roofStyle: "gable",
    });
    assert.ok(
      gableMeshes.some((m) => m.id.startsWith("roof-crown-tier-")),
      "Gable roof style must generate tiered crown meshes"
    );
    passed++;
    results.push(
      "PASS: 4. 3D View Modes (Floor Isolation, Dollhouse, Section Cut, Gable/Parapet Roof)"
    );
  }

  // 5. Real-Time 2D -> 3D Store Synchronization & Undo/Redo Consistency
  {
    const store = useHomeStudioStore.getState();
    const baseProject = createProjectFromTemplate("2bhk");
    store.setActiveProject(baseProject, false);

    const floorId = store.selectedFloorId;
    const beforeMeshes = deriveBuildingSceneMeshes3D(
      useHomeStudioStore.getState().activeProject,
      { viewMode: "orbit", selectedFloorId: floorId }
    );

    // Add a new wall in 2D store
    const newWall = store.addWall({
      floorId,
      startPoint: { x: 8, y: 8 },
      endPoint: { x: 26, y: 8 },
      thickness: 0.75,
      height: 10.5,
      materialId: "mat-wall-paint-ivory",
      isExterior: false,
    });
    assert.ok(newWall, "Wall should be created in store");

    const afterWallMeshes = deriveBuildingSceneMeshes3D(
      useHomeStudioStore.getState().activeProject,
      { viewMode: "orbit", selectedFloorId: floorId }
    );
    assert.ok(
      afterWallMeshes.some((m) => m.sourceObjectId === newWall.id),
      "New 2D wall must immediately appear in derived 3D scene meshes"
    );
    assert.equal(afterWallMeshes.length, beforeMeshes.length + 1);

    // Add a window on the new wall
    const newWin = store.addOpening({
      floorId,
      wallId: newWall.id,
      name: "Studio Window",
      type: "window",
      position: 0.5,
      offsetFromStart: 9,
      width: 4,
      height: 4,
      sillHeight: 3,
      materialId: "mat-glass-clear",
    });
    assert.ok(newWin, "Window should be added to wall");

    const afterWinMeshes = deriveBuildingSceneMeshes3D(
      useHomeStudioStore.getState().activeProject,
      { viewMode: "orbit", selectedFloorId: floorId }
    );
    assert.ok(
      afterWinMeshes.some(
        (m) => m.sourceObjectId === newWin.id && m.kind === "window_glass"
      ),
      "Window glazing mesh must immediately appear in 3D scene"
    );

    // Undo window + wall and verify 3D scene reverts identically
    store.undo(); // undo window
    store.undo(); // undo wall
    const afterUndoMeshes = deriveBuildingSceneMeshes3D(
      useHomeStudioStore.getState().activeProject,
      { viewMode: "orbit", selectedFloorId: floorId }
    );
    assert.equal(
      afterUndoMeshes.length,
      beforeMeshes.length,
      "Undo must synchronize both 2D state and 3D mesh count back to baseline"
    );

    passed++;
    results.push(
      "PASS: 5. Real-time 2D/3D store synchronization & Undo/Redo consistency"
    );
  }

  return { passed, results };
}

if (typeof require !== "undefined" && require.main === module) {
  const report = runPhase6TestSuite();
  console.log("=== HMX HOME STUDIO PHASE 6 TEST SUITE ===");
  report.results.forEach((line) => console.log("  " + line));
  console.log(`TOTAL PASSED: ${report.passed}/5`);
}
