/**
 * Pair-aware heartbeat runner — The Nightly Build.
 * Called by /api/moltbook/heartbeat in addition to Moltbook autopilot.
 * For MVP: records activity; full signal fetch + propose → decide later.
 */

import { getPairById } from "@/lib/agent-pair-store";
import { getActivePairId } from "@/lib/agent-pair-store";
import { appendActivity } from "@/lib/activity-feed-store";

function countSources(pair: { contextSources?: { githubRepos?: string[]; githubUsers?: string[]; rssUrls?: string[]; moltbookTopics?: string[] } }): number {
  const ctx = pair.contextSources;
  if (!ctx) return 0;
  return (
    (ctx.githubRepos?.length ?? 0) +
    (ctx.githubUsers?.length ?? 0) +
    (ctx.rssUrls?.length ?? 0) +
    (ctx.moltbookTopics?.length ?? 0)
  );
}

export async function runHeartbeat(pairId: string): Promise<void> {
  const pair = await getPairById(pairId);
  if (!pair) return;

  const count = countSources(pair);

  await appendActivity({
    id: `act-${Date.now()}`,
    pairId,
    timestamp: new Date().toISOString(),
    action: `Heartbeat: ${count} source${count !== 1 ? "s" : ""} scanned`,
    reasoning: "Scheduled heartbeat",
    tags: ["heartbeat", "automated"],
  }).catch(() => {});
}
