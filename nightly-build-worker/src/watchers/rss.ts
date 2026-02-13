// Watches RSS/Atom feeds for new items.
// Works with any RSS feed including Reddit .rss, HN, blogs, etc.

import { createHash } from "crypto";

export interface RssItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  source: string;
  contentHash: string;
}

interface FeedState {
  lastChecked: string;
  seenHashes: Set<string>;
}

const feedStates = new Map<string, FeedState>();

function hashContent(title: string, link: string): string {
  return createHash("sha256")
    .update(`${title}|${link}`)
    .digest("hex")
    .slice(0, 16);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function parseFeed(
  xml: string
): { title: string; link: string; content: string; pubDate: string }[] {
  const items: {
    title: string;
    link: string;
    content: string;
    pubDate: string;
  }[] = [];

  const itemBlocks = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  const entryBlocks = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) ?? [];
  const blocks = [...itemBlocks, ...entryBlocks];

  for (const block of blocks) {
    const title =
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const link =
      block.match(/<link[^>]*href="([^"]*)"[^>]*\/>/i)?.[1] ??
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ??
      "";
    const content =
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ??
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ??
      "";
    const pubDate =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ??
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim() ??
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() ??
      "";

    if (title || content) {
      items.push({
        title: stripHtml(title),
        link: link.replace(/&amp;/g, "&"),
        content: stripHtml(content),
        pubDate,
      });
    }
  }

  return items;
}

export async function checkFeed(
  feedUrl: string,
  options?: { maxItems?: number }
): Promise<RssItem[]> {
  const maxItems = options?.maxItems ?? 10;
  const sourceName = new URL(feedUrl).hostname.replace("www.", "");

  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "NightlyBuildWorker/0.1",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[rss] Feed ${feedUrl} returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const rawItems = parseFeed(xml);

    if (!feedStates.has(feedUrl)) {
      feedStates.set(feedUrl, {
        lastChecked: new Date().toISOString(),
        seenHashes: new Set(),
      });
    }
    const state = feedStates.get(feedUrl)!;

    const newItems: RssItem[] = [];
    for (const item of rawItems.slice(0, maxItems * 2)) {
      const hash = hashContent(item.title, item.link);
      if (state.seenHashes.has(hash)) continue;

      state.seenHashes.add(hash);
      newItems.push({
        title: item.title,
        link: item.link,
        content: item.content || item.title,
        pubDate: item.pubDate || new Date().toISOString(),
        source: sourceName,
        contentHash: hash,
      });

      if (newItems.length >= maxItems) break;
    }

    if (state.seenHashes.size > 500) {
      const arr = Array.from(state.seenHashes);
      state.seenHashes = new Set(arr.slice(-500));
    }

    state.lastChecked = new Date().toISOString();
    return newItems;
  } catch (e) {
    console.warn(`[rss] Error fetching ${feedUrl}: ${(e as Error).message}`);
    return [];
  }
}

export async function checkMultipleFeeds(
  feedUrls: string[],
  options?: { maxItemsPerFeed?: number }
): Promise<RssItem[]> {
  const results = await Promise.allSettled(
    feedUrls.map((url) =>
      checkFeed(url, { maxItems: options?.maxItemsPerFeed ?? 5 })
    )
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RssItem[]> => r.status === "fulfilled"
    )
    .flatMap((r) => r.value);
}
