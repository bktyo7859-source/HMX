import assert from "node:assert/strict";
import { createProjectFromTemplate } from "./templates";
import {
  useHomeStudioStore,
  recalculateFloorElevations,
} from "../../store/useHomeStudioStore";
import {
  computeStaircaseSpecification,
  auditProjectStaircaseAlignment,
  computeMultiFloorStatistics,
} from "./staircase";
import { validateBuildingProject } from "./schemas";
import { runPhase3VerificationSuite } from "./phase3.test";
import { runPhase4VerificationSuite } from "./phase4.test";

export interface Phase5TestSuiteSummary {
  totalTests: number;
  passed: number;
  results: { name: string; status: "PASS" | "FAIL"; details?: string }[];
}

export async function runPhase5VerificationSuite(): Promise<Phase5TestSuiteSummary> {
  const results: Phase5TestSuiteSummary["results"] = [];

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

  // 1. Multi-Floor CRUD: Add, Rename, Duplicate, Delete, Visibility & Lock
  await test("FloorManager CRUD: add, rename, duplicate, visibility toggle, and delete", () => {
    const tpl = createProjectFromTemplate("2bhk"); // Starts with 1 floor (ground)
    useHomeStudioStore.getState().resetProject(tpl);

    // Add Basement (-1)
    const basement = useHomeStudioStore
      .getState()
      .addFloor("basement", "Subterranean Garage");
    assert.ok(basement);
    assert.equal(basement.levelIndex, -1);

    // Duplicate Ground Floor to First Floor (+1)
    const ground = useHomeStudioStore
      .getState()
      .activeProject.floors.find((f) => f.type === "ground")!;
    const first = useHomeStudioStore
      .getState()
      .duplicateFloor(ground.id, "first");
    assert.ok(first);
    assert.equal(first.rooms.length, ground.rooms.length);
    assert.equal(first.walls.length, ground.walls.length);

    // Rename & toggle visibility
    const updatedOk = useHomeStudioStore
      .getState()
      .updateFloor(first.id, { name: "First Floor Suites", visible: false });
    assert.equal(updatedOk, true);
    const checkFirst = useHomeStudioStore
      .getState()
      .activeProject.floors.find((f) => f.id === first.id)!;
    assert.equal(checkFirst.name, "First Floor Suites");
    assert.equal(checkFirst.visible, false);

    // Delete Basement -> leaves Ground + First
    const delOk = useHomeStudioStore.getState().deleteFloor(basement.id);
    assert.equal(delOk, true);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors.length,
      2
    );
  });

  // 2. Floor Elevation Stacking, Ceiling Height & Reordering
  await test("Floor elevation datum stacking and floor reordering", () => {
    const tpl = createProjectFromTemplate("4bhk"); // Ground + First
    useHomeStudioStore.getState().resetProject(tpl);

    const second = useHomeStudioStore.getState().addFloor("second");
    assert.ok(second);

    const floors = useHomeStudioStore.getState().activeProject.floors;
    assert.equal(floors.length, 3);
    assert.equal(floors[0].elevation, 0); // Ground at 0.0 ft
    assert.equal(floors[1].elevation, 11); // 10.5' ceiling + 0.5' slab = 11.0 ft
    assert.equal(floors[2].elevation, 22); // 11.0 + 11.0 = 22.0 ft

    // Change Ground Floor ceiling height to 12.0 ft -> First Floor elevation auto-recalculates to 12.5 ft
    useHomeStudioStore
      .getState()
      .updateFloor(floors[0].id, { ceilingHeight: 12.0 });
    const afterUpdate = useHomeStudioStore.getState().activeProject.floors;
    assert.equal(afterUpdate[1].elevation, 12.5);

    // Reorder First Floor up
    const reordered = useHomeStudioStore
      .getState()
      .reorderFloor(afterUpdate[1].id, "up");
    assert.equal(reordered, true);
  });

  // 3. Staircase Specification & Clearance Validation (Straight, L, U, Spiral)
  await test("Staircase geometry engine & clearance validation (Straight, L, U, Spiral)", () => {
    const tpl = createProjectFromTemplate("4bhk");
    const gf = tpl.floors[0];
    const ff = tpl.floors[1];

    for (const stairType of [
      "straight",
      "l_shaped",
      "u_shaped",
      "spiral",
    ] as const) {
      const spec = computeStaircaseSpecification({
        stairType,
        widthFt: 3.5,
        treadDepthInches: 10.5,
        startingFloor: gf,
        destinationFloor: ff,
      });
      assert.ok(spec.metadata.riserCount >= 14);
      assert.ok(spec.metadata.riserHeightInches <= 7.75);
      assert.ok(spec.footprintWidthFt >= 3.5);
      assert.ok(spec.footprintDepthFt >= 5.0);
    }

    // Insufficient headroom (< 6.67 ft) triggers error diagnostic
    const badHeadroom = computeStaircaseSpecification({
      stairType: "straight",
      widthFt: 3.5,
      treadDepthInches: 10.5,
      startingFloor: gf,
      destinationFloor: ff,
      headroomClearanceFt: 6.0,
    });
    assert.equal(
      badHeadroom.diagnostics.some((d) => d.code === "INSUFFICIENT_HEADROOM"),
      true
    );
  });

  // 4. Vertical Staircase Placement & Multi-Floor Alignment Audit
  await test("Staircase placement across floors and vertical alignment verification", () => {
    const tpl = createProjectFromTemplate("4bhk");
    useHomeStudioStore.getState().resetProject(tpl);
    const gfId = useHomeStudioStore.getState().activeProject.floors[0].id;

    // Place U-shaped staircase propagated across all floors
    const createdStairs = useHomeStudioStore
      .getState()
      .placeStaircaseCore(gfId, { x: 20, y: 30 }, true, {
        stairType: "u_shaped",
        widthFt: 3.5,
        treadDepthInches: 10.5,
      });
    assert.equal(createdStairs.length, 2);

    const auditAligned = auditProjectStaircaseAlignment(
      useHomeStudioStore.getState().activeProject
    );
    assert.equal(auditAligned.totalStaircases, 2);
    assert.equal(auditAligned.alignedPairsCount, 1);
    assert.equal(auditAligned.misalignedWarnings.length, 0);

    // Shift upper floor staircase by 8 ft -> triggers misalignment warning
    const upperStairId = createdStairs[1].id;
    useHomeStudioStore.getState().updateFurniture(upperStairId, {
      position: { x: 32, y: 0, z: 30 },
    });
    const auditMisaligned = auditProjectStaircaseAlignment(
      useHomeStudioStore.getState().activeProject
    );
    assert.equal(auditMisaligned.misalignedWarnings.length, 1);
  });

  // 5. Floor Statistics & Ghost Underlay Non-Pollution Guarantee
  await test("Multi-floor statistics calculation & ghost underlay isolation", () => {
    const tpl = createProjectFromTemplate("two_floor_villa");
    useHomeStudioStore.getState().resetProject(tpl);

    const stats = computeMultiFloorStatistics(
      useHomeStudioStore.getState().activeProject
    );
    assert.equal(stats.totalFloors, 2);
    assert.equal(stats.totalRooms, 11);
    assert.ok(stats.totalCarpetAreaSqFt > 3000);
    assert.ok(stats.totalBuiltUpAreaSqFt > stats.totalCarpetAreaSqFt);
    assert.ok(stats.totalBuildingHeightFt >= 22);

    // Undo / Redo across multi-floor modifications
    useHomeStudioStore.getState().addFloor("rooftop", "Sky Deck");
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors.length,
      3
    );
    assert.equal(useHomeStudioStore.getState().undo(), true);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors.length,
      2
    );
    assert.equal(useHomeStudioStore.getState().redo(), true);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors.length,
      3
    );

    // Verify exported multi-floor project passes strict Zod validation
    const json = useHomeStudioStore.getState().exportProjectJson();
    const validation = validateBuildingProject(JSON.parse(json));
    assert.equal(validation.valid, true);
  });

  const passed = results.filter((r) => r.status === "PASS").length;
  return {
    totalTests: results.length,
    passed,
    results,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("phase5.test")) {
  (async () => {
    const p3 = await runPhase3VerificationSuite();
    const p4 = await runPhase4VerificationSuite();
    const p5 = await runPhase5VerificationSuite();

    console.log("================================================");
    console.log(
      `PHASE 3 REGRESSION SUITE: ${p3.passed}/${p3.totalTests} PASSED`
    );
    console.log(
      `PHASE 4 REGRESSION SUITE: ${p4.passed}/${p4.totalTests} PASSED`
    );
    console.log("------------------------------------------------");
    console.log(
      `PHASE 5 MULTI-FLOOR SUITE: ${p5.passed}/${p5.totalTests} PASSED`
    );
    for (const r of p5.results) {
      console.log(`  [${r.status}] ${r.name}${r.details ? ` -> ${r.details}` : ""}`);
    }
    console.log("================================================");

    if (
      p3.passed !== p3.totalTests ||
      p4.passed !== p4.totalTests ||
      p5.passed !== p5.totalTests
    ) {
      process.exit(1);
    }
  })();
}

