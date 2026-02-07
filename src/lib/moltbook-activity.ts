/**
 * Shared Moltbook activity aggregation. Used by GET /api/moltbook/activity and GET /api/signals/items.
 */

import { getFeed, getPosts } from "@/lib/moltbook";
import { getApiKeyForAgent, listAgents } from "@/lib/agent-roster";

export type MoltbookActivityPost = {
  id: string;
  title: string;
  content: string;
  submolt: string;
  author: string;
  authorKarma: number;
  upvotes: number;
  comments: number;
  createdAt: string;
  source: "moltbook";
  isOwnAgent?: boolean;
};

export async function getMoltbookActivityPosts(limit: number = 25): Promise<{
  posts: MoltbookActivityPost[];
  rosterCount: number;
}> {
  const roster = await listAgents();
  const rosterNames = new Set(roster.map((a) => a.name.toLowerCase()));
  const allPosts: MoltbookActivityPost[] = [];
  const seenIds = new Set<string>();

  const submoltName = (s: string | { name: string } | undefined) =>
    typeof s === "string" ? s : s?.name ?? "unknown";

  for (const a of roster.slice(0, 5)) {
    const apiKey = await getApiKeyForAgent(a.id);
    if (!apiKey) continue;

    const out = await getFeed({ sort: "new", limit: 15, apiKey });
    let posts = out.posts ?? [];
    if (!out.success || posts.length === 0) {
      const fallback = await getPosts({ sort: "new", limit: 15, apiKey });
      posts = fallback.posts ?? [];
    }

    for (const p of posts) {
      if (seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      const authorName = p.author?.name ?? "Unknown";
      const isOwnAgent = rosterNames.has(authorName.toLowerCase());
      allPosts.push({
        id: p.id,
        title: p.title ?? "(no title)",
        content: p.content ?? "",
        submolt: submoltName(p.submolt),
        author: authorName,
        authorKarma: 0,
        upvotes: p.upvotes ?? 0,
        comments: 0,
        createdAt: p.created_at ?? "",
        source: "moltbook",
        isOwnAgent,
      });
    }
  }

  if (roster.length === 0 && process.env.MOLTBOOK_API_KEY) {
    const out = await getFeed({ sort: "new", limit, apiKey: process.env.MOLTBOOK_API_KEY });
    const posts = out.posts ?? [];
    for (const p of posts) {
      if (seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      allPosts.push({
        id: p.id,
        title: p.title ?? "(no title)",
        content: p.content ?? "",
        submolt: submoltName(p.submolt),
        author: p.author?.name ?? "Unknown",
        authorKarma: 0,
        upvotes: p.upvotes ?? 0,
        comments: 0,
        createdAt: p.created_at ?? "",
        source: "moltbook",
        isOwnAgent: false,
      });
    }
  }

  allPosts.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  return {
    posts: allPosts.slice(0, limit),
    rosterCount: roster.length,
  };
}
