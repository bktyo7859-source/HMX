import { create } from "zustand";
import {
  ActiveWorkspaceTab,
  ArchitecturalMaterial,
  BuildingProject,
  BuildingSettings,
  EditorTool,
  Floor,
  FloorType,
  FurnitureItem,
  Opening,
  PlotConfig,
  Room,
  StaircaseType,
  UnitSystem,
  ViewMode3D,
  Wall,
} from "../types/homeStudio";
import { STARTER_HOME_PROJECTS } from "../data/homeStudioProjects";
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  validateBuildingProject,
} from "../lib/home-studio/schemas";
import {
  computePolygonAreaSqFt,
  computePolygonBoundsFt,
} from "../lib/home-studio/units";
import { computeStaircaseSpecification } from "../lib/home-studio/staircase";
import { defaultProjectStorage } from "../lib/home-studio/storage";

export interface HistorySnapshot {
  project: BuildingProject;
  actionSummary: string;
  timestamp: string;
}

export interface HomeStudioState {
  // Core Building Model State
  activeProject: BuildingProject;
  selectedFloorId: string;
  selectedObjectIds: string[];

  // Workspace UI Mode State
  activeTool: EditorTool;
  activeTab: ActiveWorkspaceTab;
  viewMode3D: ViewMode3D;

  // Bounded History (Undo / Redo)
  pastHistory: HistorySnapshot[];
  futureHistory: HistorySnapshot[];
  historyLimit: number;
  lastValidationError: string | null;

  // Project Lifecycle Actions
  setActiveProject: (project: BuildingProject, recordHistory?: boolean) => boolean;
  resetProject: (templateProject?: BuildingProject) => void;
  updateProjectMetadata: (updates: {
    name?: string;
    description?: string;
    location?: string;
  }) => boolean;
  updatePlotConfig: (updates: Partial<PlotConfig>) => boolean;
  updateSettings: (updates: Partial<BuildingSettings>) => boolean;
  setDisplayUnit: (unit: UnitSystem) => void;

  // Selection & Navigation Actions
  setSelectedFloorId: (floorId: string) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  toggleObjectSelection: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setActiveTab: (tab: ActiveWorkspaceTab) => void;
  setViewMode3D: (mode: ViewMode3D) => void;

  // Floor Management Actions
  addFloor: (type: FloorType, customName?: string) => Floor | null;
  duplicateFloor: (sourceFloorId: string, targetType: FloorType) => Floor | null;
  updateFloor: (
    floorId: string,
    updates: Partial<
      Pick<
        Floor,
        | "name"
        | "type"
        | "levelIndex"
        | "elevation"
        | "floorHeight"
        | "ceilingHeight"
        | "visible"
        | "locked"
      >
    >
  ) => boolean;
  reorderFloor: (floorId: string, direction: "up" | "down") => boolean;
  deleteFloor: (floorId: string) => boolean;
  alignVerticalStructureAcrossFloors: (sourceFloorId: string) => number;
  placeStaircaseCore: (
    floorId: string,
    positionFt: { x: number; y: number },
    propagateToAllFloors?: boolean,
    options?: {
      stairType?: StaircaseType;
      widthFt?: number;
      treadDepthInches?: number;
      rotation?: number;
      destinationFloorId?: string;
    }
  ) => FurnitureItem[];

  // Room CRUD Actions
  addRoom: (
    room: Omit<Room, "id" | "dimensions"> & {
      id?: string;
      dimensions?: Room["dimensions"];
    }
  ) => Room | null;
  updateRoom: (roomId: string, updates: Partial<Room>) => boolean;
  deleteRoom: (roomId: string) => boolean;

  // Wall CRUD Actions
  addWall: (wall: Omit<Wall, "id"> & { id?: string }) => Wall | null;
  updateWall: (wallId: string, updates: Partial<Wall>) => boolean;
  deleteWall: (wallId: string) => boolean;

  // Opening (Door / Window) CRUD Actions
  addOpening: (opening: Omit<Opening, "id"> & { id?: string }) => Opening | null;
  updateOpening: (openingId: string, updates: Partial<Opening>) => boolean;
  deleteOpening: (openingId: string) => boolean;

  // Furniture / Interior Object CRUD Actions
  addFurniture: (
    item: Omit<FurnitureItem, "id"> & { id?: string }
  ) => FurnitureItem | null;
  updateFurniture: (
    itemId: string,
    updates: Partial<FurnitureItem>
  ) => boolean;
  deleteFurniture: (itemId: string) => boolean;

  // Architectural Material & Surface Assignment Actions
  addOrUpdateMaterial: (material: ArchitecturalMaterial) => boolean;
  duplicateMaterial: (materialId: string) => ArchitecturalMaterial | null;
  resetMaterialToDefault: (materialId: string) => boolean;
  assignMaterialToSelectedSurface: (
    materialId: string,
    surfaceTarget?:
      | "auto"
      | "room_floor"
      | "room_wall"
      | "room_ceiling"
      | "wall"
      | "furniture"
      | "opening"
  ) => boolean;

