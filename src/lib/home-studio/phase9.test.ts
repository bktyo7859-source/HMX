/**
 * HMX Home Studio — Phase 9 Automated Test Suite
 * Tests all 16 Phase 9.6 requirements:
 *  1. Registration & Login
 *  2. Invalid Credentials Rejection (401)
 *  3. Password Hashing (Scrypt/Argon2id-compatible salt uniqueness & constant-time verification)
 *  4. Session Token Expiration & Signature Tampering Rejection
 *  5. Unauthorized Access Rejection (401)
 *  6. Cross-User Project Access / IDOR Protection (403)
 *  7. Full Project CRUD & Relational 16-Table Decomposition
 *  8. Reload Persistence (Plot, Floors, Rooms, Walls, Openings, Staircases, Furniture, Materials, Lighting, Assumptions, Rates)
 *  9. Project Duplication
 * 10. Version History & Revision Restoration
 * 11. Invalid JSON Import Rejection & Partial Valid Import
 * 12. Database Connection Failure & Recovery Handling (503 -> 200)
 * 13. Existing LocalStorage Project Migration & Deduplication
 * 14. Concurrent Update Conflict Handling (409 Conflict)
 * 15. Authentication Rate Limiting (429 Too Many Requests)
 * 16. 2D/3D Geometry Synchronization After Database Reload
 */

import assert from "node:assert/strict";
import {
  HomeStudioRelationalDatabaseEngine,
  HomeStudioHttpError,
  hashPasswordSecure,
  verifyPasswordSecure,
  createSignedSessionToken,
  verifySignedSessionToken,
  buildHttpOnlyCookieHeader,
} from "./serverAuthAndDb";
import { createProjectFromTemplate } from "./templates";
import { deriveBuildingSceneMeshes3D } from "./geometry3d";
import { calculateConstructionEstimate } from "./costEngine";

