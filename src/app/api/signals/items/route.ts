/**
 * GET /api/signals/items
 * Unified feed: Moltbook activity + RSS from configured URLs. Returns FeedItem[] and rosterCount.
 */

import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { getMoltbookActivityPosts } from "@/lib/moltbook-activity";
import { getGithubSignals } from "@/lib/github-signals";
import { readSignalsConfig } from "@/lib/signals-config";
import { MOLTBOOK_URLS } from "@/lib/moltbook-urls";
import type { FeedItem } from "@/types/signals";

const parser = new Parser({ timeout: 10000 });

function moltbookPostToFeedItem(post: {
  id: string;
  title: string;
  content: string;
  submolt: string;
  author: string;
  upvotes: number;
  comments: number;
  createdAt: string;
  isOwnAgent?: boolean;
}): FeedItem {
  return {
    id: `moltbook-${post.id}`,
    title: post.title,
    url: MOLTBOOK_URLS.post(post.id),
    summary: post.content,
    source: "moltbook",
    sourceId: post.id,
    createdAt: post.createdAt,
    meta: { submolt: post.submolt, author: post.author, upvotes: post.upvotes, comments: post.comments, isOwnAgent: post.isOwnAgent },
  };
}

async function fetchRssFeedItems(feedUrl: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const items: FeedItem[] = (feed.items ?? []).map((item, idx) => {
      const id = item.guid ?? item.link ?? `${feedUrl}-${idx}`;
      const link = item.link ?? undefined;
      const title = item.title ?? "(no title)";
      const summary = item.contentSnippet ?? item.content ?? undefined;
      const isoDate = item.isoDate ?? item.pubDate;
      const createdAt = isoDate ? new Date(isoDate).toISOString() : new Date().toISOString();
      return {
        id: `rss-${Buffer.from(id).toString("base64url").slice(0, 32)}`,
        title,
        url: link,
        summary,
        source: "rss" as const,
        sourceId: feedUrl,
        createdAt,
        meta: { feedUrl },
      };
    });
    return items;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [activity, config] = await Promise.all([
      getMoltbookActivityPosts(25),
      readSignalsConfig(),
    ]);

    const moltbookItems: FeedItem[] = activity.posts.map(moltbookPostToFeedItem);

    const rssUrls = config.rssUrls ?? [];
    const rssItemArrays = await Promise.all(
      rssUrls.slice(0, 10).map((url) => fetchRssFeedItems(url))
    );
    const rssItems = rssItemArrays.flat();

    const githubUsers = config.githubUsers ?? [];
    const githubRepos = config.githubRepos ?? [];
    const githubItems =
      githubUsers.length > 0 || githubRepos.length > 0
        ? await getGithubSignals(githubUsers, githubRepos)
        : [];

    const items: FeedItem[] = [...moltbookItems, ...rssItems, ...githubItems];
    items.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return db - da;
    });

    return NextResponse.json({
      items: items.slice(0, 50),
      rosterCount: activity.rosterCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch signals";
    return NextResponse.json({ success: false, error: msg, items: [], rosterCount: 0 }, { status: 500 });
  }
}
