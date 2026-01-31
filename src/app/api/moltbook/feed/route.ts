/**
 * GET /api/moltbook/feed
 * Fetches personalized feed (subscribed submolts + followed agents).
 * Query: ?agentId=xxx&sort=hot|new|top&limit=25
 */

import { NextRequest, NextResponse } from "next/server";
import { getFeed, getPosts, isConfigured } from "@/lib/moltbook";
import { getApiKeyForAgent, listAgents } from "@/lib/agent-roster";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId")?.trim() || null;
  const sort = (searchParams.get("sort") as "hot" | "new" | "top") || "new";
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25));

  const roster = await listAgents();
  let apiKey: string | null = null;
  if (agentId) {
    apiKey = await getApiKeyForAgent(agentId);
  }
  if (!apiKey && roster[0]) {
    apiKey = await getApiKeyForAgent(roster[0].id);
  }
  if (!apiKey) {
    apiKey = process.env.MOLTBOOK_API_KEY || null;
  }

  const configured = isConfigured(apiKey || undefined) || roster.length > 0 || !!process.env.MOLTBOOK_API_KEY;

  if (!configured) {
    return NextResponse.json({ configured: false, posts: [] }, { status: 200 });
  }

  if (!apiKey) {
    return NextResponse.json({ configured: true, posts: [] }, { status: 200 });
  }

  const out = await getFeed({ sort, limit, apiKey });
  if (!out.success) {
    const fallback = await getPosts({ sort: sort as "hot" | "new" | "top", limit, apiKey });
    const posts = fallback.posts ?? [];
    const submoltName = (s: string | { name: string } | undefined) =>
      typeof s === "string" ? s : s?.name ?? "unknown";
    const mapped = posts.map((p) => ({
      id: p.id,
      title: p.title ?? "(no title)",
      content: p.content ?? "",
      submolt: submoltName(p.submolt),
      author: p.author?.name ?? "Unknown",
      authorKarma: 0,
      upvotes: p.upvotes ?? 0,
      comments: 0,
      createdAt: p.created_at ?? "",
    }));
    return NextResponse.json({ configured: true, posts: mapped });
  }

  const submoltName = (s: string | { name: string } | undefined) =>
    typeof s === "string" ? s : s?.name ?? "unknown";

  const posts = (out.posts ?? []).map((p) => ({
    id: p.id,
    title: p.title ?? "(no title)",
    content: p.content ?? "",
    submolt: submoltName(p.submolt),
    author: p.author?.name ?? "Unknown",
    authorKarma: 0,
    upvotes: p.upvotes ?? 0,
    comments: 0,
    createdAt: p.created_at ?? "",
  }));

  return NextResponse.json({ configured: true, posts });
}
