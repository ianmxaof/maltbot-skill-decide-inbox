/**
 * Daily Digest / Morning Briefing Engine
 *
 * Generates a structured summary of agent activity, decisions,
 * security events, and permission status from the last 24 hours.
 * Can be triggered manually via API or scheduled via cron/heartbeat.
 */

import { kv } from "@/lib/db";
import { getActivePairId, getPairById } from "./agent-pair-store";
import { readRecentAudit, getAuditStats } from "./security/immutable-audit";
import { getActivePermissions, sweepExpiredPermissions } from "./security/permission-expiry";
import { getSpecsForPair, checkSpecExpiry } from "./task-spec-store";
import { getSecurityMiddleware } from "./security/security-middleware";

export interface DigestSection {
  title: string;
  icon: string;          // emoji for quick scan
  items: DigestItem[];
  severity: "info" | "notice" | "warning" | "critical";
}

export interface DigestItem {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  detail?: string;
}

export interface DailyDigest {
  id: string;
  pairId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  sections: DigestSection[];
  summary: string;
  healthScore: number;        // 0–100 overall system health
  actionItems: string[];      // Things that need attention
}

async function readDigests(): Promise<DailyDigest[]> {
  try {
    const data = await kv.get<DailyDigest[]>("daily-digests");
    return data ?? [];
  } catch {
    return [];
  }
}

async function writeDigests(digests: DailyDigest[]): Promise<void> {
  await kv.set("daily-digests", digests);
}

// ─── Digest Generation ───────────────────────────────────

/**
 * Generate a morning briefing digest for the active pair.
 */
