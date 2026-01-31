/**
 * GET /api/moltbook/activity
 * Aggregates feed from all roster agents for use in Signal Feeds, Context Hub.
 * Returns posts with source info.
 */

import { NextRequest, NextResponse } from "next/server";
import { getFeed, getPosts } from "@/lib/moltbook";
import { getApiKeyForAgent, listAgents } from "@/lib/agent-roster";

export async function GET(req: NextRequest) {
  const roster = await listAgents();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

  const allPosts: Array<{
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
    agentName?: string;
  }> = [];

  const submoltName = (s: string | { name: string } | undefined) =>
    typeof s === "string" ? s : s?.name ?? "unknown";

  for (const a of roster.slice(0, 5)) {
    const apiKey = await getApiKeyForAgent(a.id);
    if (!apiKey) continue;

    const out = await getFeed({ sort: "new", limit: 10, apiKey });
    let posts = out.posts ?? [];
    if (!out.success || posts.length === 0) {
      const fallback = await getPosts({ sort: "new", limit: 10, apiKey });
      posts = fallback.posts ?? [];
    }

    for (const p of posts) {
      allPosts.push({
        id: `${a.id}-${p.id}`,
        title: p.title ?? "(no title)",
        content: p.content ?? "",
        submolt: submoltName(p.submolt),
        author: p.author?.name ?? "Unknown",
        authorKarma: 0,
        upvotes: p.upvotes ?? 0,
        comments: 0,
        createdAt: p.created_at ?? "",
        source: "moltbook",
        agentName: a.name,
      });
    }
  }

  if (roster.length === 0 && process.env.MOLTBOOK_API_KEY) {
    const out = await getFeed({ sort: "new", limit, apiKey: process.env.MOLTBOOK_API_KEY });
    const posts = out.posts ?? [];
    for (const p of posts) {
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
      });
    }
  }

  allPosts.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  return NextResponse.json({
    posts: allPosts.slice(0, limit),
    rosterCount: roster.length,
  });
}
