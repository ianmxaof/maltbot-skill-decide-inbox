/**
 * Vibe Check Store — Profile reaction persistence
 *
 * Visitors can leave one reaction per profile per day.
 * Reactions are aggregated into counts for display.
 */

import { kv } from "@/lib/db";
import type { VibeCheck, VibeCheckSummary, VibeReaction } from "@/types/social";

const VIBE_FILE = "social-vibes.json";

const ALL_REACTIONS: VibeReaction[] = [
  "aligned", "interesting", "inspiring", "chaotic", "based", "galaxy-brain",
];

async function readVibes(): Promise<VibeCheck[]> {
  return (await kv.get<VibeCheck[]>(VIBE_FILE.replace(".json", ""))) ?? [];
}

async function writeVibes(vibes: VibeCheck[]): Promise<void> {
  await kv.set(VIBE_FILE.replace(".json", ""), vibes);
}

/**
 * Submit a vibe check reaction. One reaction per reactor per target per day.
 * If the reactor already reacted today, it updates the reaction.
 */
export async function submitVibeCheck(
  targetPairId: string,
  reactorPairId: string,
  reaction: VibeReaction
): Promise<VibeCheck> {
  const vibes = await readVibes();
  const today = new Date().toISOString().slice(0, 10);

  // Check for existing reaction today
  const existingIdx = vibes.findIndex(
    v =>
      v.targetPairId === targetPairId &&
      v.reactorPairId === reactorPairId &&
      v.createdAt.startsWith(today)
  );

  if (existingIdx >= 0) {
    // Update existing
    vibes[existingIdx].reaction = reaction;
    vibes[existingIdx].createdAt = new Date().toISOString();
    await writeVibes(vibes);
    return vibes[existingIdx];
  }

  // Create new
  const vibe: VibeCheck = {
    id: `vibe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    targetPairId,
    reactorPairId,
    reaction,
    createdAt: new Date().toISOString(),
  };

  vibes.push(vibe);

  // Keep last 5000 reactions total to prevent unbounded growth
  const trimmed = vibes.slice(-5000);
  await writeVibes(trimmed);
  return vibe;
}

/**
 * Get aggregated vibe check summary for a pair's profile.
 */
export async function getVibeCheckSummary(
  targetPairId: string,
  viewerPairId?: string
): Promise<VibeCheckSummary> {
  const vibes = await readVibes();
  const relevant = vibes.filter(v => v.targetPairId === targetPairId);

  const counts: Record<VibeReaction, number> = {
    aligned: 0,
    interesting: 0,
    inspiring: 0,
    chaotic: 0,
    based: 0,
    "galaxy-brain": 0,
  };

  for (const v of relevant) {
    if (counts[v.reaction] !== undefined) {
      counts[v.reaction]++;
    }
  }

  const total = relevant.length;

  // Find viewer's most recent reaction
  let viewerReaction: VibeReaction | undefined;
  if (viewerPairId) {
    const viewerVibes = relevant
      .filter(v => v.reactorPairId === viewerPairId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    viewerReaction = viewerVibes[0]?.reaction;
  }

  return { targetPairId, counts, total, viewerReaction };
}