  // Multi-selection & Clipboard Actions
  clipboardObjects: {
    rooms: Room[];
    walls: Wall[];
    furniture: FurnitureItem[];
  } | null;
  deleteSelectedObjects: () => boolean;
  duplicateSelectedObjects: () => string[];
  copySelectedObjects: () => number;
  pasteClipboardObjects: (offsetFt?: { x: number; y: number }) => string[];

  // History Actions
  undo: () => boolean;
  redo: () => boolean;
  setHistoryLimit: (limit: number) => void;
  clearHistory: () => void;

  // Import / Export Actions
  exportProjectJson: () => string;
  importProjectJson: (jsonString: string) => {
    success: boolean;
    errors: string[];
  };
}

export const FloorOrderByType: Record<FloorType, number> = {
  basement: -1,
  ground: 0,
  first: 1,
  second: 2,
  third: 3,
  rooftop: 4,
  custom: 2,
};

const FLOOR_LEVEL_MAP: Record<FloorType, { name: string; index: number }> = {
  basement: { name: "Basement Level", index: -1 },
  ground: { name: "Ground Floor", index: 0 },
  first: { name: "First Floor", index: 1 },
  second: { name: "Second Floor", index: 2 },
  third: { name: "Third Floor", index: 3 },
  rooftop: { name: "Rooftop Terrace", index: 4 },
  custom: { name: "Custom Level", index: 2 },
};

/**
 * Recalculates cumulative floor elevations from datum 0.0 ft (Ground Floor)
 * so that stacked floors and basement levels maintain exact vertical continuity.
 */
export function recalculateFloorElevations(floors: Floor[]): Floor[] {
  const sorted = [...floors].sort((a, b) => a.levelIndex - b.levelIndex);
  let aboveDatum = 0;

  // Ground and upper floors (levelIndex >= 0)
  for (const flr of sorted) {
    if (flr.levelIndex >= 0) {
      flr.elevation = Math.round(aboveDatum * 100) / 100;
      aboveDatum += flr.ceilingHeight + flr.floorHeight;
    }
  }

  // Subterranean levels (levelIndex < 0) descending below 0.0 ft
  let belowDatum = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const flr = sorted[i];
    if (flr.levelIndex < 0) {
      belowDatum -= flr.ceilingHeight + flr.floorHeight;
      flr.elevation = Math.round(belowDatum * 100) / 100;
    }
  }

  return sorted;
}

function cloneProject(project: BuildingProject): BuildingProject {
  return JSON.parse(JSON.stringify(project));
}

function projectsAreStructurallyEqual(
  a: BuildingProject,
  b: BuildingProject
): boolean {
  const copyA = { ...a, updatedAt: "", version: 0, revisionHistory: [] };
  const copyB = { ...b, updatedAt: "", version: 0, revisionHistory: [] };
  return JSON.stringify(copyA) === JSON.stringify(copyB);
}

const initialProject = cloneProject(STARTER_HOME_PROJECTS[0]);
const initialFloorId =
  initialProject.floors.find((f) => f.type === "ground")?.id ||
  initialProject.floors[0].id;

