/**
 * GET /api/moltbook/profile
 * Fetches agent profile and recent posts from Moltbook.
 * Query: ?agentId=xxx (roster agent) — else uses MOLTBOOK_API_KEY.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMe, isConfigured } from "@/lib/moltbook";
import { getApiKeyForAgent, listAgents } from "@/lib/agent-roster";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId")?.trim() || null;

  let apiKey: string | null = null;
  if (agentId) {
    apiKey = await getApiKeyForAgent(agentId);
  }

  const roster = await listAgents();
  const hasRoster = roster.length > 0;
  const configured = isConfigured(apiKey || undefined) || hasRoster || !!process.env.MOLTBOOK_API_KEY;

  if (!configured) {
    return NextResponse.json(
      { configured: false, error: "No agents in roster", hint: "Register an agent and add to roster" },
      { status: 200 }
    );
  }

  const key =
    apiKey ||
    (roster[0] ? await getApiKeyForAgent(roster[0].id) : null) ||
    process.env.MOLTBOOK_API_KEY;
  if (!key) {
    return NextResponse.json(
      { configured: true, error: "No API key for agent", agent: null },
      { status: 200 }
    );
  }

  let out = await getMe(key);
  // Retry once on timeout or transient failure so slow Moltbook responses can succeed
  if (!out.success && (out.error?.includes("timed out") || out.error === "Request failed")) {
    await new Promise((r) => setTimeout(r, 2000));
    out = await getMe(key);
  }
  if (!out.success) {
    // Return 200 with error so the UI can show "Profile unavailable" and still render the rest of the page
    return NextResponse.json({
      configured: true,
      error: out.error,
      hint: out.hint,
      agent: null,
      recentPosts: [],
    });
  }

  const agent = out.agent;
  if (!agent) {
    return NextResponse.json({ configured: true, agent: null }, { status: 200 });
  }

  const submoltName = (s: string | { name: string } | undefined) =>
    typeof s === "string" ? s : s?.name ?? "unknown";

  const profile = {
    name: agent.name,
    karma: agent.karma ?? 0,
    followers: agent.follower_count ?? 0,
    following: agent.following_count ?? 0,
    lastActive: agent.last_active
      ? formatRelative(agent.last_active)
      : "Unknown",
    status: agent.is_claimed ? ("claimed" as const) : ("pending_claim" as const),
  };

  const recentPosts = (agent.recentPosts ?? []).map((p) => ({
    id: p.id,
    title: p.title ?? "(no title)",
    content: p.content ?? "",
    submolt: submoltName(p.submolt),
    author: p.author?.name ?? "Unknown",
    authorKarma: 0,
    upvotes: p.upvotes ?? 0,
    comments: 0,
    createdAt: p.created_at ? formatRelative(p.created_at) : "",
  }));

  return NextResponse.json({
    configured: true,
    agent: profile,
    recentPosts,
  });
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60_000);
    const diffH = Math.floor(diffM / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffM < 1) return "just now";
    if (diffM < 60) return `${diffM} minute${diffM !== 1 ? "s" : ""} ago`;
    if (diffH < 24) return `${diffH} hour${diffH !== 1 ? "s" : ""} ago`;
    if (diffD < 7) return `${diffD} day${diffD !== 1 ? "s" : ""} ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}
