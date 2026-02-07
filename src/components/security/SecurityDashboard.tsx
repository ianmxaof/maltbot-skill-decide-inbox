"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Key,
  AlertTriangle,
  AlertOctagon,
  Eye,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Settings2,
  Lightbulb,
  TrendingUp,
  FileWarning,
} from "lucide-react";
import Link from "next/link";

interface SecurityStats {
  totalOperations: number;
  allowed: number;
  blocked: number;
  pendingApprovals: number;
  anomalies: number;
  isPaused: boolean;
}

interface AnomalyEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: "info" | "warning" | "critical" | "emergency";
  description: string;
  actionTaken: string;
  requiresReview: boolean;
}

interface PendingApproval {
  id: string;
  operation: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
}

interface StoredCredential {
  id: string;
  service: string;
  label: string;
  createdAt: string;
  lastUsed?: string;
  permissions: string[];
}

interface AuditEntry {
  id: string;
  timestamp: string;
  result: "allowed" | "blocked" | "approved" | "denied";
  operation: string;
  target?: string;
  source: string;
  reason?: string;
}

interface SystemState {
  mode: "active" | "supervised" | "halted";
  haltedAt?: string;
  haltedBy?: string;
  haltReason?: string;
}

interface OperationOverrideItem {
  operation: string;
  target?: string;
  scope?: "global" | "agent";
  agentId?: string;
  action: "allow" | "block" | "ask";
  expiresAt?: number;
  reason?: string;
}

interface SuggestedRuleItem {
  id: string;
  type: string;
  description: string;
  payload: { path?: string; target?: string; operation?: string };
}

interface TrustScoreItem {
  operation: string;
  target?: string;
  agentId?: string;
  successCount: number;
  failureCount: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  weightedScore?: number;
}

const SEVERITY_CLASSES: Record<string, string> = {
  info: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  emergency: "text-red-500 bg-red-500/20 border-red-500/50 animate-pulse",
};

