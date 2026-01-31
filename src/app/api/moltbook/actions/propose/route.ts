/**
 * POST /api/moltbook/actions/propose
 * Agent proposes a social action. It is queued for human approval in Decide Inbox.
 *
 * Body: {
 *   actionType: "post" | "comment" | "follow" | "create_submolt",
 *   title: string,
 *   description: string,
 *   reasoning: string,
 *   implications?: string[],
 *   riskLevel?: "low" | "medium" | "high" | "critical",
 *   // Moltbook payload (required for execution):
 *   submolt?: string, title?: string, content?: string, url?: string,  // post
 *   postId?: string, parentId?: string, content?: string,              // comment
 *   agentName?: string,                                                 // follow
 *   name?: string, display_name?: string, description?: string,        // create_submolt
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { addPending } from "@/lib/moltbook-pending";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const actionType = body.actionType as string;
    if (!["post", "comment", "follow", "create_submolt"].includes(actionType)) {
      return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "Proposed action";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const reasoning = typeof body.reasoning === "string" ? body.reasoning.trim() : "";
    const implications = Array.isArray(body.implications)
      ? body.implications.filter((x: unknown) => typeof x === "string")
      : [];
    const riskLevel =
      ["low", "medium", "high", "critical"].includes(body.riskLevel) ? body.riskLevel : "medium";

    const moltbookPayload: Record<string, unknown> = {
      type: actionType,
      ...(body.rosterAgentId && { rosterAgentId: body.rosterAgentId }),
      ...(body.submolt && { submolt: body.submolt }),
      ...(body.content && { content: body.content }),
      ...(body.url && { url: body.url }),
      ...(body.postId && { postId: body.postId }),
      ...(body.parentId && { parentId: body.parentId }),
      ...(body.agentName && { agentName: body.agentName }),
      ...(body.name && { name: body.name }),
      ...(body.display_name && { display_name: body.display_name }),
      ...(body.description && { description: body.description }),
      ...(body.title && { title: body.title }),
    };

    const item = addPending({
      category: "social",
      actionType: actionType as "post" | "comment" | "follow" | "create_submolt",
      title,
      description,
      reasoning,
      implications,
      riskLevel,
      moltbookPayload: moltbookPayload as Parameters<typeof addPending>[0]["moltbookPayload"],
    });

    return NextResponse.json({ success: true, id: item.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Propose failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
