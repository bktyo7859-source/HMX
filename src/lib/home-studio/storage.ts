import { BuildingProject } from "../../types/homeStudio";
import {
  STARTER_HOME_PROJECTS,
  loadHomeStudioProjects,
  saveHomeStudioProjects,
} from "../../data/homeStudioProjects";
import { validateBuildingProject } from "./schemas";
import type {
  AuthenticatedUserDTO,
  StoredReportMetadataEntity,
} from "./serverAuthAndDb";

export interface ProjectVersionSummary {
  versionNumber: number;
  summary: string;
  createdBy: string;
  createdAt: string;
}

export interface SaveProjectOptions {
  expectedVersion?: number;
  changeSummary?: string;
  assumptions?: Record<string, unknown>;
  estimateSnapshot?: Record<string, unknown>;
}

export interface SaveProjectResult {
  project: BuildingProject;
  version: number;
  savedAt: string;
  persistedToDatabase: boolean;
}

export interface LocalImportMigrationResult {
  importedIds: string[];
  skippedIds: string[];
  errors: string[];
}

export interface HomeStudioStorageAdapter {
  readonly mode: "local" | "remote";
  listProjects(): Promise<BuildingProject[]>;
  getProject(id: string): Promise<BuildingProject | null>;
  saveProject(
    project: BuildingProject,
    options?: SaveProjectOptions
  ): Promise<BuildingProject>;
  deleteProject(id: string): Promise<void>;
}

/**
 * Browser localStorage + in-memory adapter retained for local development / unauthenticated draft preview.
 */
export class LocalStorageProjectAdapter implements HomeStudioStorageAdapter {
  public readonly mode = "local" as const;
  private memoryStore: BuildingProject[] = [...STARTER_HOME_PROJECTS];

  async listProjects(): Promise<BuildingProject[]> {
    if (typeof window === "undefined") {
      return this.memoryStore;
    }
    return loadHomeStudioProjects();
  }

  async getProject(id: string): Promise<BuildingProject | null> {
    const projects = await this.listProjects();
    return projects.find((p) => p.id === id) || null;
  }

  async saveProject(project: BuildingProject): Promise<BuildingProject> {
    const validation = validateBuildingProject(project);
    if (!validation.valid || !validation.project) {
      throw new Error(
        `Cannot persist invalid BuildingProject: ${validation.errors.join("; ")}`
      );
    }

    const validProject = validation.project;
    const projects = await this.listProjects();
    const existingIdx = projects.findIndex((p) => p.id === validProject.id);

    let updated: BuildingProject[];
    if (existingIdx >= 0) {
      updated = [...projects];
      updated[existingIdx] = validProject;
    } else {
      updated = [validProject, ...projects];
    }

    this.memoryStore = updated;
    if (typeof window !== "undefined") {
      saveHomeStudioProjects(updated);
    }
    return validProject;
  }

  async deleteProject(id: string): Promise<void> {
    const projects = await this.listProjects();
    const updated = projects.filter((p) => p.id !== id);
    this.memoryStore = updated;
    if (typeof window !== "undefined") {
      saveHomeStudioProjects(updated);
    }
  }
}

export class ConcurrentUpdateConflictError extends Error {
  public readonly serverVersion: number;
  public readonly expectedVersion: number;

  constructor(
    message: string,
    serverVersion: number,
    expectedVersion: number
  ) {
    super(message);
    this.name = "ConcurrentUpdateConflictError";
    this.serverVersion = serverVersion;
    this.expectedVersion = expectedVersion;
  }
}

/**
 * Production API-backed PostgreSQL persistence adapter (Phase 9).
 * Uses authenticated HttpOnly session cookies / Bearer token, validates payloads with Zod,
 * detects concurrent edit conflicts (409), supports version history restoration,
 * and safely buffers interrupted network saves so user work is never lost.
 */
export class ApiPostgresProjectAdapter implements HomeStudioStorageAdapter {
  public readonly mode = "remote" as const;
  private localCache = new LocalStorageProjectAdapter();
  private baseUrl: string;
  private sessionToken: string | null = null;
  private pendingOfflineSaves = new Map<string, BuildingProject>();

  constructor(baseUrl: string = "/api/home-studio") {
    this.baseUrl = baseUrl;
  }

  public setSessionToken(token: string | null): void {
    this.sessionToken = token;
  }

