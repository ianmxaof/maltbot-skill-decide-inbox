// POST /api/workers/first-scan
// Runs when a user completes onboarding. Scans declared sources (RSS, GitHub)
// and populates the Decide Inbox with top-scored items.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { promises as fs } from "fs";
import path from "path";
import { getPairById } from "@/lib/agent-pair-store";
import { recordWorkerIngest } from "@/lib/disclosure-store";
import { validateWorkerAuth } from "@/lib/worker-auth";

const DATA_DIR = path.join(process.cwd(), ".data");
const DECIDE_QUEUE_FILE = "worker-decide-queue.json";

// ── Zod schema ─────────────────────────────────────────────
const FirstScanSchema = z.object({
  pairId: z.string().trim().min(1, "pairId is required"),
});

interface DecideQueueItem {
  id: string;
  ingestItemId: string;
  workerId: string;
  pairId: string;
  title: string;
  summary: string;
  detail?: string;
  sourceUrl?: string;
  sourceName: string;
  urgency: string;
  confidence: number;
  suggestedAction?: string;
  actionRationale?: string;
  signalKeys: string[];
  tags: string[];
  status: "pending";
  ingestedAt: string;
}

interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
}

interface RawReleaseItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readDecideQueue(): Promise<DecideQueueItem[]> {
  try {
    const raw = await fs.readFile(
      path.join(DATA_DIR, DECIDE_QUEUE_FILE),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDecideQueue(items: DecideQueueItem[]): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    path.join(DATA_DIR, DECIDE_QUEUE_FILE),
    JSON.stringify(items, null, 2),
    "utf-8"
  );
}

function stripTag(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function parseRssXml(xml: string, sourceName: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkHrefMatch = block.match(/<link[^>]+href\s*=\s*["']([^"']+)["']/i);
    const linkTextMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const link = linkHrefMatch
      ? linkHrefMatch[1].trim()
      : linkTextMatch
        ? stripTag(linkTextMatch[1]).trim()
        : "";
    const descMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const pubMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

    items.push({
      title: stripTag(titleMatch ? titleMatch[1] : "Untitled"),
      link,
      description: stripTag(descMatch ? descMatch[1] : ""),
      pubDate: pubMatch ? stripTag(pubMatch[1]) : "",
      sourceName,
    });
  }

  return items;
}

async function fetchRssItems(
  rssUrls: string[],
  limitPerFeed: number
): Promise<RawFeedItem[]> {
  const allItems: RawFeedItem[] = [];

  for (const url of rssUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const feedName = new URL(url).hostname.replace(/^www\./, "");
      const items = parseRssXml(xml, feedName);
      items.sort((a, b) =>
        b.pubDate.localeCompare(a.pubDate, undefined, { sensitivity: "base" })
      );
      allItems.push(...items.slice(0, limitPerFeed));
    } catch {
      // Skip failed feeds
    }
  }

  return allItems;
}

async function fetchGitHubReleases(
  githubRepos: string[],
  perPage: number
): Promise<RawReleaseItem[]> {
  const allItems: RawReleaseItem[] = [];

  for (const repo of githubRepos) {
    const parts = repo.trim().split("/").filter(Boolean);
    if (parts.length < 2) continue;
    const owner = parts[0];
    const repoName = parts[1];

    try {
      const url = `https://api.github.com/repos/${owner}/${repoName}/releases?per_page=${perPage}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ContextHub-FirstScan/1.0",
        },
      });
      if (!res.ok) continue;

      const releases = (await res.json()) as Array<{
        name?: string;
        tag_name?: string;
        html_url?: string;
        body?: string;
        published_at?: string;
      }>;

      for (const r of releases) {
        const title = r.name || r.tag_name || "Release";
        allItems.push({
          title: `${repo}: ${title}`,
          link: r.html_url || `https://github.com/${owner}/${repoName}/releases`,
          description: (r.body || "").slice(0, 500),
          pubDate: r.published_at || "",
          sourceName: repo,
        });
      }
    } catch {
      // Skip failed repos
    }
  }

  return allItems;
}

function buildKeywords(pair: NonNullable<Awaited<ReturnType<typeof getPairById>>>): string[] {
  const keys = new Set<string>();

  const { contextSources, autonomyTiers } = pair;

  for (const repo of contextSources.githubRepos ?? []) {
    for (const part of repo.split(/[/\s-]/).filter(Boolean)) {
      keys.add(part.toLowerCase());
    }
  }
  for (const user of contextSources.githubUsers ?? []) {
    keys.add(user.toLowerCase());
  }
  for (const topic of contextSources.moltbookTopics ?? []) {
    for (const part of topic.split(/[/\s-_]/).filter(Boolean)) {
      keys.add(part.toLowerCase());
    }
  }
  for (const url of contextSources.rssUrls ?? []) {
    try {
      keys.add(new URL(url).hostname.replace(/^www\./, "").toLowerCase());
    } catch {
      // ignore
    }
  }

  for (const tier of [
    ...(autonomyTiers?.tier1 ?? []),
    ...(autonomyTiers?.tier2 ?? []),
    ...(autonomyTiers?.tier3 ?? []),
  ]) {
    for (const word of tier.split(/\s+/).filter(Boolean)) {
      keys.add(word.toLowerCase());
    }
  }

  return [...keys];
}

function scoreItem(
  item: RawFeedItem | RawReleaseItem,
  keywords: string[]
): number {
  const text = `${item.title} ${item.description} ${item.sourceName}`.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (kw.length < 2) continue;
    if (text.includes(kw)) score += 1;
  }
  return score;
}

export async function POST(req: NextRequest) {
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;
  try {
    const body = await req.json();
    const parsed = parseBody(FirstScanSchema, body);
    if (!parsed.ok) return parsed.response;
    const { pairId } = parsed.data;

    const pair = await getPairById(pairId);
    if (!pair) {
      return NextResponse.json(
        { error: "Pair not found" },
        { status: 404 }
      );
    }

    const sources = pair.contextSources ?? {
      githubRepos: [],
      rssUrls: [],
      githubUsers: [],
      moltbookTopics: [],
    };

    const keywords = buildKeywords(pair);

    const rssItems = await fetchRssItems(sources.rssUrls ?? [], 5);
    const releaseItems = await fetchGitHubReleases(
      sources.githubRepos ?? [],
      3
    );

    type Scored = { item: RawFeedItem | RawReleaseItem; score: number };
    const scored: Scored[] = [
      ...rssItems.map((item) => ({
        item,
        score: scoreItem(item, keywords),
      })),
      ...releaseItems.map((item) => ({
        item,
        score: scoreItem(item, keywords),
      })),
    ];

    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5).map((s) => s.item);

    const queue = await readDecideQueue();

    for (const raw of top5) {
      const ingestItemId = genId("fs");
      const dq: DecideQueueItem = {
        id: genId("dq"),
        ingestItemId,
        workerId: "first-scan",
        pairId,
        title: raw.title,
        summary: raw.description || raw.title,
        detail: raw.description || undefined,
        sourceUrl: raw.link || undefined,
        sourceName: raw.sourceName,
        urgency: "medium",
        confidence: 0.8,
        signalKeys: ["first-scan", raw.sourceName],
        tags: ["onboarding", "first-scan"],
        status: "pending",
        ingestedAt: new Date().toISOString(),
      };
      queue.push(dq);
    }

    const trimmed = queue.slice(-200);
    await writeDecideQueue(trimmed);

    await recordWorkerIngest(pairId, top5.length);

    return NextResponse.json({
      success: true,
      itemsCreated: top5.length,
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { error: "First scan failed", detail: err.message },
      { status: 500 }
    );
  }
}