export const useHomeStudioStore = create<HomeStudioState>((set, get) => {
  /**
   * Validates a proposed project mutation, appends a bounded history snapshot
   * if structurally changed, persists to storage adapter, and updates store state.
   */
  const commitProjectMutation = (
    nextProjectCandidate: BuildingProject,
    actionSummary: string,
    recordHistory: boolean = true
  ): boolean => {
    const current = get().activeProject;

    // Avoid storing duplicate snapshots if nothing actually changed
    if (projectsAreStructurallyEqual(current, nextProjectCandidate)) {
      return true;
    }

    const now = new Date().toISOString();
    const nextVersion = (current.version || 1) + 1;
    const revisionEntry = {
      version: nextVersion,
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      timestamp: now,
      summary: actionSummary,
      authorId: current.ownerId || "workspace-default",
    };

    const existingRevisions = current.revisionHistory || [];
    const candidateWithMeta: BuildingProject = {
      ...nextProjectCandidate,
      version: nextVersion,
      updatedAt: now,
      revisionHistory: [...existingRevisions.slice(-29), revisionEntry],
    };

    const validation = validateBuildingProject(candidateWithMeta);
    if (!validation.valid || !validation.project) {
      set({ lastValidationError: validation.errors.join("; ") });
      return false;
    }

    const validNext = validation.project;
    const limit = get().historyLimit;
    const nextPast = recordHistory
      ? [
          ...get().pastHistory.slice(-(limit - 1)),
          {
            project: cloneProject(current),
            actionSummary,
            timestamp: now,
          },
        ]
      : get().pastHistory;

    set({
      activeProject: validNext,
      pastHistory: nextPast,
      futureHistory: recordHistory ? [] : get().futureHistory,
      lastValidationError: null,
    });

    // Persist asynchronously via storage abstraction
    defaultProjectStorage.saveProject(validNext).catch(() => {});
    return true;
  };

  return {
    activeProject: initialProject,
    selectedFloorId: initialFloorId,
    selectedObjectIds: [],

    activeTool: "select",
    activeTab: "2d",
    viewMode3D: "orbit",

    pastHistory: [],
    futureHistory: [],
    historyLimit: 50,
    lastValidationError: null,
    clipboardObjects: null,

    setActiveProject: (project, recordHistory = false) => {
      const validation = validateBuildingProject(project);
      if (!validation.valid || !validation.project) {
        set({ lastValidationError: validation.errors.join("; ") });
        return false;
      }
      const valid = cloneProject(validation.project);
      const ground =
        valid.floors.find((f) => f.type === "ground") || valid.floors[0];

      if (recordHistory) {
        return commitProjectMutation(valid, "Load project", true);
      }

      set({
        activeProject: valid,
        selectedFloorId: ground ? ground.id : "",
        selectedObjectIds: [],
        pastHistory: [],
        futureHistory: [],
        lastValidationError: null,
      });
      defaultProjectStorage.saveProject(valid).catch(() => {});
      return true;
    },

    resetProject: (templateProject) => {
      const base = cloneProject(templateProject || STARTER_HOME_PROJECTS[0]);
      const ground =
        base.floors.find((f) => f.type === "ground") || base.floors[0];
      set({
        activeProject: base,
        selectedFloorId: ground ? ground.id : "",
        selectedObjectIds: [],
        pastHistory: [],
        futureHistory: [],
        lastValidationError: null,
      });
    },

    updateProjectMetadata: (updates) => {
      const next = cloneProject(get().activeProject);
      if (updates.name !== undefined) next.name = updates.name;
      if (updates.description !== undefined)
        next.description = updates.description;
      if (updates.location !== undefined) next.location = updates.location;
      return commitProjectMutation(next, "Update project metadata");
    },

    updatePlotConfig: (updates) => {
      const next = cloneProject(get().activeProject);
      next.plot = {
        ...next.plot,
        ...updates,
        setbacks: {
          ...next.plot.setbacks,
          ...(updates.setbacks || {}),
        },
      };

      if (
        next.plot.shape === "rectangular" &&
        (updates.width !== undefined || updates.length !== undefined)
      ) {
        next.plot.vertices = [
          { x: 0, y: 0 },
          { x: next.plot.width, y: 0 },
          { x: next.plot.width, y: next.plot.length },
          { x: 0, y: next.plot.length },
        ];
      }

      return commitProjectMutation(next, "Update plot configuration");
    },

    updateSettings: (updates) => {
      const next = cloneProject(get().activeProject);
      next.settings = {
        ...next.settings,
        ...updates,
        costConfig: {
          ...next.settings.costConfig,
          ...(updates.costConfig || {}),
        },
      };
      return commitProjectMutation(next, "Update building settings");
    },

    setDisplayUnit: (unit) => {
      const next = cloneProject(get().activeProject);
      next.settings.displayUnit = unit;
      set({ activeProject: next });
    },

    setSelectedFloorId: (floorId) => {
      const exists = get().activeProject.floors.some((f) => f.id === floorId);
      if (exists) {
        set({ selectedFloorId: floorId, selectedObjectIds: [] });
      }
    },

    setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),

    toggleObjectSelection: (id, multi = false) => {
      const current = get().selectedObjectIds;
      if (!multi) {
        set({ selectedObjectIds: current.includes(id) ? [] : [id] });
        return;
      }
      if (current.includes(id)) {
        set({ selectedObjectIds: current.filter((item) => item !== id) });
      } else {
        set({ selectedObjectIds: [...current, id] });
      }
    },

    clearSelection: () => set({ selectedObjectIds: [] }),
    setActiveTool: (tool) => set({ activeTool: tool }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setViewMode3D: (mode) => set({ viewMode3D: mode }),

    addFloor: (type, customName) => {
      const next = cloneProject(get().activeProject);
      const meta = FLOOR_LEVEL_MAP[type];
      const id = `floor-${type}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 5)}`;
      const defaultCeiling = next.floors[0]?.ceilingHeight || 10.5;
      const newFloor: Floor = {
        id,
        name: customName || meta.name,
        type,
        levelIndex: meta.index,
        elevation: meta.index * (defaultCeiling + 0.5),
        floorHeight: 0.5,
        ceilingHeight: defaultCeiling,
        visible: true,
        locked: false,
        rooms: [],
        walls: [],
        openings: [],
        objects: [],
      };

      next.floors.push(newFloor);
      next.floors = recalculateFloorElevations(next.floors);

      const ok = commitProjectMutation(next, `Add floor ${newFloor.name}`);
      if (!ok) return null;
      set({ selectedFloorId: id });
      return newFloor;
    },

    duplicateFloor: (sourceFloorId, targetType) => {
      const next = cloneProject(get().activeProject);
      const source = next.floors.find((f) => f.id === sourceFloorId);
      if (!source) return null;

      const meta = FLOOR_LEVEL_MAP[targetType];
      const newFloorId = `floor-${targetType}-${Date.now().toString(36)}`;
      const wallIdMap = new Map<string, string>();

      const clonedWalls: Wall[] = source.walls.map((w, idx) => {
        const newWallId = `${newFloorId}-wall-${idx + 1}`;
        wallIdMap.set(w.id, newWallId);
        return {
          ...w,
          id: newWallId,
          floorId: newFloorId,
        };
      });

      const clonedRooms: Room[] = source.rooms.map((r, idx) => ({
        ...r,
        id: `${newFloorId}-room-${idx + 1}`,
        floorId: newFloorId,
      }));

      const clonedOpenings: Opening[] = source.openings.map((o, idx) => ({
        ...o,
        id: `${newFloorId}-open-${idx + 1}`,
        floorId: newFloorId,
        wallId: wallIdMap.get(o.wallId) || o.wallId,
      }));

      const clonedObjects: FurnitureItem[] = source.objects.map((obj, idx) => ({
        ...obj,
        id: `${newFloorId}-obj-${idx + 1}`,
        floorId: newFloorId,
      }));

      const duplicatedFloor: Floor = {
        ...source,
        id: newFloorId,
        name: `${meta.name}`,
        type: targetType,
        levelIndex: meta.index,
        elevation: meta.index * (source.ceilingHeight + source.floorHeight),
        rooms: clonedRooms,
        walls: clonedWalls,
        openings: clonedOpenings,
        objects: clonedObjects,
      };

      next.floors.push(duplicatedFloor);
      next.floors = recalculateFloorElevations(next.floors);

      const ok = commitProjectMutation(
        next,
        `Duplicate floor ${source.name} to ${duplicatedFloor.name}`
      );
      if (!ok) return null;
      set({ selectedFloorId: newFloorId });
      return duplicatedFloor;
    },

    updateFloor: (floorId, updates) => {
      const next = cloneProject(get().activeProject);
      const floor = next.floors.find((f) => f.id === floorId);
      if (!floor) return false;
      Object.assign(floor, updates);
      if (
        (updates.ceilingHeight !== undefined ||
          updates.floorHeight !== undefined ||
          updates.levelIndex !== undefined) &&
        updates.elevation === undefined
      ) {
        next.floors = recalculateFloorElevations(next.floors);
      }
      return commitProjectMutation(next, `Update floor ${floor.name}`);
    },

    reorderFloor: (floorId, direction) => {
      const next = cloneProject(get().activeProject);
      const sorted = [...next.floors].sort(
        (a, b) => a.levelIndex - b.levelIndex
      );
      const idx = sorted.findIndex((f) => f.id === floorId);
      if (idx < 0) return false;

      const swapIdx = direction === "up" ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return false;

      const tempLevel = sorted[idx].levelIndex;
      sorted[idx].levelIndex = sorted[swapIdx].levelIndex;
      sorted[swapIdx].levelIndex =
        tempLevel === sorted[swapIdx].levelIndex
          ? tempLevel + (direction === "up" ? 1 : -1)
          : tempLevel;

      next.floors = recalculateFloorElevations(sorted);
      return commitProjectMutation(
        next,
        `Reorder floor ${sorted[idx].name} ${direction}`
      );
    },

    deleteFloor: (floorId) => {
      const next = cloneProject(get().activeProject);
      if (next.floors.length <= 1) {
        set({
          lastValidationError: "Project must contain at least one floor.",
        });
        return false;
      }
      next.floors = recalculateFloorElevations(
        next.floors.filter((f) => f.id !== floorId)
      );
      const ok = commitProjectMutation(next, "Delete floor");
      if (ok && get().selectedFloorId === floorId) {
        set({ selectedFloorId: next.floors[0].id, selectedObjectIds: [] });
      }
      return ok;
    },

    alignVerticalStructureAcrossFloors: (sourceFloorId) => {
      const next = cloneProject(get().activeProject);
      const sourceFloor = next.floors.find((f) => f.id === sourceFloorId);
      if (!sourceFloor) return 0;

      const structuralStairsAndCores = sourceFloor.objects.filter(
        (obj) => obj.isStructural || obj.category === "staircases"
      );

      let syncedCount = 0;
      for (const targetFloor of next.floors) {
        if (targetFloor.id === sourceFloor.id || targetFloor.locked) continue;

        for (const item of structuralStairsAndCores) {
          const alreadyExists = targetFloor.objects.some(
            (existing) =>
              existing.category === item.category &&
              Math.hypot(
                existing.position.x - item.position.x,
                existing.position.z - item.position.z
              ) < 1.5
          );
          if (!alreadyExists) {
            targetFloor.objects.push({
              ...JSON.parse(JSON.stringify(item)),
              id: `${targetFloor.id}-stair-${Date.now().toString(36)}-${Math.random()
                .toString(36)
                .slice(2, 5)}`,
              floorId: targetFloor.id,
            });
            syncedCount++;
          }
        }
      }

      if (syncedCount > 0) {
        commitProjectMutation(
          next,
          `Synchronize vertical stairs/cores across ${syncedCount} floor(s)`
        );
      }
      return syncedCount;
    },

    placeStaircaseCore: (
      floorId,
      positionFt,
      propagateToAllFloors = true,
      options
    ) => {
      const next = cloneProject(get().activeProject);
      const sortedFloors = [...next.floors].sort(
        (a, b) => a.levelIndex - b.levelIndex
      );
      const targetFloors = propagateToAllFloors
        ? sortedFloors.filter((f) => f.type !== "rooftop" && !f.locked)
        : sortedFloors.filter((f) => f.id === floorId);

      const stairType: StaircaseType = options?.stairType || "u_shaped";
      const widthFt = options?.widthFt || 3.5;
      const treadDepthInches = options?.treadDepthInches || 10.5;
      const rotation = options?.rotation || 0;

      const createdItems: FurnitureItem[] = [];

      for (const flr of targetFloors) {
        const flrIdx = sortedFloors.findIndex((x) => x.id === flr.id);
        const destFloor =
          (options?.destinationFloorId
            ? sortedFloors.find((x) => x.id === options.destinationFloorId)
            : sortedFloors[flrIdx + 1]) || flr;

        const spec = computeStaircaseSpecification({
          stairType,
          widthFt,
          treadDepthInches,
          startingFloor: flr,
          destinationFloor: destFloor,
        });

        const clampedX = Math.max(
          1,
          Math.min(next.plot.width - spec.footprintWidthFt - 1, positionFt.x)
        );
        const clampedZ = Math.max(
          1,
          Math.min(next.plot.length - spec.footprintDepthFt - 1, positionFt.y)
        );

        const labelMap: Record<StaircaseType, string> = {
          straight: "Straight Flight Staircase",
          l_shaped: "L-Shaped Quarter-Turn Staircase",
          u_shaped: "U-Shaped Switchback Staircase",
          spiral: "Helical Spiral Staircase",
        };

        const newStair: FurnitureItem = {
          id: `stair-${flr.id}-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 5)}`,
          floorId: flr.id,
          assetId: `asset-stair-${stairType}`,
          name: labelMap[stairType],
          category: "staircases",
          position: { x: clampedX, y: 0, z: clampedZ },
          rotation,
          dimensions: {
            width: spec.footprintWidthFt,
            depth: spec.footprintDepthFt,
            height: spec.metadata.totalRiseFt,
          },
          scale: { x: 1, y: 1, z: 1 },
          materialId: "mat-floor-oak-herringbone",
          color: "#C5A880",
          isStructural: true,
          stairMetadata: spec.metadata,
        };
        flr.objects.push(newStair);
        createdItems.push(newStair);
      }

      if (createdItems.length > 0) {
        const ok = commitProjectMutation(
          next,
          `Place ${stairType} staircase across ${createdItems.length} floor(s)`
        );
        if (!ok) return [];
      }
      return createdItems;
    },

    addRoom: (roomInput) => {
      const next = cloneProject(get().activeProject);
      const floor = next.floors.find((f) => f.id === roomInput.floorId);
      if (!floor) return null;

      const bounds = computePolygonBoundsFt(roomInput.polygon);
      const area = computePolygonAreaSqFt(roomInput.polygon);

      const newRoom: Room = {
        id:
          roomInput.id ||
          `room-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
        floorId: roomInput.floorId,
        type: roomInput.type,
        name: roomInput.name,
        polygon: roomInput.polygon,
        dimensions: roomInput.dimensions || {
          width: bounds.width,
          length: bounds.length,
          area,
        },
        floorMaterialId: roomInput.floorMaterialId,
        wallMaterialId: roomInput.wallMaterialId,
        color: roomInput.color,
      };

      floor.rooms.push(newRoom);
      const ok = commitProjectMutation(next, `Add room ${newRoom.name}`);
      return ok ? newRoom : null;
    },

    updateRoom: (roomId, updates) => {
      const next = cloneProject(get().activeProject);
      for (const floor of next.floors) {
        const room = floor.rooms.find((r) => r.id === roomId);
        if (room) {
          Object.assign(room, updates);
          if (updates.polygon && !updates.dimensions) {
            const bounds = computePolygonBoundsFt(room.polygon);
            const area = computePolygonAreaSqFt(room.polygon);
            room.dimensions = {
              width: bounds.width,
              length: bounds.length,
              area,
            };
          } else if (updates.dimensions && !updates.polygon) {
            const bounds = computePolygonBoundsFt(room.polygon);
            const w = updates.dimensions.width;
            const l = updates.dimensions.length;
            room.polygon = [
              { x: bounds.minX, y: bounds.minY },
              { x: bounds.minX + w, y: bounds.minY },
              { x: bounds.minX + w, y: bounds.minY + l },
              { x: bounds.minX, y: bounds.minY + l },
            ];
            room.dimensions.area = Math.round(w * l * 100) / 100;
          }
          return commitProjectMutation(next, `Update room ${room.name}`);
        }
      }
      return false;
    },

    deleteRoom: (roomId) => {
      const next = cloneProject(get().activeProject);
      let found = false;
      for (const floor of next.floors) {
        const before = floor.rooms.length;
        floor.rooms = floor.rooms.filter((r) => r.id !== roomId);
        if (floor.rooms.length !== before) found = true;
      }
      if (!found) return false;
      return commitProjectMutation(next, "Delete room");
    },

    addWall: (wallInput) => {
      const next = cloneProject(get().activeProject);
      const floor = next.floors.find((f) => f.id === wallInput.floorId);
      if (!floor) return null;

      const newWall: Wall = {
        ...wallInput,
        id:
          wallInput.id ||
          `wall-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
      };
      floor.walls.push(newWall);
      const ok = commitProjectMutation(next, "Add wall segment");
      return ok ? newWall : null;
    },

    updateWall: (wallId, updates) => {
      const next = cloneProject(get().activeProject);
      for (const floor of next.floors) {
        const wall = floor.walls.find((w) => w.id === wallId);
        if (wall) {
          Object.assign(wall, updates);
          return commitProjectMutation(next, "Update wall segment");
        }
      }
      return false;
    },

    deleteWall: (wallId) => {
      const next = cloneProject(get().activeProject);
      let found = false;
      for (const floor of next.floors) {
        const before = floor.walls.length;
        floor.walls = floor.walls.filter((w) => w.id !== wallId);
        if (floor.walls.length !== before) {
          found = true;
          // Also remove any openings hosted on this wall
          floor.openings = floor.openings.filter((o) => o.wallId !== wallId);
        }
      }
      if (!found) return false;
      return commitProjectMutation(next, "Delete wall segment");
    },

    addOpening: (openingInput) => {
      const next = cloneProject(get().activeProject);
      const floor = next.floors.find((f) => f.id === openingInput.floorId);
      if (!floor) return null;

      const newOpening: Opening = {
        ...openingInput,
        id:
          openingInput.id ||
          `open-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
      };
      floor.openings.push(newOpening);
      const ok = commitProjectMutation(next, `Add ${newOpening.type}`);
      return ok ? newOpening : null;
    },

    updateOpening: (openingId, updates) => {
      const next = cloneProject(get().activeProject);
      for (const floor of next.floors) {
        const opening = floor.openings.find((o) => o.id === openingId);
        if (opening) {
          Object.assign(opening, updates);
          return commitProjectMutation(next, `Update ${opening.name}`);
        }
      }
      return false;
    },

    deleteOpening: (openingId) => {
      const next = cloneProject(get().activeProject);
      let found = false;
      for (const floor of next.floors) {
        const before = floor.openings.length;
        floor.openings = floor.openings.filter((o) => o.id !== openingId);
        if (floor.openings.length !== before) found = true;
      }
      if (!found) return false;
      return commitProjectMutation(next, "Delete opening");
    },

    addFurniture: (itemInput) => {
      const next = cloneProject(get().activeProject);
      const floor = next.floors.find((f) => f.id === itemInput.floorId);
      if (!floor) return null;

      const newItem: FurnitureItem = {
        ...itemInput,
        id:
          itemInput.id ||
          `furn-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
      };
      floor.objects.push(newItem);
      const ok = commitProjectMutation(next, `Place ${newItem.name}`);
      return ok ? newItem : null;
    },

    updateFurniture: (itemId, updates) => {
      const next = cloneProject(get().activeProject);
      for (const floor of next.floors) {
        const obj = floor.objects.find((o) => o.id === itemId);
        if (obj) {
          Object.assign(obj, updates);
          return commitProjectMutation(next, `Update ${obj.name}`);
        }
      }
      return false;
    },

    deleteFurniture: (itemId) => {
      const next = cloneProject(get().activeProject);
      let found = false;
      for (const floor of next.floors) {
        const before = floor.objects.length;
        floor.objects = floor.objects.filter((o) => o.id !== itemId);
        if (floor.objects.length !== before) found = true;
      }
      if (!found) return false;
      return commitProjectMutation(next, "Remove furniture item");
    },

    addOrUpdateMaterial: (material) => {
      const next = cloneProject(get().activeProject);
      const idx = next.materials.findIndex((m) => m.id === material.id);
      if (idx >= 0) {
        next.materials[idx] = { ...next.materials[idx], ...material };
      } else {
        next.materials.push(material);
      }
      return commitProjectMutation(next, `Update material ${material.name}`);
    },

    duplicateMaterial: (materialId) => {
      const next = cloneProject(get().activeProject);
      const src = next.materials.find((m) => m.id === materialId);
      if (!src) return null;
      const copy: ArchitecturalMaterial = {
        ...src,
        id: `${src.id}-copy-${Date.now().toString(36).slice(-4)}`,
        name: `${src.name} (Custom)`,
      };
      next.materials.push(copy);
      const ok = commitProjectMutation(next, `Duplicate material ${src.name}`);
      return ok ? copy : null;
    },

    resetMaterialToDefault: (materialId) => {
      const next = cloneProject(get().activeProject);
      const idx = next.materials.findIndex((m) => m.id === materialId);
      if (idx < 0) return false;
      const defaultRef = STARTER_HOME_PROJECTS[0].materials.find(
        (m) => m.id === materialId
      );
      if (defaultRef) {
        next.materials[idx] = { ...defaultRef };
      } else {
        next.materials[idx] = {
          ...next.materials[idx],
          repeatScale: 1,
          roughness: 0.5,
          metalness: 0.05,
        };
      }
      return commitProjectMutation(
        next,
        `Reset material ${next.materials[idx].name}`
      );
    },

    assignMaterialToSelectedSurface: (materialId, surfaceTarget = "auto") => {
      const selected = get().selectedObjectIds;
      if (selected.length === 0) return false;
      const next = cloneProject(get().activeProject);
      let mat = next.materials.find((m) => m.id === materialId);
      if (!mat) return false;

      let updatedCount = 0;
      const selectedSet = new Set(selected);

      for (const floor of next.floors) {
        for (const wall of floor.walls) {
          if (selectedSet.has(wall.id)) {
            wall.materialId = mat.id;
            updatedCount++;
          }
        }
        for (const room of floor.rooms) {
          if (selectedSet.has(room.id)) {
            if (surfaceTarget === "room_wall") {
              room.wallMaterialId = mat.id;
            } else if (surfaceTarget === "room_ceiling") {
              room.ceilingMaterialId = mat.id;
            } else {
              room.floorMaterialId = mat.id;
              room.color = mat.color;
            }
            updatedCount++;
          }
        }
        for (const obj of floor.objects) {
          if (selectedSet.has(obj.id)) {
            obj.materialId = mat.id;
            obj.color = mat.color;
            updatedCount++;
          }
        }
        for (const op of floor.openings) {
          if (selectedSet.has(op.id)) {
            op.materialId = mat.id;
            updatedCount++;
          }
        }
      }

      if (updatedCount === 0) return false;
      return commitProjectMutation(
        next,
        `Apply ${mat.name} to ${updatedCount} selected surface(s)`
      );
    },

    deleteSelectedObjects: () => {
      const selected = get().selectedObjectIds;
      if (selected.length === 0) return false;
      const selectedSet = new Set(selected);
      const next = cloneProject(get().activeProject);
      let removedCount = 0;

      for (const floor of next.floors) {
        const rBefore = floor.rooms.length;
        floor.rooms = floor.rooms.filter((r) => !selectedSet.has(r.id));
        removedCount += rBefore - floor.rooms.length;

        const wBefore = floor.walls.length;
        const deletedWallIds = new Set(
          floor.walls.filter((w) => selectedSet.has(w.id)).map((w) => w.id)
        );
        floor.walls = floor.walls.filter((w) => !selectedSet.has(w.id));
        removedCount += wBefore - floor.walls.length;

        const oBefore = floor.openings.length;
        floor.openings = floor.openings.filter(
          (o) => !selectedSet.has(o.id) && !deletedWallIds.has(o.wallId)
        );
        removedCount += oBefore - floor.openings.length;

        const fBefore = floor.objects.length;
        floor.objects = floor.objects.filter((obj) => !selectedSet.has(obj.id));
        removedCount += fBefore - floor.objects.length;
      }

      if (removedCount === 0) return false;
      const ok = commitProjectMutation(
        next,
        `Delete ${removedCount} selected object(s)`
      );
      if (ok) {
        set({ selectedObjectIds: [] });
      }
      return ok;
    },

    copySelectedObjects: () => {
      const selected = new Set(get().selectedObjectIds);
      if (selected.size === 0) return 0;
      const floor =
        get().activeProject.floors.find(
          (f) => f.id === get().selectedFloorId
        ) || get().activeProject.floors[0];
      if (!floor) return 0;

      const rooms = floor.rooms
        .filter((r) => selected.has(r.id))
        .map((r) => JSON.parse(JSON.stringify(r)));
      const walls = floor.walls
        .filter((w) => selected.has(w.id))
        .map((w) => JSON.parse(JSON.stringify(w)));
      const furniture = floor.objects
        .filter((f) => selected.has(f.id))
        .map((f) => JSON.parse(JSON.stringify(f)));

      const count = rooms.length + walls.length + furniture.length;
      if (count > 0) {
        set({ clipboardObjects: { rooms, walls, furniture } });
      }
      return count;
    },

    pasteClipboardObjects: (offsetFt = { x: 2, y: 2 }) => {
      const clip = get().clipboardObjects;
      if (!clip) return [];
      const next = cloneProject(get().activeProject);
      const floor =
        next.floors.find((f) => f.id === get().selectedFloorId) ||
        next.floors[0];
      if (!floor) return [];

      const plotW = next.plot.width;
      const plotL = next.plot.length;
      const newIds: string[] = [];

      for (const r of clip.rooms) {
        const newId = `room-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        const shiftedPoly = r.polygon.map((pt) => ({
          x: Math.min(plotW, Math.max(0, pt.x + offsetFt.x)),
          y: Math.min(plotL, Math.max(0, pt.y + offsetFt.y)),
        }));
        const bounds = computePolygonBoundsFt(shiftedPoly);
        const area = computePolygonAreaSqFt(shiftedPoly);
        floor.rooms.push({
          ...JSON.parse(JSON.stringify(r)),
          id: newId,
          floorId: floor.id,
          name: `${r.name} (Copy)`,
          polygon: shiftedPoly,
          dimensions: { width: bounds.width, length: bounds.length, area },
        });
        newIds.push(newId);
      }

      for (const w of clip.walls) {
        const newId = `wall-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        floor.walls.push({
          ...JSON.parse(JSON.stringify(w)),
          id: newId,
          floorId: floor.id,
          startPoint: {
            x: Math.min(plotW, Math.max(0, w.startPoint.x + offsetFt.x)),
            y: Math.min(plotL, Math.max(0, w.startPoint.y + offsetFt.y)),
          },
          endPoint: {
            x: Math.min(plotW, Math.max(0, w.endPoint.x + offsetFt.x)),
            y: Math.min(plotL, Math.max(0, w.endPoint.y + offsetFt.y)),
          },
        });
        newIds.push(newId);
      }

      for (const f of clip.furniture) {
        const newId = `furn-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        floor.objects.push({
          ...JSON.parse(JSON.stringify(f)),
          id: newId,
          floorId: floor.id,
          position: {
            x: Math.min(plotW, Math.max(0, f.position.x + offsetFt.x)),
            y: f.position.y,
            z: Math.min(plotL, Math.max(0, f.position.z + offsetFt.y)),
          },
        });
        newIds.push(newId);
      }

      if (newIds.length === 0) return [];
      const ok = commitProjectMutation(
        next,
        `Paste ${newIds.length} object(s)`
      );
      if (!ok) return [];
      set({ selectedObjectIds: newIds });
      return newIds;
    },

    duplicateSelectedObjects: () => {
      const copied = get().copySelectedObjects();
      if (copied === 0) return [];
      return get().pasteClipboardObjects({ x: 2, y: 2 });
    },

    undo: () => {
      const { pastHistory, futureHistory, activeProject, historyLimit } = get();
      if (pastHistory.length === 0) return false;

      const previousSnapshot = pastHistory[pastHistory.length - 1];
      const remainingPast = pastHistory.slice(0, -1);

      const nextFuture: HistorySnapshot[] = [
        {
          project: cloneProject(activeProject),
          actionSummary: previousSnapshot.actionSummary,
          timestamp: new Date().toISOString(),
        },
        ...futureHistory,
      ].slice(0, historyLimit);

      const restored = cloneProject(previousSnapshot.project);
      const floorExists = restored.floors.some(
        (f) => f.id === get().selectedFloorId
      );

      set({
        activeProject: restored,
        selectedFloorId: floorExists
          ? get().selectedFloorId
          : restored.floors[0].id,
        pastHistory: remainingPast,
        futureHistory: nextFuture,
        lastValidationError: null,
      });

      defaultProjectStorage.saveProject(restored).catch(() => {});
      return true;
    },

    redo: () => {
      const { pastHistory, futureHistory, activeProject, historyLimit } = get();
      if (futureHistory.length === 0) return false;

      const nextSnapshot = futureHistory[0];
      const remainingFuture = futureHistory.slice(1);

      const nextPast: HistorySnapshot[] = [
        ...pastHistory.slice(-(historyLimit - 1)),
        {
          project: cloneProject(activeProject),
          actionSummary: nextSnapshot.actionSummary,
          timestamp: new Date().toISOString(),
        },
      ];

      const restored = cloneProject(nextSnapshot.project);
      const floorExists = restored.floors.some(
        (f) => f.id === get().selectedFloorId
      );

      set({
        activeProject: restored,
        selectedFloorId: floorExists
          ? get().selectedFloorId
          : restored.floors[0].id,
        pastHistory: nextPast,
        futureHistory: remainingFuture,
        lastValidationError: null,
      });

      defaultProjectStorage.saveProject(restored).catch(() => {});
      return true;
    },

    setHistoryLimit: (limit) => {
      const safeLimit = Math.max(5, Math.min(200, limit));
      set((state) => ({
        historyLimit: safeLimit,
        pastHistory: state.pastHistory.slice(-safeLimit),
        futureHistory: state.futureHistory.slice(0, safeLimit),
      }));
    },

    clearHistory: () => set({ pastHistory: [], futureHistory: [] }),

    exportProjectJson: () => {
      return JSON.stringify(get().activeProject, null, 2);
    },

    importProjectJson: (jsonString) => {
      try {
        const raw = JSON.parse(jsonString);
        const validation = validateBuildingProject(raw);
        if (!validation.valid || !validation.project) {
          set({ lastValidationError: validation.errors.join("; ") });
          return { success: false, errors: validation.errors };
        }
        const ok = get().setActiveProject(validation.project, true);
        return {
          success: ok,
          errors: ok ? [] : [get().lastValidationError || "Failed to import"],
        };
      } catch (err: any) {
        const msg = err?.message || "Invalid JSON string";
        set({ lastValidationError: msg });
        return { success: false, errors: [msg] };
      }
    },
  };
});

// Granular Zustand Selectors to prevent unnecessary re-renders
export const selectActiveProject = (state: HomeStudioState) =>
  state.activeProject;

export const selectSelectedFloor = (state: HomeStudioState): Floor =>
  state.activeProject.floors.find((f) => f.id === state.selectedFloorId) ||
  state.activeProject.floors[0];

export const selectDisplayUnit = (state: HomeStudioState): UnitSystem =>
  state.activeProject.settings.displayUnit;

export const selectCanUndo = (state: HomeStudioState): boolean =>
  state.pastHistory.length > 0;

export const selectCanRedo = (state: HomeStudioState): boolean =>
  state.futureHistory.length > 0;
