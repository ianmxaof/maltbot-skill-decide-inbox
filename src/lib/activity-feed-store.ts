/**
 * Activity feed store — The Nightly Build.
 * Persists to .data/activity-feed.json (gitignored).
 * Append-only; seeded from decide execute + moltbook activity.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { ActivityFeedItem } from "@/types/agent-pair";

const FEED_PATH = path.join(process.cwd(), ".data", "activity-feed.json");
const MAX_ITEMS = 1000;

type FeedFile = {
  items: ActivityFeedItem[];
};

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(FEED_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readFeed(): Promise<FeedFile> {
  try {
    if (!existsSync(FEED_PATH)) return { items: [] };
    const raw = await readFile(FEED_PATH, "utf-8");
    const data = JSON.parse(raw) as FeedFile;
    return { items: Array.isArray(data?.items) ? data.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeFeed(data: FeedFile): Promise<void> {
  await ensureDataDir();
  await writeFile(FEED_PATH, JSON.stringify(data, null, 2), "utf-8");
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
