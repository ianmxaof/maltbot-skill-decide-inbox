// src/lib/social-store.ts
// File-based JSON persistence for social layer data
// Follows the same pattern as existing stores in the codebase

import { kv } from "@/lib/db";
import {
  VisibilitySettings,
  DEFAULT_VISIBILITY,
  SpaceTheme,
  DEFAULT_THEME,
  Follow,
  NetworkActivity,
  AlignmentScore,
  GovernanceFingerprint,
} from '@/types/social';

// ─── Helpers ────────────────────────────────────────────────

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const key = filename.replace(/\.json$/, "");
  return await kv.get<T>(key) ?? fallback;
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const key = filename.replace(/\.json$/, "");
  await kv.set(key, data);
}

// ─── Visibility Settings ────────────────────────────────────

const VISIBILITY_FILE = 'social-visibility.json';

type VisibilityStore = Record<string, VisibilitySettings>;

export async function getVisibilitySettings(pairId: string): Promise<VisibilitySettings> {
  const store = await readJson<VisibilityStore>(VISIBILITY_FILE, {});
  return store[pairId] ?? {
    pairId,
    ...DEFAULT_VISIBILITY,
    updatedAt: new Date().toISOString(),
  };
}

export async function setVisibilitySettings(
  pairId: string,
  updates: Partial<Omit<VisibilitySettings, 'pairId' | 'updatedAt'>>
): Promise<VisibilitySettings> {
  const store = await readJson<VisibilityStore>(VISIBILITY_FILE, {});
  const current = store[pairId] ?? { pairId, ...DEFAULT_VISIBILITY, updatedAt: '' };
  const updated: VisibilitySettings = {
    ...current,
    ...updates,
    pairId,
    updatedAt: new Date().toISOString(),
  };
  store[pairId] = updated;
  await writeJson(VISIBILITY_FILE, store);
  return updated;
}

// ─── Space Themes ───────────────────────────────────────────

const THEMES_FILE = 'social-themes.json';

type ThemeStore = Record<string, SpaceTheme>;

export async function getSpaceTheme(pairId: string): Promise<SpaceTheme> {
  const store = await readJson<ThemeStore>(THEMES_FILE, {});
  return store[pairId] ?? {
    pairId,
    ...DEFAULT_THEME,
    updatedAt: new Date().toISOString(),
  };
}

export async function setSpaceTheme(
  pairId: string,
  updates: Partial<Omit<SpaceTheme, 'pairId' | 'updatedAt'>>
): Promise<SpaceTheme> {
  const store = await readJson<ThemeStore>(THEMES_FILE, {});
  const current = store[pairId] ?? { pairId, ...DEFAULT_THEME, updatedAt: '' };
  const updated: SpaceTheme = {
    ...current,
    ...updates,
    pairId,
    updatedAt: new Date().toISOString(),
  };
  store[pairId] = updated;
  await writeJson(THEMES_FILE, store);
  return updated;
}

// ─── Follows ────────────────────────────────────────────────

const FOLLOWS_FILE = 'social-follows.json';

export async function getFollows(): Promise<Follow[]> {
  return readJson<Follow[]>(FOLLOWS_FILE, []);
}

