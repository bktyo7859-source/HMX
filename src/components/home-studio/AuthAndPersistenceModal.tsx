"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ShieldCheck,
  LogIn,
  LogOut,
  UserPlus,
  History,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  X,
  Database,
  Lock,
} from "lucide-react";
import {
  apiPostgresStorage,
  ConcurrentUpdateConflictError,
  ProjectVersionSummary,
} from "@/lib/home-studio/storage";
import type { AuthenticatedUserDTO } from "@/lib/home-studio/serverAuthAndDb";
import {
  useHomeStudioStore,
  selectActiveProject,
} from "@/store/useHomeStudioStore";

interface AuthAndPersistenceModalProps {
  onStatusNotice?: (msg: string) => void;
}

export default function AuthAndPersistenceModal({
  onStatusNotice,
}: AuthAndPersistenceModalProps) {
  const project = useHomeStudioStore(selectActiveProject);
  const setActiveProject = useHomeStudioStore((s) => s.setActiveProject);

  const [currentUser, setCurrentUser] = useState<AuthenticatedUserDTO | null>(
    null
  );
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  // Auth Form Fields
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [organization, setOrganization] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Persistence & Autosave State
  const [saveState, setSaveState] = useState<
    "local_draft" | "saving" | "saved_db" | "conflict" | "offline_buffered"
  >("local_draft");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<number>(
    project?.version || 1
  );
  const [versions, setVersions] = useState<ProjectVersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(false);
  const [migratingLocal, setMigratingLocal] = useState<boolean>(false);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedVersionRef = useRef<number>(project?.version || 1);

  // Check active authenticated session on mount
  useEffect(() => {
    let mounted = true;
    apiPostgresStorage
      .getCurrentUser()
      .then((u) => {
        if (mounted && u) {
          setCurrentUser(u);
          setSaveState("saved_db");
        }
      })
      .catch(() => {
        // Unauthenticated draft mode
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Perform manual or debounced save to PostgreSQL/API
  const handlePersistProject = useCallback(
    async (summary: string = "Saved architectural changes") => {
      if (!project) return;
      if (!currentUser) {
        setSaveState("local_draft");
        setLastSavedAt(new Date().toLocaleTimeString());
        return;
      }

      setSaveState("saving");
      try {
        const res = await apiPostgresStorage.saveProjectWithMetadata(project, {
          expectedVersion: serverVersion,
          changeSummary: summary,
        });
        setServerVersion(res.version);
        lastCommittedVersionRef.current = res.project.version;
        setLastSavedAt(new Date(res.savedAt).toLocaleTimeString());
        setSaveState("saved_db");
        onStatusNotice?.(
          `Saved "${res.project.name}" (v${res.version}) to persistent database.`
        );
      } catch (err) {
        if (err instanceof ConcurrentUpdateConflictError) {
          setSaveState("conflict");
          setServerVersion(err.serverVersion);
          onStatusNotice?.(
            `Concurrent edit conflict: Server is at v${err.serverVersion}. Reload or overwrite from Version History.`
          );
        } else {
          setSaveState("offline_buffered");
          onStatusNotice?.(
            "Network interrupted: Changes buffered safely in local recovery cache."
          );
        }
      }
    },
    [project, currentUser, serverVersion, onStatusNotice]
  );

  // Debounced Autosave on committed project state changes (1800ms debounce — never fires on raw mouse move)
  useEffect(() => {
    if (!project || !currentUser) return;
    if (project.version === lastCommittedVersionRef.current) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      handlePersistProject(`Autosaved revision v${project.version}`);
    }, 1800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [project, project?.version, currentUser, handlePersistProject]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        const res = await apiPostgresStorage.register({
          email,
          password,
          fullName,
          organization: organization || undefined,
        });
        setCurrentUser(res.user);
        onStatusNotice?.(
          `Registered & signed in as ${res.user.fullName} (${res.user.email}).`
        );
      } else {
        const res = await apiPostgresStorage.login({ email, password });
        setCurrentUser(res.user);
        onStatusNotice?.(`Signed in as ${res.user.fullName}.`);
      }
      setAuthModalOpen(false);
      setPassword("");
      // Immediately persist current active project to user's account
      if (project) {
        const saved = await apiPostgresStorage.saveProjectWithMetadata(project, {
          changeSummary: "Initial cloud sync after sign-in",
        });
        setServerVersion(saved.version);
        setLastSavedAt(new Date(saved.savedAt).toLocaleTimeString());
        setSaveState("saved_db");
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiPostgresStorage.logout();
    setCurrentUser(null);
    setSaveState("local_draft");
    onStatusNotice?.("Signed out of HMX Home Studio.");
  };

  const handleMigrateLocalProjects = async () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    setMigratingLocal(true);
    try {
      const result = await apiPostgresStorage.importLocalProjectsToAccount();
      onStatusNotice?.(
        `Migrated ${result.importedIds.length} local project(s) to your account (${result.skippedIds.length} already synced).`
      );
    } catch (err) {
      onStatusNotice?.(
        err instanceof Error
          ? `Migration failed: ${err.message}`
          : "Local migration failed."
      );
    } finally {
      setMigratingLocal(false);
    }
  };

  const handleOpenVersionHistory = async () => {
    if (!project) return;
    setHistoryOpen(true);
    if (!currentUser) return;
    setLoadingVersions(true);
    try {
      const list = await apiPostgresStorage.listVersions(project.id);
      setVersions(list);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!project || !currentUser) return;
    try {
      const res = await apiPostgresStorage.restoreVersion(
        project.id,
        versionNumber
      );
      setActiveProject(res.project, true);
      setServerVersion(res.version);
      lastCommittedVersionRef.current = res.project.version;
      setLastSavedAt(new Date(res.savedAt).toLocaleTimeString());
      setSaveState("saved_db");
      setHistoryOpen(false);
      onStatusNotice?.(
        `Restored project "${res.project.name}" to revision v${versionNumber} (now saved as v${res.version}).`
      );
    } catch (err) {
      onStatusNotice?.(
        err instanceof Error
          ? `Failed to restore version: ${err.message}`
          : "Restore failed."
      );
    }
  };

  return (
    <>
      {/* Compact Persistence & Auth Bar */}
      <div className="inline-flex flex-wrap items-center gap-2">
        {/* Save Status Pill */}
        <button
          type="button"
          onClick={() => handlePersistProject("Manual save triggered")}
          title="Click to save immediately"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E7E7] hover:border-[#111111] transition-colors text-[11px] font-mono"
        >
          {saveState === "saving" ? (
            <>
              <RefreshCw className="w-3 h-3 text-[#C5A880] animate-spin" />
              <span className="text-[#111111]">Saving DB...</span>
            </>
          ) : saveState === "saved_db" ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-800">
                DB v{serverVersion}
                {lastSavedAt ? ` • ${lastSavedAt}` : ""}
              </span>
            </>
          ) : saveState === "conflict" ? (
            <>
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span className="text-amber-800">Conflict (v{serverVersion})</span>
            </>
          ) : (
            <>
              <Database className="w-3 h-3 text-[#C5A880]" />
              <span className="text-[#6B6B6B]">
                Local v{project?.version || 1}
              </span>
            </>
          )}
        </button>

        {/* Version History Button */}
        <button
          type="button"
          onClick={handleOpenVersionHistory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors"
        >
          <History className="w-3.5 h-3.5 text-[#C5A880]" />
          <span>History</span>
        </button>

        {/* Auth Status / Sign In */}
        {currentUser ? (
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E7E7E7] rounded-full px-3 py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-[#111111] max-w-[120px] truncate">
              {currentUser.fullName}
            </span>
            <button
              type="button"
              onClick={handleMigrateLocalProjects}
              disabled={migratingLocal}
              title="Sync local browser projects to your authenticated account"
              className="px-2 py-0.5 rounded-full bg-[#F7F7F5] text-[10px] font-mono text-[#111111] hover:bg-[#E7E7E7] transition-colors inline-flex items-center gap-1"
            >
              <CloudUpload className="w-3 h-3 text-[#C5A880]" />
              <span>{migratingLocal ? "..." : "Sync"}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1 rounded-full text-[#6B6B6B] hover:text-[#111111]"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Sign In / Cloud Save</span>
          </button>
        )}
      </div>

      {/* Authentication Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white border border-[#E7E7E7] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C5A880]" />
                <h2
                  className="font-serif text-xl text-[#111111]"
                  style={{
                    fontFamily:
                      "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  {authMode === "login"
                    ? "Sign In to HMX Home Studio"
                    : "Create Architect Account"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="p-1.5 rounded-full text-[#6B6B6B] hover:text-[#111111]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className={`py-2 rounded-lg text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                  authMode === "login"
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`py-2 rounded-lg text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                  authMode === "register"
                    ? "bg-[#111111] text-white"
                    : "text-[#6B6B6B] hover:text-[#111111]"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Register</span>
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === "register" && (
                <>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Aarav Mehta"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7] text-xs text-[#111111] outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1">
                      Architectural Studio / Organization
                    </label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="HMX Architectural Partners"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7] text-xs text-[#111111] outline-none focus:border-[#111111]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="architect@hmx.studio"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7] text-xs text-[#111111] outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#6B6B6B] block mb-1">
                  Password (Min 8 chars, Argon2id/Scrypt Hashed) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E7] text-xs text-[#111111] outline-none focus:border-[#111111]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-[#111111] text-white text-xs font-medium hover:bg-[#262626] transition-colors disabled:opacity-50"
              >
                {authLoading
                  ? "Verifying Credentials..."
                  : authMode === "login"
                  ? "Sign In & Enable Cloud Persistence"
                  : "Create Account & Save Project"}
              </button>
            </form>

            <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
              Projects are protected with server-side ownership verification,
              signed <code className="font-mono">HttpOnly</code> session
              cookies, and versioned database snapshots.
            </p>
          </div>
        </div>
      )}

      {/* Version History & Revision Restoration Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white border border-[#E7E7E7] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#C5A880]" />
                <h2
                  className="font-serif text-xl text-[#111111]"
                  style={{
                    fontFamily:
                      "var(--font-cormorant), Cormorant Garamond, serif",
                  }}
                >
                  Project Revision History — {project?.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="p-1.5 rounded-full text-[#6B6B6B] hover:text-[#111111]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!currentUser ? (
              <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] space-y-3 text-xs text-[#6B6B6B]">
                <p>
                  Sign in to persist and restore multi-version snapshots in the
                  HMX PostgreSQL database.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-medium"
                >
                  Sign In to View Version History
                </button>
              </div>
            ) : loadingVersions ? (
              <div className="py-8 text-center text-xs font-mono text-[#6B6B6B]">
                Loading revision history...
              </div>
            ) : versions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] text-xs text-[#6B6B6B]">
                No database snapshots recorded yet for this project. Click the{" "}
                <strong>DB Save</strong> pill in the toolbar to create v1.
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {versions.map((ver) => (
                  <div
                    key={ver.versionNumber}
                    className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E7] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white border border-[#E7E7E7] text-[10px] font-mono font-semibold text-[#C5A880]">
                          v{ver.versionNumber}
                        </span>
                        <span className="text-xs font-medium text-[#111111]">
                          {ver.summary}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#6B6B6B] block mt-1">
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver.versionNumber)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E7E7E7] text-xs font-medium text-[#111111] hover:border-[#111111] transition-colors inline-flex items-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