  public getSessionToken(): string | null {
    return this.sessionToken;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.sessionToken) {
      headers["Authorization"] = `Bearer ${this.sessionToken}`;
    }
    return headers;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = {},
    timeoutMs: number = 8000
  ): Promise<{ status: number; data: T }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          ...this.buildHeaders(),
          ...(init.headers || {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409 && data?.serverVersion !== undefined) {
          throw new ConcurrentUpdateConflictError(
            data.detail?.message ||
              data.detail ||
              "Concurrent edit conflict detected.",
            Number(data.serverVersion || data.detail?.serverVersion || 1),
            Number(data.expectedVersion || data.detail?.expectedVersion || 1)
          );
        }
        const err = new Error(
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.message || `HTTP ${response.status} error`
        ) as Error & { statusCode?: number };
        err.statusCode = response.status;
        throw err;
      }

      return { status: response.status, data: data as T };
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  }

  // --- Authentication Methods ---

  async register(input: {
    email: string;
    password: string;
    fullName: string;
    organization?: string;
    preferredUnit?: "ft" | "m";
    defaultCity?: string;
  }): Promise<{ user: AuthenticatedUserDTO; sessionToken: string }> {
    const { data } = await this.requestJson<{
      authenticated: boolean;
      user: AuthenticatedUserDTO;
      sessionToken: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    this.sessionToken = data.sessionToken;
    return { user: data.user, sessionToken: data.sessionToken };
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ user: AuthenticatedUserDTO; sessionToken: string }> {
    const { data } = await this.requestJson<{
      authenticated: boolean;
      user: AuthenticatedUserDTO;
      sessionToken: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    this.sessionToken = data.sessionToken;
    return { user: data.user, sessionToken: data.sessionToken };
  }

  async logout(): Promise<void> {
    try {
      await this.requestJson("/auth/logout", { method: "POST" });
    } finally {
      this.sessionToken = null;
    }
  }

  async getCurrentUser(): Promise<AuthenticatedUserDTO | null> {
    try {
      const { data } = await this.requestJson<{
        authenticated: boolean;
        user: AuthenticatedUserDTO;
      }>("/auth/me", { method: "GET" });
      return data.authenticated ? data.user : null;
    } catch {
      return null;
    }
  }

  // --- Persistent Project CRUD ---

  async listProjects(): Promise<BuildingProject[]> {
    const { data } = await this.requestJson<{
      projects: BuildingProject[];
      count: number;
    }>("/projects", { method: "GET" });
    return data.projects;
  }

  async getProject(id: string): Promise<BuildingProject | null> {
    const { data } = await this.requestJson<{
      project: BuildingProject | null;
      version: number;
      savedAt: string;
    }>(`/projects/${encodeURIComponent(id)}`, { method: "GET" });
    if (!data.project) return null;
    const validation = validateBuildingProject(data.project);
    if (!validation.valid || !validation.project) {
      throw new Error(
        `Loaded project failed schema validation: ${validation.errors.join("; ")}`
      );
    }
    return validation.project;
  }

  async saveProjectWithMetadata(
    project: BuildingProject,
    options?: SaveProjectOptions
  ): Promise<SaveProjectResult> {
    const validation = validateBuildingProject(project);
    if (!validation.valid || !validation.project) {
      throw new Error(
        `Cannot save invalid BuildingProject: ${validation.errors.join("; ")}`
      );
    }
    const validProject = validation.project;

    // Always keep local recovery cache updated first so interrupted network requests never lose data
    await this.localCache.saveProject(validProject);

    try {
      // Attempt update first; if 404, create new record
      try {
        const { data } = await this.requestJson<{
          project: BuildingProject;
          version: number;
          savedAt: string;
        }>(`/projects/${encodeURIComponent(validProject.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            project: validProject,
            expectedVersion: options?.expectedVersion,
            changeSummary: options?.changeSummary,
            assumptions: options?.assumptions,
            estimateSnapshot: options?.estimateSnapshot,
          }),
        });
        this.pendingOfflineSaves.delete(validProject.id);
        await this.localCache.saveProject(data.project);
        return {
          project: data.project,
          version: data.version,
          savedAt: data.savedAt,
          persistedToDatabase: true,
        };
      } catch (err) {
        const statusErr = err as Error & { statusCode?: number };
        if (statusErr.statusCode === 404) {
          const { data } = await this.requestJson<{
            project: BuildingProject;
            version: number;
            savedAt: string;
          }>("/projects", {
            method: "POST",
            body: JSON.stringify({
              project: validProject,
              changeSummary:
                options?.changeSummary || "Created project in database",
              assumptions: options?.assumptions,
              estimateSnapshot: options?.estimateSnapshot,
            }),
          });
          this.pendingOfflineSaves.delete(validProject.id);
          await this.localCache.saveProject(data.project);
          return {
            project: data.project,
            version: data.version,
            savedAt: data.savedAt,
            persistedToDatabase: true,
          };
        }
        throw err;
      }
    } catch (err) {
      if (err instanceof ConcurrentUpdateConflictError) {
        throw err;
      }
      // Network interruption: retain in pendingOfflineSaves queue without losing user work
      this.pendingOfflineSaves.set(validProject.id, validProject);
      throw err;
    }
  }

  async saveProject(
    project: BuildingProject,
    options?: SaveProjectOptions
  ): Promise<BuildingProject> {
    const res = await this.saveProjectWithMetadata(project, options);
    return res.project;
  }

  async deleteProject(id: string): Promise<void> {
    await this.requestJson(`/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await this.localCache.deleteProject(id);
  }

  async duplicateProject(id: string): Promise<BuildingProject> {
    const { data } = await this.requestJson<{
      project: BuildingProject;
      version: number;
      savedAt: string;
    }>(`/projects/${encodeURIComponent(id)}/duplicate`, {
      method: "POST",
    });
    await this.localCache.saveProject(data.project);
    return data.project;
  }

  // --- Version History & Restoration ---

  async listVersions(projectId: string): Promise<ProjectVersionSummary[]> {
    const { data } = await this.requestJson<{
      projectId: string;
      versions: ProjectVersionSummary[];
    }>(`/projects/${encodeURIComponent(projectId)}/versions`, {
      method: "GET",
    });
    return data.versions;
  }

  async restoreVersion(
    projectId: string,
    versionNumber: number
  ): Promise<SaveProjectResult> {
    const { data } = await this.requestJson<{
      project: BuildingProject;
      version: number;
      restoredFromVersion: number;
      savedAt: string;
    }>(
      `/projects/${encodeURIComponent(projectId)}/versions/${versionNumber}/restore`,
      {
        method: "POST",
      }
    );
    await this.localCache.saveProject(data.project);
    return {
      project: data.project,
      version: data.version,
      savedAt: data.savedAt,
      persistedToDatabase: true,
    };
  }

  // --- Migrate Existing LocalStorage Projects to Authenticated User Account ---

  async importLocalProjectsToAccount(
    customProjects?: unknown[]
  ): Promise<LocalImportMigrationResult> {
    const rawList =
      customProjects ?? (await this.localCache.listProjects());
    const validCandidates: BuildingProject[] = [];
    const clientErrors: string[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const check = validateBuildingProject(rawList[i]);
      if (!check.valid || !check.project) {
        clientErrors.push(
          `Local Project [${i}]: ${check.errors.join("; ")}`
        );
      } else {
        validCandidates.push(check.project);
      }
    }

    if (validCandidates.length === 0) {
      return {
        importedIds: [],
        skippedIds: [],
        errors: clientErrors,
      };
    }

    const { data } = await this.requestJson<LocalImportMigrationResult>(
      "/projects/import-local",
      {
        method: "POST",
        body: JSON.stringify({ projects: validCandidates }),
      }
    );

    return {
      importedIds: data.importedIds,
      skippedIds: data.skippedIds,
      errors: [...clientErrors, ...(data.errors || [])],
    };
  }

  // --- Report Metadata Persistence ---

  async recordReportMetadata(
    projectId: string,
    input: {
      reportType:
        | "architectural_design"
        | "construction_boq"
        | "detailed_cost"
        | "project_summary";
      title: string;
      projectVersion: number;
      fileName: string;
      pageCount: number;
      summaryMetrics: Record<string, unknown>;
    }
  ): Promise<StoredReportMetadataEntity> {
    const { data } = await this.requestJson<StoredReportMetadataEntity>(
      `/projects/${encodeURIComponent(projectId)}/reports`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    return data;
  }

  async listReportMetadata(
    projectId: string
  ): Promise<StoredReportMetadataEntity[]> {
    const { data } = await this.requestJson<{
      projectId: string;
      reports: StoredReportMetadataEntity[];
    }>(`/projects/${encodeURIComponent(projectId)}/reports`, {
      method: "GET",
    });
    return data.reports;
  }
}

export const defaultProjectStorage: HomeStudioStorageAdapter =
  new LocalStorageProjectAdapter();

export const apiPostgresStorage = new ApiPostgresProjectAdapter();