export async function addFollow(followerId: string, followingId: string): Promise<Follow> {
  const follows = await getFollows();

  // Prevent duplicate follows
  const existing = follows.find(
    f => f.followerId === followerId && f.followingId === followingId
  );
  if (existing) return existing;

  const follow: Follow = {
    id: `follow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    followerId,
    followingId,
    createdAt: new Date().toISOString(),
  };
  follows.push(follow);
  await writeJson(FOLLOWS_FILE, follows);
  return follow;
}

export async function removeFollow(followerId: string, followingId: string): Promise<boolean> {
  const follows = await getFollows();
  const filtered = follows.filter(
    f => !(f.followerId === followerId && f.followingId === followingId)
  );
  if (filtered.length === follows.length) return false;
  await writeJson(FOLLOWS_FILE, filtered);
  return true;
}

export async function getFollowersOf(pairId: string): Promise<Follow[]> {
  const follows = await getFollows();
  return follows.filter(f => f.followingId === pairId);
}

export async function getFollowingBy(pairId: string): Promise<Follow[]> {
  const follows = await getFollows();
  return follows.filter(f => f.followerId === pairId);
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const follows = await getFollows();
  return follows.some(f => f.followerId === followerId && f.followingId === followingId);
}

// ─── Network Activity Feed ──────────────────────────────────

const ACTIVITY_FILE = 'social-activity.json';

export async function getNetworkActivity(options?: {
  pairId?: string;
  limit?: number;
  before?: string;
  types?: string[];
}): Promise<NetworkActivity[]> {
  let activities = await readJson<NetworkActivity[]>(ACTIVITY_FILE, []);

  if (options?.pairId) {
    activities = activities.filter(a => a.pairId === options.pairId);
  }
  if (options?.types?.length) {
    activities = activities.filter(a => options.types!.includes(a.type));
  }
  if (options?.before) {
    activities = activities.filter(a => a.createdAt < options.before!);
  }

  // Sort newest first
  activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (options?.limit) {
    activities = activities.slice(0, options.limit);
  }

  return activities;
}

export async function createNetworkActivity(
  activity: Omit<NetworkActivity, 'id' | 'createdAt'>
): Promise<NetworkActivity> {
  const activities = await readJson<NetworkActivity[]>(ACTIVITY_FILE, []);
  const entry: NetworkActivity = {
    ...activity,
    id: `na_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  activities.push(entry);

  // Keep last 1000 activities to prevent unbounded growth
  const trimmed = activities.slice(-1000);
  await writeJson(ACTIVITY_FILE, trimmed);
  return entry;
}

/**
 * Get the social feed for a user: activity from pairs they follow,
 * filtered by visibility settings.
 */
export async function getSocialFeed(
  viewerPairId: string,
  options?: { limit?: number; before?: string }
): Promise<NetworkActivity[]> {
  const following = await getFollowingBy(viewerPairId);
  const followingIds = new Set(following.map(f => f.followingId));

  let activities = await readJson<NetworkActivity[]>(ACTIVITY_FILE, []);

  // Filter to only activities from followed pairs
  activities = activities.filter(a => followingIds.has(a.pairId));

  // Filter by visibility: 'public' activities visible to all,
  // 'network' only to followers (which we already are if we're here)
  // Private activities never make it into this store

  if (options?.before) {
    activities = activities.filter(a => a.createdAt < options.before!);
  }

  activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return activities.slice(0, options?.limit ?? 50);
}

// ─── Alignment Scores ───────────────────────────────────────

const ALIGNMENT_FILE = 'social-alignment.json';

export async function getAlignmentScores(pairId: string): Promise<AlignmentScore[]> {
  const scores = await readJson<AlignmentScore[]>(ALIGNMENT_FILE, []);
  return scores
    .filter(s => s.pairAId === pairId || s.pairBId === pairId)
    .sort((a, b) => b.score - a.score);
}

export async function setAlignmentScores(scores: AlignmentScore[]): Promise<void> {
  await writeJson(ALIGNMENT_FILE, scores);
}

export async function getAlignmentBetween(
  pairAId: string,
  pairBId: string
): Promise<AlignmentScore | null> {
  const scores = await readJson<AlignmentScore[]>(ALIGNMENT_FILE, []);
  return scores.find(
    s =>
      (s.pairAId === pairAId && s.pairBId === pairBId) ||
      (s.pairAId === pairBId && s.pairBId === pairAId)
  ) ?? null;
}

// ─── Governance Fingerprints ────────────────────────────────

const FINGERPRINT_FILE = 'social-fingerprints.json';

type FingerprintStore = Record<string, GovernanceFingerprint>;

export async function getGovernanceFingerprint(
  pairId: string
): Promise<GovernanceFingerprint | null> {
  const store = await readJson<FingerprintStore>(FINGERPRINT_FILE, {});
  return store[pairId] ?? null;
}

export async function setGovernanceFingerprint(
  fingerprint: GovernanceFingerprint
): Promise<void> {
  const store = await readJson<FingerprintStore>(FINGERPRINT_FILE, {});
  store[fingerprint.pairId] = fingerprint;
  await writeJson(FINGERPRINT_FILE, store);
}

export async function getAllPublicFingerprints(): Promise<GovernanceFingerprint[]> {
  const fingerprints = await readJson<FingerprintStore>(FINGERPRINT_FILE, {});
  const visibilityStore = await readJson<Record<string, VisibilitySettings>>(VISIBILITY_FILE, {});

  return Object.values(fingerprints).filter(fp => {
    const vis = visibilityStore[fp.pairId];
    return vis?.governanceFingerprint === 'public';
  });
}

// ─── Social Feed Projection ─────────────────────────────────
// Call this from existing handlers when events occur

export async function projectDecisionToFeed(
  pairId: string,
  action: 'approve' | 'ignore' | 'escalate',
  itemSummary: string,
  sourceEventId: string
): Promise<void> {
  const visibility = await getVisibilitySettings(pairId);
  if (visibility.decisionPatterns === 'private') return;

  const verb = action === 'approve' ? 'approved' : action === 'ignore' ? 'passed on' : 'escalated';
  await createNetworkActivity({
    pairId,
    type: 'decision',
    summary: `${verb}: ${itemSummary}`,
    visibility: visibility.decisionPatterns as 'public' | 'network',
    sourceEventId,
  });
}

export async function projectContextChangeToFeed(
  pairId: string,
  changeType: 'added' | 'removed',
  sourceName: string,
  sourceType: string
): Promise<void> {
  const visibility = await getVisibilitySettings(pairId);
  if (visibility.contextSources === 'private') return;

  await createNetworkActivity({
    pairId,
    type: 'context_change',
    summary: `${changeType === 'added' ? 'Now tracking' : 'Stopped tracking'} ${sourceName} (${sourceType})`,
    visibility: visibility.contextSources as 'public' | 'network',
  });
}

export async function projectAgentActionToFeed(
  pairId: string,
  actionSummary: string,
  sourceEventId: string
): Promise<void> {
  const visibility = await getVisibilitySettings(pairId);
  if (visibility.activityFeed === 'private') return;

  await createNetworkActivity({
    pairId,
    type: 'agent_action',
    summary: actionSummary,
    visibility: visibility.activityFeed as 'public' | 'network',
    sourceEventId,
  });
}