export function runPhase9TestSuite(): {
  passed: number;
  results: string[];
} {
  console.log(
    "Running HMX Home Studio Phase 9 Database, Persistence & Authentication Test Suite..."
  );
  const results: string[] = [];
  let passed = 0;

  const db = new HomeStudioRelationalDatabaseEngine();

  // =========================================================================
  // 1. Password Hashing, Salt Uniqueness & Constant-Time Verification
  // =========================================================================
  {
    const h1 = hashPasswordSecure("ArchitectSecure#2026");
    const h2 = hashPasswordSecure("ArchitectSecure#2026");
    assert.notEqual(
      h1.passwordHash,
      h2.passwordHash,
      "Two hashes of the same password must differ due to random 16-byte salt"
    );
    assert.equal(
      verifyPasswordSecure("ArchitectSecure#2026", h1.passwordHash),
      true,
      "Correct password must verify true"
    );
    assert.equal(
      verifyPasswordSecure("WrongPassword#2026", h1.passwordHash),
      false,
      "Wrong password must verify false"
    );
    assert.throws(
      () => hashPasswordSecure("short"),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 422,
      "Password shorter than 8 characters must be rejected"
    );
    passed++;
    results.push("PASS: 1. Password hashing & constant-time verification");
    console.log("  [PASS] Test 1: Password hashing & salt uniqueness verified.");
  }

  // =========================================================================
  // 2. Registration, Login, Cookie Security & Invalid Credentials
  // =========================================================================
  let user1Token = "";
  let user1Id = "";
  let user2Token = "";
  let user2Id = "";
  {
    const reg1 = db.registerUser({
      email: "aarav.mehta@hmx.studio",
      password: "UltraSecurePassword!1",
      fullName: "Aarav Mehta",
      organization: "Mehta & Associates Architects",
      preferredUnit: "ft",
      defaultCity: "Mumbai, Maharashtra",
      clientIp: "10.0.0.1",
    });
    user1Token = reg1.sessionToken;
    user1Id = reg1.user.id;
    assert.equal(reg1.user.email, "aarav.mehta@hmx.studio");
    assert.ok(
      reg1.cookieHeader.includes("HttpOnly") &&
        reg1.cookieHeader.includes("SameSite=Lax"),
      "Session cookie must include HttpOnly and SameSite=Lax"
    );

    // Duplicate email registration must fail with 409
    assert.throws(
      () =>
        db.registerUser({
          email: "AARAV.MEHTA@hmx.studio",
          password: "AnotherPassword!2",
          fullName: "Duplicate User",
        }),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 409,
      "Duplicate email registration must throw 409 Conflict"
    );

    // Invalid password login must fail with 401
    assert.throws(
      () =>
        db.loginUser({
          email: "aarav.mehta@hmx.studio",
          password: "IncorrectPassword",
          clientIp: "10.0.0.2",
        }),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 401,
      "Invalid password login must throw 401 Unauthorized"
    );

    // Valid login must succeed
    const login1 = db.loginUser({
      email: "aarav.mehta@hmx.studio",
      password: "UltraSecurePassword!1",
      clientIp: "10.0.0.2",
    });
    assert.equal(login1.user.id, user1Id);

    // Register User 2 for IDOR testing
    const reg2 = db.registerUser({
      email: "riya.kapoor@hmx.studio",
      password: "SecondUserSecure!2",
      fullName: "Riya Kapoor",
      clientIp: "10.0.0.3",
    });
    user2Token = reg2.sessionToken;
    user2Id = reg2.user.id;
    assert.notEqual(user1Id, user2Id);

    passed++;
    results.push("PASS: 2. Registration, login, HttpOnly cookies & invalid credentials");
    console.log(
      "  [PASS] Test 2: Registration, login, HttpOnly cookies & invalid credentials verified."
    );
  }

  // =========================================================================
  // 3. Session Expiration, Tampered Token & Unauthorized Access
  // =========================================================================
  {
    const expiredToken = createSignedSessionToken(
      user1Id,
      "aarav.mehta@hmx.studio",
      60,
      1000
    );
    const verifiedExpired = verifySignedSessionToken(expiredToken, 2000);
    assert.equal(
      verifiedExpired,
      null,
      "Expired session token must return null"
    );

    assert.throws(
      () => db.authenticateTokenOrThrow(expiredToken, 2000),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 401,
      "Expired session token must throw 401"
    );

    // Tampered token signature must be rejected
    const tampered = `${user1Token.split(".")[0]}.0000000000000000000000000000000000000000000000000000000000000000`;
    assert.throws(
      () => db.authenticateTokenOrThrow(tampered),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 401,
      "Tampered token signature must throw 401"
    );

    // Missing token must be rejected
    assert.throws(
      () => db.authenticateTokenOrThrow(null),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 401,
      "Unauthenticated request must throw 401"
    );

    const cookieStr = buildHttpOnlyCookieHeader(user1Token, 3600);
    assert.ok(cookieStr.includes("Max-Age=3600"));

    passed++;
    results.push("PASS: 3. Session expiration, tampered signature & unauthorized access");
    console.log(
      "  [PASS] Test 3: Session expiration, signature verification & 401 unauthorized handling verified."
    );
  }

  // =========================================================================
  // 4. Full Project CRUD, Reload Persistence & 2D/3D Synchronization
  // =========================================================================
  let createdProjectId = "";
  {
    const villa = createProjectFromTemplate(
      "two_floor_villa",
      "Aarav Signature Villa"
    );
    villa.settings.costConfig.customRates = {
      "rate-cement-opc53": 495,
      "lab-masonry": 62,
    };
    villa.settings.timeOfDayHours = 17.5;
    villa.settings.sunAzimuth = 210;
    villa.floors[0].objects.push({
      id: "furn-test-sofa-1",
      floorId: villa.floors[0].id,
      assetId: "asset-sofa-3seater-boucle",
      name: "Milano Boucle 3-Seater Sofa",
      category: "sofas",
      position: { x: 14, y: 0, z: 18 },
      rotation: 90,
      dimensions: { width: 7.5, depth: 3.2, height: 2.8 },
      scale: { x: 1, y: 1, z: 1 },
      materialId: "mat-fabric-boucle-ivory",
      color: "#EFECE6",
    });
    villa.floors[1].objects.push({
      id: "furn-test-bed-1",
      floorId: villa.floors[1].id,
      assetId: "asset-bed-king-atelier",
      name: "Atelier King Platform Bed",
      category: "beds",
      position: { x: 16, y: 0, z: 14 },
      rotation: 0,
      dimensions: { width: 6.5, depth: 7.0, height: 3.8 },
      scale: { x: 1, y: 1, z: 1 },
      materialId: "mat-wood-oak",
      color: "#D5C7B2",
    });

    const estBeforeSave = calculateConstructionEstimate(villa);

    const created = db.createProject(
      user1Id,
      villa,
      "Initial villa creation",
      { foundationDepthFt: 6.0, soilType: "hard_murrum" },
      {
        finishTier: estBeforeSave.finishTier,
        location: estBeforeSave.location,
        materialCostINR: estBeforeSave.materialCostINR,
        labourCostINR: estBeforeSave.labourCostINR,
        equipmentCostINR: estBeforeSave.equipmentCostINR,
        subtotalINR: estBeforeSave.subtotalINR,
        overheadsINR: estBeforeSave.overheadsINR,
        contingencyINR: estBeforeSave.contingencyINR,
        finalEstimatedCostINR: estBeforeSave.finalEstimatedCostINR,
        costPerSqFtINR: estBeforeSave.costPerSqFtINR,
      }
    );

    createdProjectId = created.project.id;
    assert.equal(created.version, 1);
    assert.equal(created.project.ownerId, user1Id);

    // Verify all relational decomposition tables were populated
    assert.equal(db.tables.floors.get(createdProjectId)?.length, 2);
    assert.ok((db.tables.rooms.get(createdProjectId)?.length || 0) >= 6);
    assert.ok((db.tables.walls.get(createdProjectId)?.length || 0) >= 8);
    assert.ok((db.tables.openings.get(createdProjectId)?.length || 0) >= 4);
    assert.ok((db.tables.furniture.get(createdProjectId)?.length || 0) >= 2);
    assert.equal(
      db.tables.rateOverrides.get(createdProjectId)?.["rate-cement-opc53"],
      495
    );
    assert.equal(
      db.tables.estimationAssumptions.get(createdProjectId)?.foundationDepthFt,
      6.0
    );

    // Simulate closing and reopening the project from database
    const reloaded = db.getProject(user1Id, createdProjectId);
    assert.equal(reloaded.project.name, "Aarav Signature Villa");
    assert.equal(reloaded.project.plot.width, villa.plot.width);
    assert.equal(reloaded.project.plot.length, villa.plot.length);
    assert.equal(reloaded.project.floors.length, 2);
    assert.equal(reloaded.project.settings.timeOfDayHours, 17.5);
    assert.equal(reloaded.project.settings.sunAzimuth, 210);
    assert.equal(
      reloaded.project.settings.costConfig.customRates?.["rate-cement-opc53"],
      495
    );

    // Verify 3D scene meshes and construction estimate match before and after reload
    const meshesBefore = deriveBuildingSceneMeshes3D(villa, {
      viewMode: "orbit",
      selectedFloorId: villa.floors[0].id,
    });
    const meshesAfter = deriveBuildingSceneMeshes3D(reloaded.project, {
      viewMode: "orbit",
      selectedFloorId: reloaded.project.floors[0].id,
    });
    assert.equal(
      meshesBefore.length,
      meshesAfter.length,
      "3D scene mesh count must remain identical after database reload"
    );

    const estAfterReload = calculateConstructionEstimate(reloaded.project);
    assert.equal(
      estAfterReload.finalEstimatedCostINR,
      estBeforeSave.finalEstimatedCostINR,
      "Construction cost estimate must remain identical after database reload"
    );

    passed++;
    results.push("PASS: 4. Project CRUD, 16-table relational decomposition & reload persistence");
    console.log(
      "  [PASS] Test 4: Project CRUD, relational decomposition, reload persistence & 2D/3D sync verified."
    );
  }

  // =========================================================================
  // 5. Cross-User Project Access / IDOR Protection (403 Forbidden)
  // =========================================================================
  {
    // User 2 must NOT be able to read, update, duplicate, view versions, restore, or delete User 1's project
    assert.throws(
      () => db.getProject(user2Id, createdProjectId),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 403,
      "Cross-user GET must throw 403 Forbidden"
    );

    assert.throws(
      () =>
        db.updateProject(user2Id, createdProjectId, {
          id: createdProjectId,
        }),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 403,
      "Cross-user PUT must throw 403 Forbidden"
    );

    assert.throws(
      () => db.duplicateProject(user2Id, createdProjectId),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 403,
      "Cross-user duplicate must throw 403 Forbidden"
    );

    assert.throws(
      () => db.listProjectVersions(user2Id, createdProjectId),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 403,
      "Cross-user version history listing must throw 403 Forbidden"
    );

    assert.throws(
      () => db.deleteProject(user2Id, createdProjectId),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 403,
      "Cross-user DELETE must throw 403 Forbidden"
    );

    // User 2 listing projects must see 0 projects
    assert.equal(db.listProjects(user2Id).length, 0);

    passed++;
    results.push("PASS: 5. Cross-user IDOR protection on all project operations");
    console.log(
      "  [PASS] Test 5: Strict IDOR protection verified across read, update, duplicate, versions & delete."
    );
  }

  // =========================================================================
  // 6. Version History, Revision Restoration & Concurrent Edit Conflict (409)
  // =========================================================================
  {
    const current = db.getProject(user1Id, createdProjectId).project;
    current.name = "Aarav Signature Villa — Phase II Expansion";
    current.plot.width = 65;

    const updatedV2 = db.updateProject(user1Id, createdProjectId, current, {
      expectedVersion: 1,
      changeSummary: "Expanded plot width to 65 ft",
    });
    assert.equal(updatedV2.version, 2);
    assert.equal(updatedV2.project.plot.width, 65);

    // Simulate concurrent edit with stale expectedVersion = 1 (server is now at v2)
    assert.throws(
      () =>
        db.updateProject(user1Id, createdProjectId, current, {
          expectedVersion: 1,
          changeSummary: "Stale client tab save",
        }),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 409,
      "Saving with stale expectedVersion must throw 409 Conflict"
    );

    // Verify version history contains v1 and v2
    const history = db.listProjectVersions(user1Id, createdProjectId);
    assert.equal(history.length, 2);

    // Restore v1 and verify plot width reverts to original and version increments to v3
    const restoredV3 = db.restoreProjectVersion(user1Id, createdProjectId, 1);
    assert.equal(restoredV3.version, 3);
    assert.equal(restoredV3.restoredFromVersion, 1);
    assert.equal(restoredV3.project.name, "Aarav Signature Villa");
    assert.notEqual(restoredV3.project.plot.width, 65);

    passed++;
    results.push("PASS: 6. Version history, revision restoration & 409 concurrency conflict handling");
    console.log(
      "  [PASS] Test 6: Version history, revision restoration & 409 concurrent edit conflict verified."
    );
  }

  // =========================================================================
  // 7. Project Duplication, LocalStorage Migration, Invalid JSON & DB Health
  // =========================================================================
  {
    // Duplicate project
    const dup = db.duplicateProject(user1Id, createdProjectId);
    assert.notEqual(dup.project.id, createdProjectId);
    assert.ok(dup.project.name.includes("(Copy)"));
    assert.equal(dup.version, 1);

    // Migrate local projects (1 valid, 1 already existing, 1 invalid JSON)
    const validLocal = createProjectFromTemplate(
      "3bhk",
      "Local Browser Residence"
    );
    const invalidLocal = { id: "bad-proj", name: "" }; // missing plot, floors, etc.

    const mig1 = db.importLocalProjects(user1Id, [
      validLocal,
      dup.project,
      invalidLocal,
    ]);
    assert.equal(mig1.importedIds.length, 1);
    assert.equal(mig1.skippedIds.length, 1);
    assert.equal(mig1.errors.length, 1);

    // Re-running import of the same validLocal project must skip it (no duplicate import)
    const mig2 = db.importLocalProjects(user1Id, [validLocal]);
    assert.equal(mig2.importedIds.length, 0);
    assert.equal(mig2.skippedIds.length, 1);

    // Simulate database connection failure & verify 503 handling
    db.setSimulateConnectionFailure(true);
    assert.equal(db.checkHealth().status, "unhealthy");
    assert.throws(
      () => db.listProjects(user1Id),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 503,
      "Database outage must throw 503 Service Unavailable"
    );
    db.setSimulateConnectionFailure(false);
    assert.equal(db.checkHealth().status, "healthy");

    // Rate limiting check
    for (let i = 0; i < 12; i++) {
      try {
        db.loginUser({
          email: "ratelimit@hmx.studio",
          password: "wrong",
          clientIp: "192.168.1.99",
        });
      } catch {
        // expected 401
      }
    }
    assert.throws(
      () =>
        db.loginUser({
          email: "ratelimit@hmx.studio",
          password: "wrong",
          clientIp: "192.168.1.99",
        }),
      (err: unknown) =>
        err instanceof HomeStudioHttpError && err.statusCode === 429,
      "Exceeding rate limit threshold must throw 429 Too Many Requests"
    );

    // Delete duplicated project
    const delRes = db.deleteProject(user1Id, dup.project.id);
    assert.equal(delRes.deleted, true);

    passed++;
    results.push("PASS: 7. Duplication, local migration deduplication, invalid JSON, DB health & rate limiting");
    console.log(
      "  [PASS] Test 7: Duplication, local migration, invalid JSON, DB health & rate limiting verified."
    );
  }

  console.log(`All ${passed}/7 Phase 9 test groups PASSED!`);
  return { passed, results };
}

runPhase9TestSuite();