const RESULT_COLORS: Record<string, string> = {
  allowed: "text-emerald-400",
  blocked: "text-red-400",
  approved: "text-blue-400",
  denied: "text-amber-400",
};

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "anomalies" | "approvals" | "vault" | "audit" | "overrides" | "suggestions" | "trust"
  >("overview");
  const [stats, setStats] = useState<SecurityStats>({
    totalOperations: 0,
    allowed: 0,
    blocked: 0,
    pendingApprovals: 0,
    anomalies: 0,
    isPaused: false,
  });
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [newCredential, setNewCredential] = useState({
    service: "",
    label: "",
    value: "",
  });
  const [loading, setLoading] = useState(true);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [halting, setHalting] = useState(false);
  const [overrides, setOverrides] = useState<OperationOverrideItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedRuleItem[]>([]);
  const [trustScores, setTrustScores] = useState<TrustScoreItem[]>([]);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({
    operation: "",
    target: "",
    action: "allow" as "allow" | "block" | "ask",
    reason: "",
    expiresAt: "",
  });
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);

  const loadSecurityData = useCallback(async () => {
    try {
      const [statsRes, anomaliesRes, approvalsRes, vaultRes, auditRes, govRes, overridesRes, suggestionsRes, trustRes] =
        await Promise.all([
          fetch("/api/security/stats"),
          fetch("/api/security/anomalies?limit=50"),
          fetch("/api/security/approvals"),
          fetch("/api/security/vault"),
          fetch("/api/security/audit?limit=100"),
          fetch("/api/governance/state"),
          fetch("/api/security/overrides"),
          fetch("/api/security/suggestions?hours=24"),
          fetch("/api/security/trust-scores"),
        ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (govRes.ok) {
        const data = await govRes.json();
        setSystemState(data);
      }
      if (anomaliesRes.ok) {
        const data = await anomaliesRes.json();
        setAnomalies(data.anomalies ?? []);
      }
      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setApprovals(data.approvals ?? []);
      }
      if (vaultRes.ok) {
        const data = await vaultRes.json();
        setCredentials(data.credentials ?? []);
        setVaultError(null);
      } else {
        const err = await vaultRes.json().catch(() => ({}));
        setVaultError(err.error ?? "Vault unavailable");
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLog(data.audit ?? []);
      }
      if (overridesRes.ok) {
        const data = await overridesRes.json();
        setOverrides(data.overrides ?? []);
      }
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(data.suggestions ?? []);
      }
      if (trustRes.ok) {
        const data = await trustRes.json();
        setTrustScores(data.scores ?? []);
      }
    } catch (error) {
      console.error("Failed to load security data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 10000);
    return () => clearInterval(interval);
  }, [loadSecurityData]);

  async function handleApprove(approvalId: string) {
    const res = await fetch(`/api/security/approvals/${approvalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedBy: "dashboard" }),
    });
    if (res.ok) {
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      setStats((prev) => ({
        ...prev,
        pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
      }));
    }
  }

  async function handleDeny(approvalId: string) {
    const res = await fetch(`/api/security/approvals/${approvalId}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deniedBy: "dashboard" }),
    });
    if (res.ok) {
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      setStats((prev) => ({
        ...prev,
        pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
      }));
    }
  }

  async function handleMarkReviewed(anomalyId: string) {
    const res = await fetch(
      `/api/security/anomalies/${anomalyId}/review`,
      { method: "POST" }
    );
    if (res.ok) {
      setAnomalies((prev) =>
        prev.map((a) =>
          a.id === anomalyId ? { ...a, requiresReview: false } : a
        )
      );
    }
  }

  async function handleTogglePause() {
    const endpoint = stats.isPaused
      ? "/api/security/resume"
      : "/api/security/pause";
    const res = await fetch(endpoint, { method: "POST" });
    if (res.ok) {
      setStats((prev) => ({ ...prev, isPaused: !prev.isPaused }));
    }
  }

  async function handleMetHalt() {
    setHalting(true);
    try {
      const res = await fetch("/api/governance/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: systemState?.mode === "halted" ? "active" : "halted",
          haltReason: systemState?.mode === "halted" ? undefined : "Halted from Security dashboard",
          haltedBy: "dashboard",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSystemState(data);
      }
    } finally {
      setHalting(false);
    }
  }

  async function handleAddCredential() {
    if (!newCredential.service || !newCredential.label || !newCredential.value)
      return;
    const res = await fetch("/api/security/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: newCredential.service,
        label: newCredential.label,
        value: newCredential.value,
        permissions: [],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setCredentials((prev) => [
        ...prev,
        {
          id: data.id,
          service: newCredential.service,
          label: newCredential.label,
          createdAt: new Date().toISOString(),
          permissions: [],
        },
      ]);
      setNewCredential({ service: "", label: "", value: "" });
      setShowAddCredential(false);
    } else {
      const err = await res.json().catch(() => ({}));
      setVaultError(err.error ?? "Failed to store credential");
    }
  }

  async function handleDeleteCredential(credId: string) {
    const res = await fetch(`/api/security/vault/${credId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCredentials((prev) => prev.filter((c) => c.id !== credId));
    }
  }

  async function handleAddOverride() {
    if (!newOverride.operation.trim()) return;
    const body: Record<string, unknown> = {
      operation: newOverride.operation.trim(),
      action: newOverride.action,
      reason: newOverride.reason.trim() || undefined,
    };
    if (newOverride.target.trim()) body.target = newOverride.target.trim();
    if (newOverride.expiresAt.trim()) {
      const t = new Date(newOverride.expiresAt).getTime();
      if (!isNaN(t)) body.expiresAt = t;
    }
    const res = await fetch("/api/security/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setNewOverride({ operation: "", target: "", action: "allow", reason: "", expiresAt: "" });
      setShowAddOverride(false);
      loadSecurityData();
    }
  }

  async function handleRemoveOverride(operation: string, target?: string) {
    const res = await fetch("/api/security/overrides", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, target: target || undefined }),
    });
    if (res.ok) loadSecurityData();
  }

  async function handleApplySuggestion(suggestion: SuggestedRuleItem) {
    setApplyingSuggestionId(suggestion.id);
    try {
      const res = await fetch("/api/security/suggestions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion }),
      });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      }
    } finally {
      setApplyingSuggestionId(null);
    }
  }

  function formatTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={
              stats.isPaused
                ? "p-2 rounded-lg bg-red-500/20"
                : "p-2 rounded-lg bg-emerald-500/20"
            }
          >
            {stats.isPaused ? (
              <ShieldOff className="w-6 h-6 text-red-400" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">Security Center</h2>
            <p className="text-sm text-zinc-500">
              {stats.isPaused ? "Agent PAUSED" : "Agent protected"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {stats.anomalies > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">
                {stats.anomalies} anomalies
              </span>
            </div>
          )}
          <button
            onClick={handleTogglePause}
            className={
              stats.isPaused
                ? "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
                : "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
            }
          >
            {stats.isPaused ? (
              <>
                <Play className="w-4 h-4" />
                Resume Agent
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Pause Agent
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Operations (24h)"
          value={stats.totalOperations}
          icon={Activity}
          variant="zinc"
        />
        <StatCard
          label="Allowed"
          value={stats.allowed}
          icon={CheckCircle}
          variant="emerald"
        />
        <StatCard
          label="Blocked"
          value={stats.blocked}
          icon={XCircle}
          variant="red"
        />
        <StatCard
          label="Pending Approvals"
          value={stats.pendingApprovals}
          icon={Clock}
          variant="amber"
          highlight={stats.pendingApprovals > 0}
        />
        <StatCard
          label="Anomalies"
          value={stats.anomalies}
          icon={AlertOctagon}
          variant="red"
          highlight={stats.anomalies > 0}
        />
      </div>

      <div className="flex gap-2 border-b border-zinc-800 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Shield },
          {
            id: "anomalies",
            label: "Anomalies",
            icon: AlertTriangle,
            count: anomalies.filter((a) => a.requiresReview).length,
          },
          {
            id: "approvals",
            label: "Approvals",
            icon: Clock,
            count: approvals.length,
          },
          { id: "overrides", label: "Overrides", icon: Settings2 },
          { id: "suggestions", label: "Suggested Rules", icon: Lightbulb },
          { id: "trust", label: "Trust Scores", icon: TrendingUp },
          { id: "vault", label: "Credential Vault", icon: Key },
          { id: "audit", label: "Audit Log", icon: Eye },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(
                tab.id as
                  | "overview"
                  | "anomalies"
                  | "approvals"
                  | "vault"
                  | "audit"
                  | "overrides"
                  | "suggestions"
                  | "trust"
              )
            }
            className={
              activeTab === tab.id
                ? "flex items-center gap-2 px-4 py-3 border-b-2 border-orange-500 text-orange-400 shrink-0"
                : "flex items-center gap-2 px-4 py-3 border-b-2 border-transparent text-zinc-400 hover:text-zinc-300 shrink-0"
            }
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {"count" in tab && tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* MET switch (Governance) */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Power className="w-5 h-5 text-zinc-400" />
                Governance (MET switch)
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                When halted, no autonomous execution runs until resumed. Autopilot and security-gated operations are blocked.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">System mode:</span>
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      systemState?.mode === "halted"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {systemState?.mode ?? "active"}
                  </span>
                </div>
                {systemState?.mode === "halted" && systemState.haltedAt && (
                  <span className="text-xs text-zinc-500">
                    Halted {systemState.haltedBy ? `by ${systemState.haltedBy} ` : ""}
                    {new Date(systemState.haltedAt).toLocaleString()}
                    {systemState.haltReason ? ` — ${systemState.haltReason}` : ""}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleMetHalt}
                  disabled={halting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    systemState?.mode === "halted"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {halting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : systemState?.mode === "halted" ? (
                    <>
                      <PowerOff className="w-4 h-4" />
                      Resume all
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Halt all
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Link
                href="/security/risk-report"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <FileWarning className="w-4 h-4" />
                Risk report
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Security Layers</h3>
              <div className="space-y-3">
                {[
                  {
                    name: "Credential Vault",
                    status: "active",
                    desc: "AES-256 encrypted storage",
                  },
                  {
                    name: "Content Sanitizer",
                    status: "active",
                    desc: "Prompt injection defense",
                  },
                  {
                    name: "Anomaly Detector",
                    status: "active",
                    desc: "Real-time behavior monitoring",
                  },
                  {
                    name: "Approval Gateway",
                    status: "active",
                    desc: "Human decision choke-point",
                  },
                  {
                    name: "Audit Logger",
                    status: "active",
                    desc: "Full operation history",
                  },
                ].map((layer) => (
                  <div
                    key={layer.name}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                      <div>
                        <div className="font-medium">{layer.name}</div>
                        <div className="text-xs text-zinc-500">
                          {layer.desc}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 uppercase">
                      {layer.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {auditLog.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 hover:bg-zinc-800/30 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono ${
                          RESULT_COLORS[entry.result] ?? "text-zinc-400"
                        }`}
                      >
                        {entry.result.toUpperCase()}
                      </span>
                      <span className="text-sm text-zinc-300 truncate max-w-[200px]">
                        {entry.operation}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === "anomalies" && (
          <div className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No anomalies detected</p>
              </div>
            ) : (
              anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-4 rounded-lg border ${
                    SEVERITY_CLASSES[anomaly.severity] ??
                    "text-zinc-400 bg-zinc-500/10 border-zinc-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {anomaly.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs uppercase opacity-70">
                            {anomaly.severity}
                          </span>
                        </div>
                        <p className="text-sm opacity-80 mt-1">
                          {anomaly.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs opacity-60">
                          <span>Action: {anomaly.actionTaken}</span>
                          <span>{formatTime(anomaly.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    {anomaly.requiresReview && (
                      <button
                        onClick={() => handleMarkReviewed(anomaly.id)}
                        className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors shrink-0"
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="space-y-4">
            {approvals.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No pending approvals</p>
              </div>
            ) : (
              approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="p-4 bg-zinc-900/50 rounded-lg border border-amber-500/30"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-amber-400">
                          {approval.operation}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{approval.reason}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <span>
                          Requested {formatTime(approval.createdAt)}
                        </span>
                        <span>
                          Expires in{" "}
                          {Math.round(
                            (new Date(approval.expiresAt).getTime() -
                              Date.now()) /
                              60000
                          )}
                          m
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeny(approval.id)}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "overrides" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-zinc-500">
                Per-operation overrides: allow, block, or ask for specific operation (and optional target).
              </p>
              <button
                onClick={() => setShowAddOverride(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Override
              </button>
            </div>
            {showAddOverride && (
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
                <h4 className="font-medium mb-3">Add Override</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Operation (e.g. write:moltbook_post)"
                    value={newOverride.operation}
                    onChange={(e) => setNewOverride((p) => ({ ...p, operation: e.target.value }))}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Target (optional)"
                    value={newOverride.target}
                    onChange={(e) => setNewOverride((p) => ({ ...p, target: e.target.value }))}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                  <select
                    value={newOverride.action}
                    onChange={(e) => setNewOverride((p) => ({ ...p, action: e.target.value as "allow" | "block" | "ask" }))}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  >
                    <option value="allow">Allow</option>
                    <option value="block">Block</option>
                    <option value="ask">Ask</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={newOverride.reason}
                    onChange={(e) => setNewOverride((p) => ({ ...p, reason: e.target.value }))}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                  <input
                    type="datetime-local"
                    placeholder="Expires (optional)"
                    value={newOverride.expiresAt}
                    onChange={(e) => setNewOverride((p) => ({ ...p, expiresAt: e.target.value }))}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm sm:col-span-2"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setShowAddOverride(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300">Cancel</button>
                  <button onClick={handleAddOverride} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium">Add</button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {overrides.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">No overrides</div>
              ) : (
                overrides.map((o, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 gap-4">
                    <div className="min-w-0">
                      <span className="font-mono text-sm text-zinc-300">{o.operation}</span>
                      {o.target && <span className="text-zinc-500 text-sm ml-2">→ {o.target}</span>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${o.action === "allow" ? "bg-emerald-500/20 text-emerald-400" : o.action === "block" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>{o.action}</span>
                        {o.reason && <span className="text-xs text-zinc-500">{o.reason}</span>}
                        {o.expiresAt && <span className="text-xs text-zinc-500">Expires {new Date(o.expiresAt).toLocaleString()}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveOverride(o.operation, o.target)} className="p-2 text-zinc-500 hover:text-red-400 shrink-0" aria-label="Remove override"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "suggestions" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Suggested rules from activity (learning loop). Apply to add an override or allowlist entry.
            </p>
            {suggestions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No suggested rules</p>
              </div>
            ) : (
              suggestions.map((s) => (
                <div key={s.id} className="flex items-start justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 gap-4">
                  <div className="min-w-0">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{s.type}</span>
                    <p className="text-sm text-zinc-300 mt-2">{s.description}</p>
                  </div>
                  <button
                    onClick={() => handleApplySuggestion(s)}
                    disabled={applyingSuggestionId === s.id}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg text-sm font-medium shrink-0"
                  >
                    {applyingSuggestionId === s.id ? "Applying…" : "Apply"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "trust" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Trust scores per operation/target. Auto-approve when score ≥ threshold and no recent failure.
            </p>
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Operation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Success</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Failure</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Last success / failure</th>
                  </tr>
                </thead>
                <tbody>
                  {trustScores.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500 text-sm">No trust score entries</td></tr>
                  ) : (
                    trustScores.map((t, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-sm font-mono text-zinc-300">{t.operation}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{t.target ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400">{t.successCount}</td>
                        <td className="px-4 py-3 text-sm text-red-400">{t.failureCount}</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{t.weightedScore != null ? t.weightedScore.toFixed(2) : "-"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {t.lastSuccessAt ? formatTime(new Date(t.lastSuccessAt).toISOString()) : "-"} / {t.lastFailureAt ? formatTime(new Date(t.lastFailureAt).toISOString()) : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "vault" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-zinc-500">
                Credentials are encrypted at rest with AES-256-GCM. Agent never
                sees raw keys.
              </p>
              <button
                onClick={() => setShowAddCredential(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Credential
              </button>
            </div>

            {vaultError && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                {vaultError}
              </div>
            )}

            {showAddCredential && (
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
                <h4 className="font-medium mb-3">Add New Credential</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Service (e.g., moltbook)"
                    value={newCredential.service}
                    onChange={(e) =>
                      setNewCredential((prev) => ({
                        ...prev,
                        service: e.target.value,
                      }))
                    }
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g., Main API Key)"
                    value={newCredential.label}
                    onChange={(e) =>
                      setNewCredential((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                  <input
                    type="password"
                    placeholder="API Key / Secret"
                    value={newCredential.value}
                    onChange={(e) =>
                      setNewCredential((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowAddCredential(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCredential}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium"
                  >
                    Save Credential
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 bg-zinc-800 rounded-lg shrink-0">
                      <Key className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{cred.label}</div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                        <span>{cred.service}</span>
                        <span>•</span>
                        <span>
                          Last used:{" "}
                          {cred.lastUsed
                            ? formatTime(cred.lastUsed)
                            : "never"}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {cred.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 text-xs bg-zinc-800 rounded"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCredential(cred.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                    aria-label="Delete credential"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Result
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Operation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {formatTime(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-mono ${
                          RESULT_COLORS[entry.result] ?? "text-zinc-400"
                        }`}
                      >
                        {entry.result.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-300">
                      {entry.operation}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {entry.target ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {entry.source}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 truncate max-w-xs">
                      {entry.reason ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  variant: "zinc" | "emerald" | "red" | "amber";
  highlight?: boolean;
}) {
  const iconBg =
    variant === "zinc"
      ? "text-zinc-400 bg-zinc-500/10"
      : variant === "emerald"
        ? "text-emerald-400 bg-emerald-500/10"
        : variant === "red"
          ? "text-red-400 bg-red-500/10"
          : "text-amber-400 bg-amber-500/10";

  const cardBorder = highlight
    ? "border-amber-500/50 bg-amber-500/5"
    : "border-zinc-800 bg-zinc-900/50";

  return (
    <div
      className={`p-4 rounded-xl border ${cardBorder}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
