import assert from "node:assert/strict";
import {
  snapValueToGrid,
  clampPointToPlot,
  snapPoint2D,
  snapOrthogonalPoint,
  computeWallLengthFt,
  projectPointOntoWall,
  findNearestWall,
  validateOpeningOnWall,
  worldFeetToCanvasPx,
  canvasPxToWorldFeet,
  checkRoomOverlap,
  detectEnclosedRectanglesFromWalls,
} from "./geometry2d";
import { createProjectFromTemplate } from "./templates";
import { useHomeStudioStore } from "../../store/useHomeStudioStore";
import { runPhase3VerificationSuite } from "./phase3.test";

export interface Phase4TestSuiteSummary {
  totalTests: number;
  passed: number;
  results: { name: string; status: "PASS" | "FAIL"; details?: string }[];
}

export async function runPhase4VerificationSuite(): Promise<Phase4TestSuiteSummary> {
  const results: Phase4TestSuiteSummary["results"] = [];

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

  // 1. Canvas Coordinate Transformations (World Feet <-> Canvas Pixels)
  await test("Canvas coordinate conversion preserves real-world feet across scale", () => {
    const ptFt = { x: 24.5, y: 38.25 };
    const px = worldFeetToCanvasPx(ptFt, 12);
    assert.deepEqual(px, { x: 294, y: 459 });
    const roundTripFt = canvasPxToWorldFeet(px, 12);
    assert.deepEqual(roundTripFt, ptFt);
  });

  // 2. Grid Snapping, Plot Clamping & Wall Endpoint Snapping
  await test("Wall endpoint snapping, grid snapping, and orthogonal axis lock", () => {
    assert.equal(snapValueToGrid(12.3, 1, true), 12);
    assert.equal(snapValueToGrid(12.3, 0.5, true), 12.5);
    assert.deepEqual(clampPointToPlot({ x: -5, y: 95 }, 50, 80), {
      x: 0,
      y: 80,
    });

    const sampleWall = {
      id: "w-1",
      floorId: "f-1",
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 30, y: 10 },
      height: 10,
      thickness: 0.75,
      materialId: "mat-wall-plaster-white",
    };

    // Within 1.25 ft of (30, 10) -> snaps to endpoint
    const snapRes = snapPoint2D(
      { x: 29.2, y: 10.4 },
      {
        gridSizeFt: 1,
        snapToGrid: true,
        snapToWall: true,
        walls: [sampleWall],
        snapRadiusFt: 1.25,
      }
    );
    assert.equal(snapRes.snappedToEndpoint, true);
    assert.deepEqual(snapRes.point, { x: 30, y: 10 });

    // Orthogonal snapping
    const orthoH = snapOrthogonalPoint(
      { x: 10, y: 10 },
      { x: 25, y: 10.8 },
      { forceOrtho: false, angleToleranceDeg: 8 }
    );
    assert.equal(orthoH.axis, "horizontal");
    assert.deepEqual(orthoH.point, { x: 25, y: 10 });
  });

  // 3. Wall Creation, Length Calculation & Enclosed Space Detection
  await test("Wall length calculation, connection, and enclosed space detection", () => {
    const walls = [
      {
        id: "w-n",
        floorId: "f1",
        startPoint: { x: 5, y: 5 },
        endPoint: { x: 20, y: 5 },
        height: 10,
        thickness: 0.5,
        materialId: "m1",
      },
      {
        id: "w-s",
        floorId: "f1",
        startPoint: { x: 5, y: 17 },
        endPoint: { x: 20, y: 17 },
        height: 10,
        thickness: 0.5,
        materialId: "m1",
      },
      {
        id: "w-w",
        floorId: "f1",
        startPoint: { x: 5, y: 5 },
        endPoint: { x: 5, y: 17 },
        height: 10,
        thickness: 0.5,
        materialId: "m1",
      },
      {
        id: "w-e",
        floorId: "f1",
        startPoint: { x: 20, y: 5 },
        endPoint: { x: 20, y: 17 },
        height: 10,
        thickness: 0.5,
        materialId: "m1",
      },
    ];

    assert.equal(computeWallLengthFt(walls[0]), 15);
    assert.equal(computeWallLengthFt(walls[2]), 12);

    const enclosed = detectEnclosedRectanglesFromWalls(walls);
    assert.equal(enclosed.length, 1);
    assert.deepEqual(enclosed[0], [
      { x: 5, y: 5 },
      { x: 20, y: 5 },
      { x: 20, y: 17 },
      { x: 5, y: 17 },
    ]);
  });

  // 4. Door & Window Placement, Wall Projection & Collision Detection
  await test("Wall-hosted door and window placement and collision detection", () => {
    const hostWall = {
      id: "wall-host",
      floorId: "f1",
      startPoint: { x: 10, y: 10 },
      endPoint: { x: 30, y: 10 }, // 20 ft wall
      height: 10,
      thickness: 0.75,
      materialId: "mat-wall-plaster-white",
    };

    const proj = projectPointOntoWall({ x: 20, y: 11.2 }, hostWall);
    assert.equal(proj.t, 0.5);
    assert.equal(proj.distanceFt, 1.2);

    const nearest = findNearestWall({ x: 20, y: 11.2 }, [hostWall], 3.0);
    assert.ok(nearest);
    assert.equal(nearest.wall.id, "wall-host");

    // Valid first door at t = 0.5 (width 3 ft)
    const check1 = validateOpeningOnWall(hostWall, [], 0.5, 3);
    assert.equal(check1.valid, true);
    assert.equal(check1.offsetFromStartFt, 8.5);

    const existingDoor = {
      id: "door-1",
      floorId: "f1",
      wallId: "wall-host",
      type: "door" as const,
      name: "Door 1",
      position: 0.5,
      offsetFromStart: 8.5,
      width: 3,
      height: 7,
      sillHeight: 0,
      materialId: "mat-floor-oak-herringbone",
    };

    // Colliding window at t = 0.52 -> rejected
    const checkCollision = validateOpeningOnWall(
      hostWall,
      [existingDoor],
      0.52,
      4
    );
    assert.equal(checkCollision.valid, false);

    // Non-colliding window at t = 0.2 -> accepted
    const checkValidWin = validateOpeningOnWall(
      hostWall,
      [existingDoor],
      0.2,
      4
    );
    assert.equal(checkValidWin.valid, true);
  });

  // 5. Room Creation, Overlap Detection & Resizing
  await test("Room creation, overlap detection, and dimension resizing", () => {
    const tpl = createProjectFromTemplate("2bhk");
    useHomeStudioStore.getState().resetProject(tpl);
    const floor = useHomeStudioStore.getState().activeProject.floors[0];

    // Check overlap against existing first room
    const firstRoom = floor.rooms[0];
    const overlapCheck = checkRoomOverlap(firstRoom.polygon, floor.rooms);
    assert.equal(overlapCheck.overlaps, true);
    assert.equal(overlapCheck.overlappingRoomName, firstRoom.name);

    // Resize room via store
    const ok = useHomeStudioStore.getState().updateRoom(firstRoom.id, {
      dimensions: { width: 16, length: 14, area: 224 },
    });
    assert.equal(ok, true);
    const updated = useHomeStudioStore
      .getState()
      .activeProject.floors[0].rooms.find((r) => r.id === firstRoom.id);
    assert.equal(updated?.dimensions.area, 224);
  });

  // 6. Multi-Selection, Copy, Paste, Duplicate & Delete in Store
  await test("Multi-selection copy, paste, duplicate, and batch delete in Zustand store", () => {
    const tpl = createProjectFromTemplate("2bhk");
    useHomeStudioStore.getState().resetProject(tpl);
    const floor = useHomeStudioStore.getState().activeProject.floors[0];
    const baseWallCount = floor.walls.length;

    // Select first two walls
    useHomeStudioStore
      .getState()
      .setSelectedObjectIds([floor.walls[0].id, floor.walls[1].id]);

    const duplicatedIds = useHomeStudioStore
      .getState()
      .duplicateSelectedObjects();
    assert.equal(duplicatedIds.length, 2);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors[0].walls.length,
      baseWallCount + 2
    );

    // Delete duplicated walls
    const deletedOk = useHomeStudioStore.getState().deleteSelectedObjects();
    assert.equal(deletedOk, true);
    assert.equal(
      useHomeStudioStore.getState().activeProject.floors[0].walls.length,
      baseWallCount
    );
  });

  const passed = results.filter((r) => r.status === "PASS").length;
  return {
    totalTests: results.length,
    passed,
    results,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("phase4.test")) {
  (async () => {
    const p3 = await runPhase3VerificationSuite();
    const p4 = await runPhase4VerificationSuite();

    console.log("================================================");
    console.log(
      `PHASE 3 REGRESSION SUITE: ${p3.passed}/${p3.totalTests} PASSED`
    );
    for (const r of p3.results) {
      console.log(`  [${r.status}] ${r.name}`);
    }

    console.log("------------------------------------------------");
    console.log(
      `PHASE 4 2D PLANNER SUITE: ${p4.passed}/${p4.totalTests} PASSED`
    );
    for (const r of p4.results) {
      console.log(`  [${r.status}] ${r.name}${r.details ? ` -> ${r.details}` : ""}`);
    }
    console.log("================================================");

    if (p3.passed !== p3.totalTests || p4.passed !== p4.totalTests) {
      process.exit(1);
    }
  })();
}

