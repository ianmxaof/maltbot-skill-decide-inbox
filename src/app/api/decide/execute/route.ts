/**
 * POST /api/decide/execute
 * Execute approved action. Routes by id prefix:
 * - moltbook-* -> Moltbook API (social actions)
 * - dev-* -> Mark approved (dev execution deferred to Phase 2)
 *
 * Body: { id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getPending, remove } from "@/lib/moltbook-pending";
import { getPendingDev, markApprovedDev } from "@/lib/decide-pending";
import {
  createPost,
  createComment,
  followAgent,
  createSubmolt,
  isConfigured,
} from "@/lib/moltbook";
import { getApiKeyForAgent, listAgents } from "@/lib/agent-roster";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    // Dev action: mark approved (execute deferred to Phase 2)
    const devItem = getPendingDev(id);
    if (devItem) {
      markApprovedDev(id);
      return NextResponse.json({ success: true, message: "Dev action approved (execution deferred)" });
    }

    // Social action: execute via Moltbook API
    const roster = await listAgents();
    const hasRoster = roster.length > 0;
    const hasEnv = isConfigured();
    if (!hasRoster && !hasEnv) {
      return NextResponse.json(
        { success: false, error: "No agents in roster. Add an agent first." },
        { status: 503 }
      );
    }

    const item = await getPending(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Action not found or already processed" },
        { status: 404 }
      );
    }

    const payload = item.moltbookPayload;
    if (!payload?.type) {
      await remove(id);
      return NextResponse.json(
        { success: false, error: "No moltbookPayload — cannot execute (possibly mock item)" },
        { status: 400 }
      );
    }

    let apiKey: string | null = null;
    if (payload.rosterAgentId) {
      apiKey = await getApiKeyForAgent(payload.rosterAgentId);
    }
    if (!apiKey && roster[0]) {
      apiKey = await getApiKeyForAgent(roster[0].id);
    }

    let result: { success: boolean; error?: string };

    switch (payload.type) {
      case "post":
        result = await createPost(
          {
            submolt: payload.submolt ?? "general",
            title: payload.title ?? item.title,
            content: payload.content,
            url: payload.url,
          },
          apiKey
        );
        break;
      case "comment":
        if (!payload.postId || !payload.content) {
          result = { success: false, error: "Missing postId or content" };
        } else {
          result = await createComment(
            payload.postId,
            { content: payload.content, parent_id: payload.parentId },
            apiKey
          );
        }
        break;
      case "follow":
        const agentName = payload.agentName ?? item.targetAgent;
        if (!agentName) {
          result = { success: false, error: "Missing agentName" };
        } else {
          result = await followAgent(agentName, apiKey);
        }
        break;
      case "create_submolt":
        result = await createSubmolt(
          {
            name: payload.name ?? "unnamed",
            display_name: payload.display_name ?? payload.name ?? "Unnamed",
            description: payload.description ?? "",
          },
          apiKey
        );
        break;
      default:
        result = { success: false, error: `Unknown action type: ${payload.type}` };
    }

    if (result.success) {
      await remove(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Execute failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}