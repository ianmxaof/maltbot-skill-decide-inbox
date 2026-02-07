/**
 * Trust scoring with time decay and cold start.
 * Persisted to .data/trust-scores.json. Used in checkOperation to auto-approve
 * when weighted score >= threshold and no recent failure.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface TrustScoreEntry {
  operation: string;
  target?: string;
  agentId?: string;
  operatorId?: string; // attribution (social layer); single-tenant = one per deployment
  visibility?: "private" | "semi_public" | "network_emergent"; // default private
  successCount: number;
  failureCount: number;
  lastSuccessAt: number | null; // ms
  lastFailureAt: number | null;
  /** Computed with decay; not persisted, recalculated on load/query */
  weightedScore?: number;
}

const DEFAULT_PATH = path.join(process.cwd(), ".data", "trust-scores.json");
const HALF_LIFE_DAYS = 30; // decay: half weight after 30 days
const FAILURE_WEIGHT_MULTIPLIER = 3; // failures weigh 3x successes in score
const DEFAULT_AUTO_APPROVE_THRESHOLD = 5; // weighted score must be >= this to auto-approve
const RECENT_INCIDENT_HOURS = 24; // if failure within this window, don't auto-approve even if score high

let store: Map<string, TrustScoreEntry> = new Map();
let loaded = false;

function scoreKey(operation: string, target?: string, agentId?: string): string {
  const t = target ?? "";
  const a = agentId ?? "";
  return `${operation}\t${t}\t${a}`;
}

/** Exponential decay: value at t days ago = multiplier. 0 days = 1, half-life days = 0.5. */
function decay(daysAgo: number): number {
  if (daysAgo <= 0) return 1;
  return Math.pow(0.5, daysAgo / HALF_LIFE_DAYS);
}

export function computeWeightedScore(entry: TrustScoreEntry): number {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  let successWeight = 0;
  if (entry.successCount > 0 && entry.lastSuccessAt != null) {
    const daysSince = (now - entry.lastSuccessAt) / msPerDay;
    successWeight = entry.successCount * decay(daysSince);
  }
  let failureWeight = 0;
  if (entry.failureCount > 0 && entry.lastFailureAt != null) {
    const daysSince = (now - entry.lastFailureAt) / msPerDay;
    failureWeight = entry.failureCount * decay(daysSince) * FAILURE_WEIGHT_MULTIPLIER;
  }
  return successWeight - failureWeight;
}

async function ensureDir(): Promise<void> {
  const dir = path.dirname(DEFAULT_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadTrustScores(filePath: string = DEFAULT_PATH): Promise<Map<string, TrustScoreEntry>> {
  if (loaded && filePath === DEFAULT_PATH) {
    return new Map(store);
  }
  try {
    if (!existsSync(filePath)) {
      store = new Map();
      loaded = true;
      return new Map(store);
    }
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as { scores?: TrustScoreEntry[] };
    const list = Array.isArray(data?.scores) ? data.scores : [];
    store = new Map();
    for (const e of list) {
      if (e?.operation) {
        const key = scoreKey(e.operation, e.target, e.agentId);
        const entry: TrustScoreEntry = {
          operation: e.operation,
          target: e.target,
          agentId: e.agentId,
          operatorId: typeof e.operatorId === "string" ? e.operatorId : undefined,
          successCount: typeof e.successCount === "number" ? e.successCount : 0,
          failureCount: typeof e.failureCount === "number" ? e.failureCount : 0,
          lastSuccessAt: typeof e.lastSuccessAt === "number" ? e.lastSuccessAt : null,
          lastFailureAt: typeof e.lastFailureAt === "number" ? e.lastFailureAt : null,
        };
        entry.weightedScore = computeWeightedScore(entry);
        store.set(key, entry);
      }
    }
    loaded = true;
    return new Map(store);
  } catch {
    store = new Map();
    loaded = true;
    return new Map(store);
  }
}

export async function saveTrustScores(filePath: string = DEFAULT_PATH): Promise<void> {
  await ensureDir();
  const list = Array.from(store.values()).map((e) => ({
    operation: e.operation,
    target: e.target,
    agentId: e.agentId,
    operatorId: e.operatorId,
    successCount: e.successCount,
    failureCount: e.failureCount,
    lastSuccessAt: e.lastSuccessAt,
    lastFailureAt: e.lastFailureAt,
  }));
  await writeFile(filePath, JSON.stringify({ version: 1, scores: list }, null, 2), "utf-8");
}

export async function recordSuccess(
  operation: string,
  target?: string,
  agentId?: string,
  operatorId?: string
): Promise<void> {
  await loadTrustScores();
  const key = scoreKey(operation, target, agentId);
  const existing = store.get(key);
  const now = Date.now();
  const entry: TrustScoreEntry = existing
    ? {
        ...existing,
        successCount: existing.successCount + 1,
        lastSuccessAt: now,
        ...(operatorId !== undefined && { operatorId }),
      }
    : {
        operation,
        target,
        agentId,
        operatorId,
        successCount: 1,
        failureCount: 0,
        lastSuccessAt: now,
        lastFailureAt: null,
      };
  entry.weightedScore = computeWeightedScore(entry);
  store.set(key, entry);
  await saveTrustScores();
}

export async function recordFailure(
  operation: string,
  target?: string,
  agentId?: string,
  operatorId?: string
): Promise<void> {
  await loadTrustScores();
  const key = scoreKey(operation, target, agentId);
  const existing = store.get(key);
  const now = Date.now();
  const entry: TrustScoreEntry = existing
    ? {
        ...existing,
        failureCount: existing.failureCount + 1,
        lastFailureAt: now,
        ...(operatorId !== undefined && { operatorId }),
      }
    : {
        operation,
        target,
        agentId,
        operatorId,
        successCount: 0,
        failureCount: 1,
        lastSuccessAt: null,
        lastFailureAt: now,
      };
  entry.weightedScore = computeWeightedScore(entry);
  store.set(key, entry);
  await saveTrustScores();
}

/**
 * Whether to auto-approve this operation based on trust score.
 * Cold start: no history -> require approval (return false).
 * Uses DEFAULT_AUTO_APPROVE_THRESHOLD and RECENT_INCIDENT_HOURS.
 */
export async function shouldAutoApprove(
  operation: string,
  target?: string,
  agentId?: string,
  options?: { threshold?: number; recentIncidentHours?: number }
): Promise<boolean> {
  await loadTrustScores();
  const threshold = options?.threshold ?? DEFAULT_AUTO_APPROVE_THRESHOLD;
  const recentMs = (options?.recentIncidentHours ?? RECENT_INCIDENT_HOURS) * 60 * 60 * 1000;
  const now = Date.now();

  // Try exact key first, then operation+target, then operation only
  const keyExact = scoreKey(operation, target, agentId);
  const keyTarget = scoreKey(operation, target, undefined);
  const keyOp = scoreKey(operation, undefined, undefined);

  const entry =
    store.get(keyExact) ?? store.get(keyTarget) ?? store.get(keyOp);
  if (!entry) return false;

  const score = entry.weightedScore ?? computeWeightedScore(entry);
  if (score < threshold) return false;

  if (entry.lastFailureAt != null && now - entry.lastFailureAt < recentMs) {
    return false;
  }
  return true;
}

export async function getTrustScores(): Promise<TrustScoreEntry[]> {
  await loadTrustScores();
  return Array.from(store.values()).map((e) => ({
    ...e,
    weightedScore: e.weightedScore ?? computeWeightedScore(e),
  }));
}
