/**
 * HMX Home Studio — Phase 8 Automated Test Suite
 * Tests for:
 *  1. Wall Volume Calculations & Door/Window Opening Deductions
 *  2. Room Floor Areas, Multi-Floor Built-Up Areas & Slab/Staircase Concrete
 *  3. Flooring Quantities (Tiles, Marble, Wood, Wastage, Skirting) & Plaster/Paint Surfaces
 *  4. Material Rate Catalog, 10-Trade Labour Catalog & Custom Rate Overrides
 *  5. Cost Engine Formulas (Material + Labour + Equipment = Subtotal, Overheads, Contingency, Separate Taxes)
 *  6. Finish-Tier Comparisons (Economy < Standard < Premium) & City Location Profiles
 *  7. Non-Destructive What-If Scenario Simulator (Floor Addition, Finish Upgrade, Flooring Swap, Rate Overrides)
 *  8. Live Recalculation After Store Geometry Mutations & Zero/Invalid Rate Resilience
 */

import assert from "node:assert/strict";
import { createProjectFromTemplate } from "./templates";
import {
  computeProjectQuantityTakeoff,
  DEFAULT_ESTIMATION_ASSUMPTIONS,
} from "./quantityTakeoff";
import {
  INDIAN_CONSTRUCTION_LOCATIONS,
  buildMaterialRateCatalog,
  buildLabourRateCatalog,
  resolveLocationProfile,
} from "./materialRateCatalog";
import {
  calculateConstructionEstimate,
  simulateWhatIfScenario,
} from "./costEngine";
import { useHomeStudioStore } from "../../store/useHomeStudioStore";

