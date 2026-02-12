"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimedPermission } from "@/lib/security/permission-expiry";
import {
  Key,
  Plus,
  Clock,
  X,
  Shield,
  AlertTriangle,
} from "lucide-react";

// ─── Permissions Manager ─────────────────────────────────

export function PermissionsManager({ pairId }: { pairId: string }) {
  const [permissions, setPermissions] = useState<TimedPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrant, setShowGrant] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/security/permissions?pairId=${encodeURIComponent(pairId)}`
      );
      const data = await res.json();
      setPermissions(data.permissions ?? []);
    } catch (e) {
      console.error("[PermissionsManager] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const revoke = async (permissionId: string) => {
    try {
      await fetch("/api/security/permissions?action=revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionId, revokedBy: "dashboard", reason: "Manually revoked" }),
      });
      fetchPermissions();
    } catch (e) {
      console.error("[PermissionsManager] revoke failed:", e);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Timed Permissions
        </h3>
        <button
          type="button"
          onClick={() => setShowGrant(!showGrant)}
          className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Grant
        </button>
      </div>

      {showGrant && (
        <GrantPermissionForm
          pairId={pairId}
          onGranted={() => { setShowGrant(false); fetchPermissions(); }}
          onCancel={() => setShowGrant(false)}
        />
      )}

      {permissions.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No active timed permissions. Grant one to temporarily elevate agent capabilities.
        </p>
      ) : (
        <div className="space-y-2">
          {permissions.map((perm) => {
            const expiresIn = Math.max(
              0,
              Math.round((new Date(perm.expiresAt).getTime() - Date.now()) / 60000)
            );
            const usagePct = perm.maxUses
              ? Math.round((perm.usageCount / perm.maxUses) * 100)
              : null;

            return (
              <div
                key={perm.id}
                className="rounded border border-zinc-700 p-2 flex items-start gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-200 font-mono truncate">
                      {perm.operation}
                    </span>
                    {perm.target && (
                      <span className="text-[10px] text-zinc-500 truncate">
                        → {perm.target}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{perm.reason}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {expiresIn}m remaining
                    </span>
                    {usagePct !== null && (
                      <span className="text-[10px] text-zinc-500">
                        {perm.usageCount}/{perm.maxUses} uses
                      </span>
                    )}
                    {expiresIn <= 5 && (
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Expiring soon
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(perm.id)}
                  className="text-zinc-600 hover:text-red-400 transition p-1"
                  title="Revoke permission"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Grant Permission Form ───────────────────────────────

const COMMON_OPERATIONS = [
  { value: "write:moltbook_post", label: "Post to Moltbook" },
  { value: "write:moltbook_comment", label: "Comment on Moltbook" },
  { value: "write:moltbook_follow", label: "Follow on Moltbook" },
  { value: "read:rss", label: "Read RSS feeds" },
  { value: "read:github", label: "Read GitHub" },
  { value: "write:draft", label: "Write drafts" },
  { value: "write:notification", label: "Send notifications" },
];

const DURATION_PRESETS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 480, label: "8 hours" },
  { value: 1440, label: "24 hours" },
];

function GrantPermissionForm({
  pairId,
  onGranted,
  onCancel,
}: {
  pairId: string;
  onGranted: () => void;
  onCancel: () => void;
}) {
  const [operation, setOperation] = useState(COMMON_OPERATIONS[0].value);
  const [customOp, setCustomOp] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reason, setReason] = useState("");
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const finalOp = operation === "custom" ? customOp.trim() : operation;
    if (!finalOp || !reason.trim()) return;

    setSubmitting(true);
    try {
      await fetch("/api/security/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId,
          operation: finalOp,
          durationMinutes,
          grantedBy: "dashboard",
          reason: reason.trim(),
          maxUses: maxUses || undefined,
        }),
      });
      onGranted();
    } catch (e) {
      console.error("[GrantPermissionForm] submit failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded border border-amber-500/20 bg-amber-500/5 p-3 mb-3 space-y-3">
      {/* Operation */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Operation</label>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          className="w-full text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500/50"
        >
          {COMMON_OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
          <option value="custom">Custom operation...</option>
        </select>
        {operation === "custom" && (
          <input
            type="text"
            value={customOp}
            onChange={(e) => setCustomOp(e.target.value)}
            placeholder="e.g. write:config"
            className="w-full mt-1 text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        )}
      </div>

      {/* Duration */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">Duration</label>
        <div className="flex flex-wrap gap-1">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDurationMinutes(d.value)}
              className={`text-xs px-2 py-1 rounded border transition ${
                durationMinutes === d.value
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Max uses (optional) */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">
          Max Uses (optional)
        </label>
        <input
          type="number"
          value={maxUses ?? ""}
          onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          min={1}
          placeholder="Unlimited"
          className="w-24 text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Reason */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase block mb-1">
          Reason <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this permission needed?"
          className="w-full text-xs px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!reason.trim() || submitting}
          className="text-xs px-3 py-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition disabled:opacity-50"
        >
          {submitting ? "Granting..." : "Grant Permission"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
