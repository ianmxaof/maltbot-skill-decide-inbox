"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Trash2, RefreshCw, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import type { SkillCard } from "@/types/dashboard";
import { OpenClawSetupWizard } from "./OpenClawSetupWizard";

type SkillTab = "installed" | "available" | "bundled";

interface OpenClawStatus {
  installed: boolean;
  configured: boolean;
  version: string | null;
  hasApiKeys: boolean;
  hasModel: boolean;
  gatewayRunning: boolean;
  errors: string[];
}

export function SkillsList() {
  const [activeTab, setActiveTab] = useState<SkillTab>("installed");
  const [localSkills, setLocalSkills] = useState<SkillCard[]>([]);
  const [clawHubSkills, setClawHubSkills] = useState<SkillCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [openClawStatus, setOpenClawStatus] = useState<OpenClawStatus | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<{
    type: "success" | "error";
    message: string;
    skillName: string;
  } | null>(null);

  const checkOpenClawStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/status");
      const status = await res.json();
      setOpenClawStatus(status);
      
      // Show setup wizard if OpenClaw is not properly configured
      const needsSetup = !status.installed || !status.configured;
      setShowSetupWizard(needsSetup);
      
      return status;
    } catch (err) {
      console.error("[Skills] Failed to check OpenClaw status:", err);
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // First, check OpenClaw status
    const status = await checkOpenClawStatus();
    
    try {
      // Fetch local installed skills (always try, even if status check failed)
      const localRes = await fetch("/api/openclaw/skills", { cache: "no-store" });
      const localData = await localRes.json();
      
      console.log("[Skills] Local skills response:", localData);
      
      if (localData.ok && Array.isArray(localData.skills)) {
        setLocalSkills(localData.skills);
        // If we got skills successfully, OpenClaw is working - hide wizard
        if (localData.skills.length > 0 || status?.configured) {
          setShowSetupWizard(false);
        }
      } else {
        // Don't overwrite with empty if we already have skills (e.g. from optimistic install)
        setLocalSkills((prev) => {
          if (prev.length > 0) return prev;
          return [];
        });
        console.warn("[Skills] Local skills fetch failed or returned no array:", localData);
        
        // Only show wizard if OpenClaw is truly not configured
        // Don't show for temporary errors if it's already installed and configured
        if (status && (!status.installed || !status.configured)) {
          setShowSetupWizard(true);
        } else {
          setShowSetupWizard(false);
        }
      }

      // Always fetch ClawHub skills for Available and Bundled tabs
      const clawHubRes = await fetch("/api/openclaw/skills/clawhub");
      const clawHubData = await clawHubRes.json();
      
      console.log("[Skills] ClawHub response:", clawHubData);
      
      if (clawHubData.ok && Array.isArray(clawHubData.skills)) {
        setClawHubSkills(clawHubData.skills);
      } else {
        setClawHubSkills([]);
      }

      if (localData.ok) {
        setError(null);
      } else if (!showSetupWizard) {
        const errorMsg = localData.error?.message ?? "Failed to load skills";
        setError(errorMsg);
        console.error("[Skills] Error loading skills:", errorMsg);
      }
    } catch (err) {
      const errorMsg = "Failed to load skills";
      setError(errorMsg);
      console.error("[Skills] Exception during fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [checkOpenClawStatus, showSetupWizard]);

  useEffect(() => {
    refetch();
    
    // Listen for Settings changes and auto-refresh
    const handleSettingsUpdate = () => {
      console.log("[Skills] Settings updated, refreshing status...");
      refetch();
    };
    
    window.addEventListener("settings:keysUpdated", handleSettingsUpdate);
    window.addEventListener("settings:modelUpdated", handleSettingsUpdate);
    window.addEventListener("settings:gatewayUpdated", handleSettingsUpdate);
    
    return () => {
      window.removeEventListener("settings:keysUpdated", handleSettingsUpdate);
      window.removeEventListener("settings:modelUpdated", handleSettingsUpdate);
      window.removeEventListener("settings:gatewayUpdated", handleSettingsUpdate);
    };
  }, [refetch]);

  const install = async (skill: SkillCard) => {
    const actingKey = skill.installSlug ?? skill.name;
    setActing(actingKey);
    setInstallFeedback(null);
    try {
      const res = await fetch("/api/openclaw/skills/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skill.name,
          ...(skill.installSlug && { installSlug: skill.installSlug }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic update: add skill to Installed immediately so it appears before refetch
        setLocalSkills((prev) => {
          const lower = (skill.name ?? "").toLowerCase();
          if (prev.some((s) => (s.name ?? "").toLowerCase() === lower)) return prev;
          return [
            ...prev,
            {
              id: `maltbot-${skill.name}-${Date.now()}`,
              name: skill.name,
              description: "Installed via Maltbot",
              authorId: "maltbot",
              authorName: "Maltbot",
              authorReputation: "community" as const,
              dependencyRiskScore: 50,
              hasDryRun: false,
              status: "ready" as const,
              source: "filesystem",
            },
          ];
        });
        setInstallFeedback({
          type: "success",
          message: `${skill.name} installed successfully. It appears in the Installed tab.`,
          skillName: skill.name,
        });
        setActiveTab("installed");
        setTimeout(() => setInstallFeedback(null), 6000);
        await refetch();
      } else {
        const errMsg = data.error ?? "Install failed";
        setInstallFeedback({
          type: "error",
          message: errMsg,
          skillName: skill.name,
        });
        setError(errMsg);
      }
    } catch {
      const errMsg = "Request failed — check connection";
      setInstallFeedback({
        type: "error",
        message: errMsg,
        skillName: skill.name,
      });
    } finally {
      setActing(null);
    }
  };

  const uninstall = async (name: string) => {
    if (!confirm(`Uninstall skill "${name}"?`)) return;
    setActing(name);
    setInstallFeedback(null);
    try {
      const res = await fetch("/api/openclaw/skills/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        await refetch();
        setInstallFeedback({
          type: "success",
          message: `${name} uninstalled.`,
          skillName: name,
        });
        setTimeout(() => setInstallFeedback(null), 4000);
      } else {
        setInstallFeedback({
          type: "error",
          message: data.error ?? "Uninstall failed",
          skillName: name,
        });
      }
    } catch {
      setInstallFeedback({
        type: "error",
        message: "Request failed — check connection",
        skillName: name,
      });
    } finally {
      setActing(null);
    }
  };

  // Bundled = skills that ship with OpenClaw (from localSkills, source openclaw-bundled or openclaw-managed)
  const bundledSkills = localSkills.filter(
    (s) =>
      (s.source === "openclaw-bundled" || s.source === "openclaw-managed") &&
      (s.name ?? "").trim().length > 0
  );

  const installedByName = new Map(
    localSkills.filter((s) => s.status === "ready").map((s) => [s.name.toLowerCase(), s])
  );

  // Community skills from ClawHub (not bundled) — install from external registry
  const communitySkills = clawHubSkills.filter((s) => s.source !== "openclaw-bundled");
  const installedNames = new Set(
    localSkills.filter((s) => s.status === "ready").map((s) => (s.name ?? "").toLowerCase())
  );
  const isCommunitySkillInstalled = (s: SkillCard) => {
    const bySlug = (s.installSlug ?? "").toLowerCase();
    const byName = (s.name ?? "").toLowerCase();
    return (bySlug && installedNames.has(bySlug)) || (byName && installedNames.has(byName));
  };
  const availableCommunityCount = communitySkills.filter((s) => !isCommunitySkillInstalled(s)).length;

  // Compute filtered skills based on active tab
  const getFilteredSkills = (): SkillCard[] => {
    switch (activeTab) {
      case "installed":
        return localSkills.filter((s) => s.status === "ready");
      case "bundled":
        // Real bundled skills from OpenClaw (48+), enriched with installed status
        return bundledSkills.map((s) => {
          const installed = installedByName.get((s.name ?? "").toLowerCase());
          return installed ? { ...s, status: "ready" as const } : s;
        });
      case "available":
        // Community skills from ClawHub — exclude already installed (match by slug or name)
        return communitySkills.filter((s) => !isCommunitySkillInstalled(s));
      default:
        return [];
    }
  };

  const filteredSkills = getFilteredSkills();
  const totalInstalled = localSkills.filter((s) => s.status === "ready").length;
  const bundledCount = bundledSkills.length;

  if (loading && localSkills.length === 0 && clawHubSkills.length === 0 && !openClawStatus) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
        Loading skills…
      </div>
    );
  }

  if (error && localSkills.length === 0 && clawHubSkills.length === 0 && !showSetupWizard) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
          <p className="text-sm font-medium text-amber-400">{error}</p>
          <div className="mt-3 space-y-2 text-xs text-zinc-400">
            <p>Possible causes:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>OpenClaw CLI not installed or not configured</li>
              <li>OPENCLAW_CLI_PATH environment variable not set correctly</li>
              <li>OpenClaw CLI command is hanging (waiting for input or auth)</li>
              <li>ClawHub API endpoint doesn't exist yet or requires authentication</li>
            </ul>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={refetch}
              className="rounded border border-zinc-600 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Retry
            </button>
            <a
              href="/api/openclaw/skills/debug"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-zinc-600 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              View Diagnostics
            </a>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-xs text-zinc-400">
          <p className="font-medium text-zinc-300 mb-2">Quick Setup Check:</p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>Verify OpenClaw is installed: <code className="bg-zinc-900 px-1 py-0.5 rounded">openclaw --version</code></li>
            <li>Check your <code className="bg-zinc-900 px-1 py-0.5 rounded">.env.local</code> file has: <code className="bg-zinc-900 px-1 py-0.5 rounded">OPENCLAW_CLI_PATH=C:\Users\ianmp\AppData\Roaming\npm\openclaw.cmd</code></li>
            <li>Ensure OpenClaw is configured: <code className="bg-zinc-900 px-1 py-0.5 rounded">openclaw config list</code></li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup wizard - shown above tabs when needed */}
      {showSetupWizard && openClawStatus && (
        <OpenClawSetupWizard
          status={openClawStatus}
          onRetry={refetch}
        />
      )}

      {/* Install feedback banner */}
      {installFeedback && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
            installFeedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
          }`}
        >
          {installFeedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}
          <p className="flex-1 text-sm font-medium">{installFeedback.message}</p>
          <button
            type="button"
            onClick={() => setInstallFeedback(null)}
            className="shrink-0 rounded p-1 hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs - always visible */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("installed")}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "installed"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Installed ({totalInstalled})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("available")}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "available"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Available ({availableCommunityCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bundled")}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "bundled"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Bundled ({bundledCount})
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 rounded border border-zinc-600 px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
            aria-label="Refresh skills"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab description */}
      <div className="text-xs text-zinc-500 space-y-1">
        {activeTab === "installed" && (
          <p>Skills currently installed and ready to use. Uninstall to remove.</p>
        )}
        {activeTab === "available" && (
          <>
            <p>Community skills from ClawHub — Moltbook, third-party integrations. Install to add to your agent.</p>
            <p>
              <a
                href="https://clawdhub.com/skills"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline"
              >
                Browse full catalog at clawdhub.com →
              </a>
            </p>
          </>
        )}
        {activeTab === "bundled" && (
          <p>Skills that ship with OpenClaw — pre-vetted by the OpenClaw team. Install to enable; already on your system.</p>
        )}
      </div>

      {filteredSkills.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
          {activeTab === "installed" && "No skills installed yet. Switch to Available or Bundled to install skills."}
          {activeTab === "available" && "No available skills found. All ClawHub skills may already be installed."}
          {activeTab === "bundled" && "No bundled skills found."}
        </div>
      )}

      <ul className="space-y-4">
        {filteredSkills
          .filter((s) => (s.name ?? "").trim().length > 0)
          .map((s) => {
            const isActing = acting === s.name;
            const isMissing = s.status === "missing";
            const isReady = s.status === "ready";

            return (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    {/* Row 1: Name + status/source/reputation badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{s.name}</h3>
                      {s.status && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            s.status === "ready"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : s.status === "missing"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-zinc-600 text-zinc-400"
                          }`}
                        >
                          {s.status === "ready" ? "ready" : s.status === "missing" ? "missing" : s.status}
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          s.authorReputation === "verified"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : s.authorReputation === "community"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-zinc-600 text-zinc-400"
                        }`}
                      >
                        {s.authorReputation ?? "unknown"}
                      </span>
                      {s.source && (
                        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                          {s.source}
                        </span>
                      )}
                    </div>
                    {/* Row 2: Short description */}
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {s.description?.trim() || <span className="italic text-zinc-500">No description</span>}
                    </p>
                    {/* Row 3: Author + metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>Author: {s.authorName}</span>
                      <span>Risk: {s.dependencyRiskScore}/100</span>
                      {s.usageCount != null && <span>{s.usageCount} installs</span>}
                      {s.timeToRollback && <span>Rollback ~{s.timeToRollback}</span>}
                      {s.hasDryRun && (
                        <span className="rounded border border-zinc-600 px-1.5 py-0.5 text-zinc-400">
                          Dry run
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => install(s)}
                      disabled={isActing || isReady}
                      aria-label={`Install ${s.name}`}
                      className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
                    >
                      {isActing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {isReady ? "Installed" : "Install"}
                    </button>
                    <button
                      type="button"
                      onClick={() => uninstall(s.name)}
                      disabled={isActing || !isReady}
                      aria-label={`Uninstall ${s.name}`}
                      className="flex items-center gap-1.5 rounded border border-zinc-600 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Uninstall
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