export async function generateDailyDigest(pairId?: string): Promise<DailyDigest> {
  const activePairId = pairId ?? await getActivePairId();
  const pair = await getPairById(activePairId);
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Sweep expired permissions/specs as part of digest generation
  const expiredPerms = await sweepExpiredPermissions();
  const expiredSpecs = await checkSpecExpiry();

  const sections: DigestSection[] = [];
  const actionItems: string[] = [];
  let healthScore = 100;

  // ── Section 1: Decision Activity ──
  const decideSection = await buildDecisionSection(activePairId, periodStart);
  sections.push(decideSection);

  // ── Section 2: Security Overview ──
  const securitySection = await buildSecuritySection(periodStart);
  sections.push(securitySection);
  if (securitySection.severity === "warning" || securitySection.severity === "critical") {
    healthScore -= 20;
    actionItems.push("Review security events — anomalies or blocked operations detected");
  }

  // ── Section 3: Audit Integrity ──
  const auditSection = await buildAuditIntegritySection();
  sections.push(auditSection);
  if (auditSection.severity === "critical") {
    healthScore -= 30;
    actionItems.push("CRITICAL: Audit chain integrity issue detected — review immediately");
  }

  // ── Section 4: Active Permissions ──
  const permSection = await buildPermissionSection(activePairId, expiredPerms);
  sections.push(permSection);

  // ── Section 5: Task Specs ──
  const specSection = await buildSpecSection(activePairId, expiredSpecs);
  sections.push(specSection);

  // ── Section 6: Worker Activity ──
  const workerSection = await buildWorkerSection(periodStart);
  sections.push(workerSection);

  // Build summary (coerce to number for comparisons; DigestItem.value is string | number)
  const totalDecisions = Number(decideSection.items.find((i) => i.label === "Total decisions")?.value ?? 0);
  const blockedOps = Number(securitySection.items.find((i) => i.label === "Blocked")?.value ?? 0);
  const activePerms = Number(permSection.items.find((i) => i.label === "Active permissions")?.value ?? 0);
  const expiredPermsNum = Number(expiredPerms);

  healthScore = Math.max(0, Math.min(100, healthScore));

  const summary = [
    `${totalDecisions} decision${totalDecisions !== 1 ? "s" : ""} in the last 24h`,
    blockedOps > 0 ? `${blockedOps} operation${blockedOps !== 1 ? "s" : ""} blocked` : null,
    `${activePerms} active timed permission${activePerms !== 1 ? "s" : ""}`,
    expiredPermsNum > 0 ? `${expiredPermsNum} permission${expiredPermsNum !== 1 ? "s" : ""} expired` : null,
    pair ? `Agent pair: ${pair.name ?? activePairId}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const digest: DailyDigest = {
    id: `digest-${Date.now()}`,
    pairId: activePairId,
    generatedAt: now.toISOString(),
    periodStart,
    periodEnd,
    sections,
    summary,
    healthScore,
    actionItems,
  };

  // Persist
  const digests = await readDigests();
  digests.push(digest);
  // Keep last 30 digests
  if (digests.length > 30) {
    digests.splice(0, digests.length - 30);
  }
  await writeDigests(digests);

  return digest;
}

/**
 * Get the most recent digest.
 */
export async function getLatestDigest(pairId: string): Promise<DailyDigest | null> {
  const digests = await readDigests();
  const forPair = digests.filter((d) => d.pairId === pairId);
  return forPair.length > 0 ? forPair[forPair.length - 1] : null;
}

/**
 * Get digest history.
 */
export async function getDigestHistory(pairId: string, limit: number = 7): Promise<DailyDigest[]> {
  const digests = await readDigests();
  return digests
    .filter((d) => d.pairId === pairId)
    .slice(-limit)
    .reverse();
}

// ─── Section Builders ────────────────────────────────────

async function buildDecisionSection(pairId: string, since: string): Promise<DigestSection> {
  // Read activity feed for decisions
  let totalDecisions = 0;
  let approved = 0;
  let ignored = 0;
  try {
    const entries = await kv.get<Array<{ pairId: string; timestamp: string; outcome?: string }>>("activity-feed") ?? [];
    const recent = entries.filter((e) => e.pairId === pairId && e.timestamp > since);
    totalDecisions = recent.length;
    approved = recent.filter((e) => e.outcome === "kept").length;
    ignored = recent.filter((e) => e.outcome === "reverted").length;
  } catch {
    // no data
  }

  return {
    title: "Decision Activity",
    icon: "inbox",
    severity: "info",
    items: [
      { label: "Total decisions", value: totalDecisions },
      { label: "Approved", value: approved },
      { label: "Ignored", value: ignored },
      {
        label: "Approval rate",
        value: totalDecisions > 0 ? `${Math.round((approved / totalDecisions) * 100)}%` : "N/A",
      },
    ],
  };
}

async function buildSecuritySection(since: string): Promise<DigestSection> {
  const stats = getSecurityMiddleware().getStats();
  const auditStats = await getAuditStats();

  const severity: DigestSection["severity"] =
    auditStats.last24h.blocked > 5 ? "critical" : auditStats.last24h.blocked > 0 ? "warning" : "info";

  return {
    title: "Security Overview",
    icon: "shield",
    severity,
    items: [
      { label: "Total operations", value: stats.totalOperations },
      { label: "Allowed", value: auditStats.last24h.allowed },
      { label: "Blocked", value: auditStats.last24h.blocked },
      { label: "Approved", value: auditStats.last24h.approved },
      { label: "Denied", value: auditStats.last24h.denied },
      { label: "Anomalies", value: stats.anomalies },
      { label: "Agent paused", value: stats.isPaused ? "Yes" : "No" },
    ],
  };
}

async function buildAuditIntegritySection(): Promise<DigestSection> {
  const auditStats = await getAuditStats();

  const severity: DigestSection["severity"] = auditStats.chainValid ? "info" : "critical";

  return {
    title: "Audit Integrity",
    icon: "lock",
    severity,
    items: [
      { label: "Chain valid", value: auditStats.chainValid ? "Yes" : "NO — TAMPERED" },
      { label: "Total entries", value: auditStats.totalEntries },
    ],
  };
}

async function buildPermissionSection(pairId: string, expiredCount: number): Promise<DigestSection> {
  const active = await getActivePermissions(pairId);

  const severity: DigestSection["severity"] = active.length > 10 ? "warning" : "info";

  return {
    title: "Timed Permissions",
    icon: "key",
    severity,
    items: [
      { label: "Active permissions", value: active.length },
      { label: "Expired (swept)", value: expiredCount },
      ...active.slice(0, 5).map((p) => ({
        label: p.operation,
        value: `expires ${new Date(p.expiresAt).toLocaleTimeString()}`,
        detail: p.reason,
      })),
    ],
  };
}

async function buildSpecSection(pairId: string, expiredSpecs: string[]): Promise<DigestSection> {
  const specs = await getSpecsForPair(pairId);
  const active = specs.filter((s) => s.status === "active");
  const completed = specs.filter((s) => s.status === "completed");

  return {
    title: "Task Specs",
    icon: "clipboard",
    severity: "info",
    items: [
      { label: "Active specs", value: active.length },
      { label: "Completed", value: completed.length },
      { label: "Expired this cycle", value: expiredSpecs.length },
      ...active.slice(0, 3).map((s) => ({
        label: s.objective,
        value: s.timeLimit?.expiresAt
          ? `expires ${new Date(s.timeLimit.expiresAt).toLocaleTimeString()}`
          : "no time limit",
      })),
    ],
  };
}

async function buildWorkerSection(since: string): Promise<DigestSection> {
  let itemsIngested = 0;
  try {
    const items = await kv.get<Array<{ discoveredAt?: string }>>("worker-decide-queue") ?? [];
    itemsIngested = items.filter((i) => i.discoveredAt && i.discoveredAt > since).length;
  } catch {
    // no data
  }

  return {
    title: "Worker Fleet",
    icon: "cpu",
    severity: "info",
    items: [
      { label: "Items ingested (24h)", value: itemsIngested },
    ],
  };
}
