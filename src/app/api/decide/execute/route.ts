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
import { appendProvenance } from "@/lib/decision-provenance";
import { recordOutcomesForDecision } from "@/lib/signal-outcomes";
import { runBeforeToolExecution } from "@/lib/agent-lifecycle-hooks";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";
import { recordSuccess, recordFailure } from "@/lib/security/trust-scoring";
import { getOperatorId } from "@/lib/operator";

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

    // Lifecycle: authorize execution (caller must be identified; optional session check later)
    const callerId =
      (typeof body.approvedBy === "string" ? body.approvedBy.trim() : null) ??
      req.headers.get("x-caller-id")?.trim() ??
      "";
    const hookResult = await runBeforeToolExecution({
      pendingId: id,
      callerId,
      operation: { category: "write", action: "execute_pending", target: id },
      securityContext: {
        userId: callerId || "anonymous",
        agentId: "",
        sessionId: "",
        source: "api",
      },
    });
    if (hookResult.shortCircuit && !hookResult.allowed) {
      return NextResponse.json(
        { success: false, error: hookResult.reason ?? "Execution not authorized" },
        { status: 403 }
      );
    }

    getSecurityMiddleware().recordExecutionApproval(id, callerId);

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
      const approvedBy = (body.approvedBy as string) || "dashboard";
      await appendProvenance({
        decisionId: id,
        triggeredBy: [],
        awarenessResult: { allowed: true },
        operatorId: getOperatorId(),
        visibility: "private",
        humanApproval: { approvedBy, timestamp: new Date().toISOString() },
        executionResult: { success: true, outcome: "executed" },
      });
      await recordOutcomesForDecision(id, "followed", [], "unknown");
      const opKey =
        payload.type === "create_submolt"
          ? "write:moltbook_post"
          : `write:moltbook_${payload.type}`;
      const target =
        payload.type === "comment"
          ? payload.postId
          : payload.type === "follow"
            ? payload.agentName ?? item.targetAgent
            : payload.type === "post" || payload.type === "create_submolt"
              ? payload.submolt ?? payload.name
              : undefined;
      await recordSuccess(opKey, target, payload.rosterAgentId ?? undefined, getOperatorId()).catch(() => {});
      return NextResponse.json({ success: true });
    }

    const opKey =
      payload.type === "create_submolt"
        ? "write:moltbook_post"
        : `write:moltbook_${payload.type}`;
    const target =
      payload.type === "comment"
        ? payload.postId
        : payload.type === "follow"
          ? payload.agentName ?? item.targetAgent
          : payload.type === "post" || payload.type === "create_submolt"
            ? payload.submolt ?? payload.name
            : undefined;
    await recordFailure(opKey, target, payload.rosterAgentId ?? undefined, getOperatorId()).catch(() => {});
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Execute failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}