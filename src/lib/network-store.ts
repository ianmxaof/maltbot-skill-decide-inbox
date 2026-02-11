// src/lib/network-store.ts
// File-based JSON persistence for the network-effects layer.
// Same pattern as social-store.ts — separate files, no collision.

import { promises as fs } from "fs";
import path from "path";
import type {
  EmergentGroup,
  GroupMembership,
  SignalConvergence,
  NetworkPulse,
  DecisionPool,
  DecisionVote,
  DecisionOutcome,
} from "@/types/network";

const DATA_DIR = path.join(process.cwd(), ".data");

// ─── Helpers ────────────────────────────────────────────────

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    path.join(DATA_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

// ─── Emergent Groups ────────────────────────────────────────

const GROUPS_FILE = "network-groups.json";
const MEMBERSHIPS_FILE = "network-memberships.json";

export async function getGroups(): Promise<EmergentGroup[]> {
  return readJson<EmergentGroup[]>(GROUPS_FILE, []);
}

export async function getGroupBySlug(slug: string): Promise<EmergentGroup | null> {
  const groups = await getGroups();
  return groups.find((g) => g.slug === slug) ?? null;
}

export async function getGroupById(id: string): Promise<EmergentGroup | null> {
  const groups = await getGroups();
  return groups.find((g) => g.id === id) ?? null;
}

export async function setGroups(groups: EmergentGroup[]): Promise<void> {
  await writeJson(GROUPS_FILE, groups);
}

export async function upsertGroup(group: EmergentGroup): Promise<void> {
  const groups = await getGroups();
  const idx = groups.findIndex((g) => g.id === group.id);
  if (idx >= 0) {
    groups[idx] = group;
  } else {
    groups.push(group);
  }
  await writeJson(GROUPS_FILE, groups);
}

export async function getGroupsForPair(pairId: string): Promise<EmergentGroup[]> {
  const groups = await getGroups();
  return groups.filter((g) => g.memberPairIds.includes(pairId));
}

// ─── Memberships ────────────────────────────────────────────

export async function getMemberships(): Promise<GroupMembership[]> {
  return readJson<GroupMembership[]>(MEMBERSHIPS_FILE, []);
}

export async function getMembershipsForGroup(groupId: string): Promise<GroupMembership[]> {
  const all = await getMemberships();
  return all.filter((m) => m.groupId === groupId);
}

export async function getMembershipsForPair(pairId: string): Promise<GroupMembership[]> {
  const all = await getMemberships();
  return all.filter((m) => m.pairId === pairId);
}

export async function addMembership(membership: GroupMembership): Promise<void> {
  const all = await getMemberships();
  const existing = all.find(
    (m) => m.groupId === membership.groupId && m.pairId === membership.pairId
  );
  if (existing) return;
  all.push(membership);
  await writeJson(MEMBERSHIPS_FILE, all);
}

export async function removeMembership(groupId: string, pairId: string): Promise<boolean> {
  const all = await getMemberships();
  const filtered = all.filter(
    (m) => !(m.groupId === groupId && m.pairId === pairId)
  );
  if (filtered.length === all.length) return false;
  await writeJson(MEMBERSHIPS_FILE, filtered);
  return true;
}

export async function setMemberships(memberships: GroupMembership[]): Promise<void> {
  await writeJson(MEMBERSHIPS_FILE, memberships);
}

// ─── Signal Convergences ────────────────────────────────────

const CONVERGENCES_FILE = "network-convergences.json";

export async function getConvergences(): Promise<SignalConvergence[]> {
  return readJson<SignalConvergence[]>(CONVERGENCES_FILE, []);
}

export async function setConvergences(convergences: SignalConvergence[]): Promise<void> {
  // Keep last 200 to prevent unbounded growth
  const trimmed = convergences.slice(-200);
  await writeJson(CONVERGENCES_FILE, trimmed);
}

export async function getConvergencesForViewer(
  viewerPairId: string,
  options?: { limit?: number }
): Promise<SignalConvergence[]> {
  const all = await getConvergences();
  // Sort by relevance to viewer, then by recency
  const sorted = all
    .map((c) => ({
      ...c,
      relevanceToViewer: c.convergingPairIds.includes(viewerPairId) ? 1 : c.relevanceToViewer,
    }))
    .sort((a, b) => b.relevanceToViewer - a.relevanceToViewer || b.lastOccurrence.localeCompare(a.lastOccurrence));
  return sorted.slice(0, options?.limit ?? 50);
}

// ─── Network Pulse ──────────────────────────────────────────

const PULSE_FILE = "network-pulse.json";
const PULSE_HISTORY_FILE = "network-pulse-history.json";

export async function getPulse(): Promise<NetworkPulse | null> {
  return readJson<NetworkPulse | null>(PULSE_FILE, null);
}

export async function setPulse(pulse: NetworkPulse): Promise<void> {
  await writeJson(PULSE_FILE, pulse);

  // Also append to history (keep 7 days, hourly = ~168 entries)
  const history = await readJson<NetworkPulse[]>(PULSE_HISTORY_FILE, []);
  history.push(pulse);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const trimmed = history.filter((p) => p.computedAt > sevenDaysAgo);
  await writeJson(PULSE_HISTORY_FILE, trimmed);
}

export async function getPulseHistory(since?: string): Promise<NetworkPulse[]> {
  const history = await readJson<NetworkPulse[]>(PULSE_HISTORY_FILE, []);
  if (since) return history.filter((p) => p.computedAt > since);
  return history;
}

// ─── Decision Pools ─────────────────────────────────────────

const POOLS_FILE = "network-decision-pools.json";

export async function getDecisionPools(): Promise<DecisionPool[]> {
  return readJson<DecisionPool[]>(POOLS_FILE, []);
}

export async function getPoolsForGroup(groupId: string): Promise<DecisionPool[]> {
  const all = await getDecisionPools();
  return all.filter((p) => p.groupId === groupId);
}

export async function getPoolById(id: string): Promise<DecisionPool | null> {
  const all = await getDecisionPools();
  return all.find((p) => p.id === id) ?? null;
}

export async function createPool(pool: DecisionPool): Promise<void> {
  const all = await getDecisionPools();
  all.push(pool);
  await writeJson(POOLS_FILE, all);
}

export async function addVote(poolId: string, vote: DecisionVote): Promise<DecisionPool | null> {
  const all = await getDecisionPools();
  const pool = all.find((p) => p.id === poolId);
  if (!pool || pool.status !== "open") return null;

  // Prevent double-voting
  const existing = pool.votes.find((v) => v.pairId === vote.pairId);
  if (existing) return null;

  pool.votes.push(vote);

  // Check if quorum + consensus reached
  if (pool.votes.length >= pool.quorum) {
    const tallies = new Map<number, number>();
    for (const v of pool.votes) {
      tallies.set(v.choiceIndex, (tallies.get(v.choiceIndex) ?? 0) + 1);
    }

    let maxIdx = 0;
    let maxCount = 0;
    for (const [idx, count] of tallies) {
      if (count > maxCount) {
        maxIdx = idx;
        maxCount = count;
      }
    }

    const percentage = maxCount / pool.votes.length;
    if (percentage >= pool.consensusThreshold) {
      pool.status = "resolved";
      pool.closedAt = new Date().toISOString();
      pool.outcome = {
        winningChoiceIndex: maxIdx,
        winningChoice: pool.item.options[maxIdx] ?? "Unknown",
        voteCount: pool.votes.length,
        consensusReached: true,
        resolvedAt: new Date().toISOString(),
      };
    }
  }

  await writeJson(POOLS_FILE, all);
  return pool;
}

export async function closePool(poolId: string): Promise<DecisionPool | null> {
  const all = await getDecisionPools();
  const pool = all.find((p) => p.id === poolId);
  if (!pool || pool.status !== "open") return null;

  pool.status = "closed";
  pool.closedAt = new Date().toISOString();

  // Determine outcome even if consensus wasn't reached
  if (pool.votes.length > 0 && !pool.outcome) {
    const tallies = new Map<number, number>();
    for (const v of pool.votes) {
      tallies.set(v.choiceIndex, (tallies.get(v.choiceIndex) ?? 0) + 1);
    }
    let maxIdx = 0;
    let maxCount = 0;
    for (const [idx, count] of tallies) {
      if (count > maxCount) {
        maxIdx = idx;
        maxCount = count;
      }
    }
    pool.outcome = {
      winningChoiceIndex: maxIdx,
      winningChoice: pool.item.options[maxIdx] ?? "Unknown",
      voteCount: pool.votes.length,
      consensusReached: false,
      resolvedAt: new Date().toISOString(),
    };
  }

  await writeJson(POOLS_FILE, all);
  return pool;
}
