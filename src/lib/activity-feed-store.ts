/**
 * Activity feed store — The Nightly Build.
 * Persists to .data/activity-feed.json (gitignored).
 * Append-only; seeded from decide execute + moltbook activity.
 */

import { kv } from "@/lib/db";
import type { ActivityFeedItem } from "@/types/agent-pair";

const MAX_ITEMS = 1000;

type FeedFile = {
  items: ActivityFeedItem[];
};

async function readFeed(): Promise<FeedFile> {
  try {
    const data = await kv.get<FeedFile>("activity-feed");
    return { items: Array.isArray(data?.items) ? data.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeFeed(data: FeedFile): Promise<void> {
  await kv.set("activity-feed", data);
}

export async function appendActivity(item: ActivityFeedItem): Promise<void> {
  const feed = await readFeed();
  feed.items.unshift(item);
  feed.items = feed.items.slice(0, MAX_ITEMS);
  await writeFeed(feed);
}

export async function getActivityFeed(opts?: {
  pairId?: string;
  limit?: number;
  since?: string;
}): Promise<ActivityFeedItem[]> {
  const feed = await readFeed();
  let items = feed.items;
  if (opts?.pairId) {
    items = items.filter((i) => i.pairId === opts.pairId);
  }
  if (opts?.since) {
    items = items.filter((i) => i.timestamp >= opts.since!);
  }
  const limit = opts?.limit ?? 100;
  return items.slice(0, limit);
}