function runPhase8Tests() {
  console.log(
    "Running HMX Home Studio Phase 8 Quantity Takeoff & Cost Engine Test Suite..."
  );

  // =========================================================================
  // TEST 1: Wall Volume Calculations & Door/Window Opening Deductions
  // =========================================================================
  {
    const project = createProjectFromTemplate(
      "3bhk",
      "Phase 8 Wall & Opening Test"
    );
    const takeoffBaseline = computeProjectQuantityTakeoff(project);
    const groundTakeoffBefore = takeoffBaseline.floorSummaries[0];

    assert.ok(
      groundTakeoffBefore.grossWallVolumeCuFt > 0,
      "Gross wall volume must be positive"
    );
    assert.ok(
      groundTakeoffBefore.openingDeductionVolumeCuFt > 0,
      "Opening deduction volume must be positive for walls with doors/windows"
    );
    assert.ok(
      groundTakeoffBefore.netMasonryVolumeCuFt <
        groundTakeoffBefore.grossWallVolumeCuFt,
      "Net masonry volume must be strictly less than gross wall volume after deducting doors and windows"
    );

    // Add a large 6ft x 7ft double door on the first wall and verify opening deduction increases and net masonry decreases
    const targetWall = project.floors[0].walls[0];
    project.floors[0].openings.push({
      id: "opn-test-double-door",
      floorId: project.floors[0].id,
      wallId: targetWall.id,
      type: "double_door",
      name: "Grand Double Entrance Door",
      position: 0.5,
      offsetFromStart: 2.0,
      width: 6,
      height: 7,
      sillHeight: 0,
      swingDirection: "left",
      materialId: "mat-wood-oak",
    });

    const takeoffAfterDoor = computeProjectQuantityTakeoff(project);
    const groundTakeoffAfter = takeoffAfterDoor.floorSummaries[0];

    assert.ok(
      groundTakeoffAfter.doorAreaSqFt > groundTakeoffBefore.doorAreaSqFt,
      "Adding a 6x7ft door must increase door opening area"
    );
    assert.ok(
      groundTakeoffAfter.netMasonryVolumeCuFt <
        groundTakeoffBefore.netMasonryVolumeCuFt,
      "Adding a door opening must reduce net masonry wall volume"
    );
    assert.equal(
      groundTakeoffAfter.doorCount,
      groundTakeoffBefore.doorCount + 1,
      "Door count must increment by 1"
    );
    console.log(
      "  [PASS] Test 1: Wall volume calculations and door/window opening deductions verified."
    );
  }

  // =========================================================================
  // TEST 2: Multi-Floor Built-Up Areas, Slab Concrete, Earthwork & Staircase
  // =========================================================================
  {
    const singleVilla = createProjectFromTemplate("single_floor_villa");
    const twoFloorVilla = createProjectFromTemplate("two_floor_villa");

    const singleTakeoff = computeProjectQuantityTakeoff(singleVilla);
    const twoFloorTakeoff = computeProjectQuantityTakeoff(twoFloorVilla);

    assert.equal(singleTakeoff.floorSummaries.length, 1);
    assert.equal(twoFloorTakeoff.floorSummaries.length, 2);
    assert.ok(
      twoFloorTakeoff.totalBuiltUpAreaSqFt > singleTakeoff.totalBuiltUpAreaSqFt,
      "Two-floor villa built-up area must exceed single-floor villa"
    );
    assert.ok(
      twoFloorTakeoff.totalConcreteCuM > 0 &&
        Math.abs(
          twoFloorTakeoff.totalConcreteCuM -
            twoFloorTakeoff.totalConcreteCuFt / 35.3147
        ) < 0.2,
      "Concrete volume in cu.m must accurately convert from cu.ft"
    );

    // Check staircase concrete is present on two_floor_villa
    assert.ok(
      twoFloorTakeoff.staircaseConcreteCuFt > 0,
      "Two-floor villa with staircase must include positive staircase RCC concrete volume"
    );

    // Check all 10 categories A..J exist in takeoff
    const categoriesPresent = new Set(
      twoFloorTakeoff.lineItems.map((i) => i.categoryCode)
    );
    const requiredCategories = [
      "earthwork",
      "concrete",
      "reinforcement_steel",
      "masonry",
      "plastering",
      "flooring",
      "roofing_waterproofing",
      "painting",
      "doors_windows",
      "electrical_plumbing",
    ];
    for (const cat of requiredCategories) {
      assert.ok(
        categoriesPresent.has(cat as never),
        `Quantity takeoff must include category ${cat}`
      );
    }

    // Verify derivationType transparency tags
    const derivationTypes = new Set(
      twoFloorTakeoff.lineItems.map((i) => i.derivationType)
    );
    assert.ok(
      derivationTypes.has("geometry_derived"),
      "Takeoff must tag geometry_derived items"
    );
    assert.ok(
      derivationTypes.has("assumption_based"),
      "Takeoff must tag assumption_based structural/MEP items"
    );
    console.log(
      "  [PASS] Test 2: Multi-floor built-up area, all 10 BOQ categories (A-J) & derivation tags verified."
    );
  }

  // =========================================================================
  // TEST 3: Flooring Quantities (Tiles, Marble, Wood, Wastage, Skirting) & Paint/Plaster
  // =========================================================================
  {
    const project = createProjectFromTemplate("3bhk");
    // Assign marble to room 0, wood to room 1, tiles to remaining rooms
    project.floors[0].rooms[0].floorMaterialId = "mat-marble-carrara";
    project.floors[0].rooms[1].floorMaterialId = "mat-wood-oak";

    const takeoff = computeProjectQuantityTakeoff(project, {
      flooringWastagePercent: 8.0,
    });

    assert.ok(
      takeoff.marbleFlooringAreaSqFt > 0,
      "Marble flooring area must be positive when room has mat-marble-carrara"
    );
    assert.ok(
      takeoff.woodenFlooringAreaSqFt > 0,
      "Wooden flooring area must be positive when room has mat-wood-oak"
    );
    assert.ok(
      takeoff.tileFlooringAreaSqFt > 0,
      "Tile flooring area must be positive for tiled rooms"
    );
    assert.ok(
      takeoff.totalFlooringWithWastageSqFt >
        takeoff.marbleFlooringAreaSqFt +
          takeoff.woodenFlooringAreaSqFt +
          takeoff.tileFlooringAreaSqFt,
      "Total flooring with wastage must exceed net room floor area"
    );
    assert.ok(
      takeoff.skirtingLinearFt > 0 && takeoff.skirtingAreaSqFt > 0,
      "Room perimeter skirting running feet and area must be positive"
    );
    assert.ok(
      takeoff.internalPlasterAreaSqFt > 0 && takeoff.externalPlasterAreaSqFt > 0,
      "Internal and external wall plaster areas must be positive"
    );
    assert.ok(
      takeoff.interiorPaintAreaSqFt > 0 &&
        takeoff.exteriorPaintAreaSqFt > 0 &&
        takeoff.paintQuantityLitres > 0 &&
        takeoff.primerQuantityLitres > 0 &&
        takeoff.puttyQuantityKg > 0,
      "Interior paint, exterior paint, primer and putty quantities must be positive"
    );
    console.log(
      "  [PASS] Test 3: Flooring (marble, wood, tile, wastage, skirting) & plaster/paint areas verified."
    );
  }

  // =========================================================================
  // TEST 4: Material Rate Catalog, 10-Trade Labour Catalog & Custom Overrides
  // =========================================================================
  {
    const defaultMats = buildMaterialRateCatalog({
      location: "Bengaluru, Karnataka",
      finishTier: "standard",
      currency: "INR",
    });
    const defaultLabour = buildLabourRateCatalog({
      location: "Bengaluru, Karnataka",
      finishTier: "standard",
      currency: "INR",
    });

    assert.ok(
      defaultMats.length >= 16,
      "Material rate catalog must include cement, sand, aggregate, steel, bricks, AAC, flooring, paint, plumbing, electrical, doors, windows, waterproofing"
    );
    assert.equal(
      defaultLabour.length,
      10,
      "Labour catalog must cover all 10 required construction trades"
    );
    assert.ok(
      INDIAN_CONSTRUCTION_LOCATIONS.length >= 8,
      "City cost profiles must include major Indian cities"
    );

    const mumbaiProfile = resolveLocationProfile("Mumbai, Maharashtra");
    assert.equal(mumbaiProfile.city, "Mumbai");
    assert.ok(mumbaiProfile.labourIndexMultiplier > 1.0);

    // Custom rate override test
    const overriddenMats = buildMaterialRateCatalog({
      location: "Hyderabad, Telangana",
      finishTier: "standard",
      currency: "INR",
      customMaterialRates: { "rate-cement-opc53": 500 },
    });
    const cementItem = overriddenMats.find(
      (m) => m.materialId === "rate-cement-opc53"
    );
    assert.equal(
      cementItem?.rate,
      500,
      "Custom supplier rate override must take precedence over default catalog rate"
    );
    assert.equal(
      cementItem?.rateSource.sourceType,
      "User Verified Supplier Rate"
    );
    console.log(
      "  [PASS] Test 4: Material rate catalog, 10-trade labour catalog & custom supplier overrides verified."
    );
  }

  // =========================================================================
  // TEST 5: Cost Engine Formula Integrity & Finish-Tier Comparisons
  // =========================================================================
  {
    const project = createProjectFromTemplate("two_floor_villa");

    const economyEst = calculateConstructionEstimate(project, {
      finishTierOverride: "economy",
      overheadPercentage: 10,
      contingencyPercentage: 5,
      taxPercentage: 0,
    });
    const standardEst = calculateConstructionEstimate(project, {
      finishTierOverride: "standard",
      overheadPercentage: 10,
      contingencyPercentage: 5,
      taxPercentage: 0,
    });
    const premiumEst = calculateConstructionEstimate(project, {
      finishTierOverride: "premium",
      overheadPercentage: 10,
      contingencyPercentage: 5,
      taxPercentage: 18,
    });

    // Verify Economy < Standard < Premium
    assert.ok(
      economyEst.finalEstimatedCostINR < standardEst.finalEstimatedCostINR,
      "Economy construction tier must cost less than Standard tier"
    );
    assert.ok(
      standardEst.finalEstimatedCostINR < premiumEst.finalEstimatedCostINR,
      "Standard construction tier must cost less than Premium tier"
    );

    // Verify exact formula: Material + Labour + Equipment = Subtotal
    assert.equal(
      standardEst.subtotalINR,
      standardEst.materialCostINR +
        standardEst.labourCostINR +
        standardEst.equipmentCostINR,
      "Material Cost + Labour Cost + Equipment Cost must equal Subtotal"
    );

    // Verify Subtotal + Overheads + Contingency = Final Estimated Cost
    assert.equal(
      standardEst.finalEstimatedCostINR,
      standardEst.subtotalINR +
        standardEst.overheadsINR +
        standardEst.contingencyINR,
      "Subtotal + Overheads + Contingency must equal Final Estimated Cost"
    );

    // Verify Taxes are kept strictly separate from Final Estimated Cost
    assert.equal(
      standardEst.applicableTaxesINR,
      0,
      "When taxPercentage is 0, applicableTaxesINR must be 0"
    );
    assert.ok(
      premiumEst.applicableTaxesINR > 0,
      "When taxPercentage is 18%, applicableTaxesINR must be positive"
    );
    assert.equal(
      premiumEst.totalWithTaxesINR,
      premiumEst.finalEstimatedCostINR + premiumEst.applicableTaxesINR,
      "Total with taxes must equal Final Estimated Cost + Applicable Taxes"
    );
    console.log(
      "  [PASS] Test 5: Cost engine formulas (Material + Labour + Equipment, Overheads, Contingency, Separate Taxes) & Finish Tiers verified."
    );
  }

  // =========================================================================
  // TEST 6: Non-Destructive What-If Scenario Simulator
  // =========================================================================
  {
    const project = createProjectFromTemplate("3bhk", "What-If Test Residence");
    const originalFloorCount = project.floors.length;
    const originalQuality = project.settings.costConfig.finishQuality;
    const originalRoom0FloorMat = project.floors[0].rooms[0].floorMaterialId;

    const simulation = simulateWhatIfScenario(
      project,
      {
        scenarioName: "Add Floor + Premium + Marble",
        finishTier: "premium",
        additionalFloorsCount: 1,
        flooringMode: "all_marble",
        location: "Mumbai, Maharashtra",
      },
      {
        finishTierOverride: "standard",
        locationOverride: "Hyderabad, Telangana",
      }
    );

    // Verify simulation delta is positive
    assert.ok(
      simulation.costDifferenceINR > 0,
      "Adding a floor, upgrading to Premium and switching to Mumbai/Marble must increase cost"
    );
    assert.equal(
      simulation.scenarioEstimate.floorBreakdowns.length,
      originalFloorCount + 1,
      "Simulated scenario must include the added floor"
    );

    // CRITICAL: Verify original project was NOT mutated
    assert.equal(
      project.floors.length,
      originalFloorCount,
      "What-if simulator must NEVER mutate original project floor count"
    );
    assert.equal(
      project.settings.costConfig.finishQuality,
      originalQuality,
      "What-if simulator must NEVER mutate original project quality setting"
    );
    assert.equal(
      project.floors[0].rooms[0].floorMaterialId,
      originalRoom0FloorMat,
      "What-if simulator must NEVER mutate original room floor materials"
    );
    console.log(
      "  [PASS] Test 6: Non-destructive What-If Scenario Simulator verified without mutating active project."
    );
  }

  // =========================================================================
  // TEST 7: Live Recalculation After Zustand Store Geometry Changes & Zero-Rate Resilience
  // =========================================================================
  {
    const store = useHomeStudioStore.getState();
    const baseProject = createProjectFromTemplate(
      "2bhk",
      "Live Recalc Store Project"
    );
    store.setActiveProject(baseProject, false);

    const beforeProject = useHomeStudioStore.getState().activeProject!;
    const estBefore = calculateConstructionEstimate(beforeProject);

    // Add a new room via Zustand store
    const floorId = beforeProject.floors[0].id;
    const newRoomId = useHomeStudioStore.getState().addRoom({
      floorId,
      name: "Home Office Extension",
      type: "study_room",
      polygon: [
        { x: 4, y: 24 },
        { x: 18, y: 24 },
        { x: 18, y: 36 },
        { x: 4, y: 36 },
      ],
      dimensions: { width: 14, length: 12, area: 168 },
      color: "#F2EFE9",
      wallMaterialId: "mat-paint-ivory",
      floorMaterialId: "mat-wood-oak",
      ceilingMaterialId: "mat-paint-ivory",
    });
    assert.ok(newRoomId, "Store addRoom must succeed");

    // Add a new exterior wall via Zustand store
    const newWallId = useHomeStudioStore.getState().addWall({
      floorId,
      startPoint: { x: 4, y: 24 },
      endPoint: { x: 18, y: 24 },
      thickness: 0.75,
      height: 10.5,
      isExterior: true,
      materialId: "mat-paint-ivory",
    });
    assert.ok(newWallId, "Store addWall must succeed");

    const afterProject = useHomeStudioStore.getState().activeProject!;
    const estAfter = calculateConstructionEstimate(afterProject);

    assert.ok(
      estAfter.takeoff.totalBuiltUpAreaSqFt >
        estBefore.takeoff.totalBuiltUpAreaSqFt,
      "Built-up area must immediately increase after adding a room in store"
    );
    assert.ok(
      estAfter.finalEstimatedCostINR > estBefore.finalEstimatedCostINR,
      "Construction estimate must immediately increase after adding room and wall in store"
    );

    // Verify resilience against negative or NaN rate overrides
    const resilientEst = calculateConstructionEstimate(afterProject, {
      customMaterialRates: {
        "rate-cement-opc53": -999,
        "rate-steel-fe500d": Number.NaN,
      },
      overheadPercentage: -10,
      contingencyPercentage: 200,
    });
    assert.ok(
      Number.isFinite(resilientEst.finalEstimatedCostINR) &&
        resilientEst.finalEstimatedCostINR > 0,
      "Cost engine must sanitize negative/NaN rate overrides and clamp overhead/contingency percentages"
    );
    assert.equal(
      resilientEst.overheadPercentage,
      0,
      "Negative overhead percent must clamp to 0"
    );
    assert.equal(
      resilientEst.contingencyPercentage,
      35,
      "Excessive contingency percent must clamp to 35"
    );
    assert.ok(
      DEFAULT_ESTIMATION_ASSUMPTIONS.columnBeamSteelKgPerCuM > 0,
      "Default structural assumptions must be valid"
    );
    console.log(
      "  [PASS] Test 7: Live recalculation after store geometry changes & invalid-rate resilience verified."
    );
  }

  console.log("All 7 Phase 8 test groups PASSED!");
}

runPhase8Tests();
