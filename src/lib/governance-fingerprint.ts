/**
 * Governance fingerprint: per-operator, time-windowed summary of "how you govern."
 * Used for personal analytics now and alignment matching later.
 */

import { kv } from "@/lib/db";
import { getActivityStore } from "@/lib/persistence";
import { getOperationOverrides } from "@/lib/security/operation-overrides";
import { getTrustScores } from "@/lib/security/trust-scoring";
import { readSignalsConfig } from "@/lib/signals-config";

export interface GovernanceFingerprint {
  operatorId: string;
  windowStart: string; // ISO
  windowEnd: string; // ISO
  hoursBack: number;
  approvedCount: number;
  blockedCount: number;
  approvedByCategory: Record<string, number>; // e.g. write:moltbook_post -> count
  blockedByCategory: Record<string, number>;
  topBlockedOperations: Array<{ operation: string; target?: string; count: number }>;
  topAllowedOperations: Array<{ operation: string; target?: string; count: number }>;
  preferredMode?: string;
  overridesSummary: { allow: number; block: number; ask: number };
  signalSourcesCount: number;
}

async function loadAutopilotMode(): Promise<string | undefined> {
  try {
    const data = await kv.get<{ mode?: string }>("autopilot");
    if (!data) return undefined;
    return typeof data.mode === "string" ? data.mode : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Compute governance fingerprint for an operator over a time window.
 * Reads from activity store, overrides, trust scores, autopilot state, signals config.
 */
export async function computeFingerprint(
  operatorId: string,
  hoursBack: number
): Promise<GovernanceFingerprint> {
  const until = new Date();
  const since = new Date(until.getTime() - hoursBack * 60 * 60 * 1000);

  const store = getActivityStore();
  const entries = await store.query({
    since,
    until,
    operatorId,
    limit: 10000,
  });

  let approvedCount = 0;
  let blockedCount = 0;
  const approvedByOp = new Map<string, number>();
  const blockedByOp = new Map<string, number>();
  const blockedByTarget = new Map<string, number>();
  const allowedByTarget = new Map<string, number>();

  for (const e of entries) {
    if (e.type === "operation_approved") {
      approvedCount++;
      const key = e.operation;
      approvedByOp.set(key, (approvedByOp.get(key) ?? 0) + 1);
      const targetKey = `${e.operation}\t${e.target ?? ""}`;
      allowedByTarget.set(targetKey, (allowedByTarget.get(targetKey) ?? 0) + 1);
    } else if (e.type === "operation_blocked") {
      blockedCount++;
      const key = e.operation;
      blockedByOp.set(key, (blockedByOp.get(key) ?? 0) + 1);
      const targetKey = `${e.operation}\t${e.target ?? ""}`;
      blockedByTarget.set(targetKey, (blockedByTarget.get(targetKey) ?? 0) + 1);
    }
  }

  const approvedByCategory: Record<string, number> = {};
  approvedByOp.forEach((count, op) => {
    approvedByCategory[op] = count;
  });
  const blockedByCategory: Record<string, number> = {};
  blockedByOp.forEach((count, op) => {
    blockedByCategory[op] = count;
  });

  const topBlockedOperations = Array.from(blockedByTarget.entries())
    .map(([key, count]) => {
      const [operation, target] = key.split("\t");
      return { operation, target: target || undefined, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topAllowedOperations = Array.from(allowedByTarget.entries())
    .map(([key, count]) => {
      const [operation, target] = key.split("\t");
      return { operation, target: target || undefined, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const overrides = await getOperationOverrides();
  const overridesSummary = { allow: 0, block: 0, ask: 0 };
  for (const o of overrides) {
    if (o.operatorId && o.operatorId !== operatorId) continue;
    if (o.action === "allow") overridesSummary.allow++;
    else if (o.action === "block") overridesSummary.block++;
    else if (o.action === "ask") overridesSummary.ask++;
  }

  const preferredMode = await loadAutopilotMode();
  const signalsConfig = await readSignalsConfig();
  const signalSourcesCount =
    (signalsConfig.rssUrls?.length ?? 0) +
    (signalsConfig.githubUsers?.length ?? 0) +
    (signalsConfig.githubRepos?.length ?? 0);

  const fingerprint: GovernanceFingerprint = {
    operatorId,
    windowStart: since.toISOString(),
    windowEnd: until.toISOString(),
    hoursBack,
    approvedCount,
    blockedCount,
    approvedByCategory,
    blockedByCategory,
    topBlockedOperations,
    topAllowedOperations,
    preferredMode,
    overridesSummary,
    signalSourcesCount,
  };

  await saveFingerprint(fingerprint);
  return fingerprint;
}

async function saveFingerprint(fingerprint: GovernanceFingerprint): Promise<void> {
  let data: { fingerprints?: GovernanceFingerprint[] } = {};
  try {
    const existing = await kv.get<{ fingerprints?: GovernanceFingerprint[] }>("governance-fingerprints");
    if (existing) data = existing;
  } catch {
    data = {};
  }
  const list = Array.isArray(data.fingerprints) ? data.fingerprints : [];
  const without = list.filter(
    (f) => !(f.operatorId === fingerprint.operatorId && f.hoursBack === fingerprint.hoursBack)
  );
  without.push(fingerprint);
  await kv.set("governance-fingerprints", { version: 1, fingerprints: without });
}

/**
 * Get cached fingerprint for operator and window, or compute and cache.
 */
export async function getFingerprint(
  operatorId: string,
  hoursBack: number
): Promise<GovernanceFingerprint> {
  return computeFingerprint(operatorId, hoursBack);
}
