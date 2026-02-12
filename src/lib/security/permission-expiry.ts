/**
 * Permission Expiry — time-limited approvals that auto-revoke.
 *
 * From the transcript: humans should be able to grant short-term elevated
 * permissions that expire, rather than permanent blanket approvals.
 * This prevents privilege creep where agents accumulate permissions over time.
 */

import { kv } from "@/lib/db";
import { appendImmutableAudit } from "./immutable-audit";

export interface TimedPermission {
  id: string;
  pairId: string;
  operation: string;          // e.g. "write:moltbook_post"
  target?: string;            // Optional specific target
  grantedAt: string;          // ISO 8601
  expiresAt: string;          // ISO 8601
  grantedBy: string;          // userId
  reason: string;             // Why was this granted?
  revoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
  usageCount: number;         // How many times the permission has been used
  maxUses?: number;           // Optional usage cap
}

async function readPermissions(): Promise<TimedPermission[]> {
  try {
    const data = await kv.get<TimedPermission[]>("timed-permissions");
    return data ?? [];
  } catch {
    return [];
  }
}

async function writePermissions(perms: TimedPermission[]): Promise<void> {
  await kv.set("timed-permissions", perms);
}

// ─── Core Functions ──────────────────────────────────────

/**
 * Grant a time-limited permission.
 */
export async function grantTimedPermission(opts: {
  pairId: string;
  operation: string;
  target?: string;
  durationMinutes: number;
  grantedBy: string;
  reason: string;
  maxUses?: number;
}): Promise<TimedPermission> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + opts.durationMinutes * 60 * 1000);

  const perm: TimedPermission = {
    id: `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pairId: opts.pairId,
    operation: opts.operation,
    target: opts.target,
    grantedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    grantedBy: opts.grantedBy,
    reason: opts.reason,
    revoked: false,
    usageCount: 0,
    maxUses: opts.maxUses,
  };

  const perms = await readPermissions();
  perms.push(perm);
  await writePermissions(perms);

  // Immutable audit
  await appendImmutableAudit("permission_granted", {
    result: "approved",
    operation: opts.operation,
    target: opts.target,
    userId: opts.grantedBy,
    reason: opts.reason,
    metadata: {
      permissionId: perm.id,
      durationMinutes: opts.durationMinutes,
      expiresAt: expiresAt.toISOString(),
      maxUses: opts.maxUses,
    },
  }).catch(() => {});

  return perm;
}

/**
 * Check if a timed permission exists and is still valid for an operation.
 */
export async function checkTimedPermission(
  pairId: string,
  operation: string,
  target?: string
): Promise<{ granted: boolean; permission?: TimedPermission; reason?: string }> {
  const perms = await readPermissions();
  const now = new Date().toISOString();

  const matching = perms.filter(
    (p) =>
      p.pairId === pairId &&
      !p.revoked &&
      (p.operation === operation ||
        (p.operation.endsWith(":*") && operation.startsWith(p.operation.slice(0, -1)))) &&
      (!p.target || p.target === target)
  );

  for (const perm of matching) {
    // Check expiry
    if (perm.expiresAt < now) {
      continue; // expired — will be cleaned up by sweepExpired
    }

    // Check usage cap
    if (perm.maxUses !== undefined && perm.usageCount >= perm.maxUses) {
      continue;
    }

    return { granted: true, permission: perm };
  }

  return {
    granted: false,
    reason: `No valid timed permission for "${operation}"${target ? ` on "${target}"` : ""}`,
  };
}

/**
 * Record that a timed permission was used (increment usage counter).
 */
export async function recordPermissionUsage(permissionId: string): Promise<void> {
  const perms = await readPermissions();
  const perm = perms.find((p) => p.id === permissionId);
  if (!perm) return;

  perm.usageCount += 1;

  // Auto-revoke if max uses reached
  if (perm.maxUses !== undefined && perm.usageCount >= perm.maxUses) {
    perm.revoked = true;
    perm.revokedAt = new Date().toISOString();
    perm.revokedReason = "Max uses reached";

    await appendImmutableAudit("permission_revoked", {
      result: "expired",
      operation: perm.operation,
      target: perm.target,
      reason: "Max uses reached",
      metadata: { permissionId: perm.id, usageCount: perm.usageCount },
    }).catch(() => {});
  }

  await writePermissions(perms);
}

/**
 * Manually revoke a timed permission.
 */
export async function revokeTimedPermission(
  permissionId: string,
  revokedBy: string,
  reason?: string
): Promise<boolean> {
  const perms = await readPermissions();
  const perm = perms.find((p) => p.id === permissionId);
  if (!perm || perm.revoked) return false;

  perm.revoked = true;
  perm.revokedAt = new Date().toISOString();
  perm.revokedReason = reason ?? "Manually revoked";

  await writePermissions(perms);

  await appendImmutableAudit("permission_revoked", {
    result: "denied",
    operation: perm.operation,
    target: perm.target,
    userId: revokedBy,
    reason: reason ?? "Manually revoked",
    metadata: { permissionId: perm.id },
  }).catch(() => {});

  return true;
}

/**
 * Sweep expired permissions — call periodically (e.g. in heartbeat).
 * Returns the count of newly-expired permissions.
 */
export async function sweepExpiredPermissions(): Promise<number> {
  const perms = await readPermissions();
  const now = new Date().toISOString();
  let swept = 0;

  for (const perm of perms) {
    if (!perm.revoked && perm.expiresAt < now) {
      perm.revoked = true;
      perm.revokedAt = now;
      perm.revokedReason = "Expired";
      swept++;

      await appendImmutableAudit("permission_revoked", {
        result: "expired",
        operation: perm.operation,
        target: perm.target,
        reason: "Time limit expired",
        metadata: { permissionId: perm.id, expiresAt: perm.expiresAt },
      }).catch(() => {});
    }
  }

  if (swept > 0) {
    await writePermissions(perms);
  }

  return swept;
}

/**
 * Get all active (non-expired, non-revoked) permissions for a pair.
 */
export async function getActivePermissions(pairId: string): Promise<TimedPermission[]> {
  const perms = await readPermissions();
  const now = new Date().toISOString();

  return perms.filter(
    (p) => p.pairId === pairId && !p.revoked && p.expiresAt > now
  );
}

/**
 * Get all permissions for a pair (including expired/revoked).
 */
export async function getAllPermissions(pairId: string): Promise<TimedPermission[]> {
  const perms = await readPermissions();
  return perms.filter((p) => p.pairId === pairId);
}
