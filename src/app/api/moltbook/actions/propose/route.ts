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
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { addPending } from "@/lib/moltbook-pending";

const ProposeSchema = z.object({
  actionType: z.enum(["post", "comment", "follow", "create_submolt"]),
  title: z.string().trim().default("Proposed action"),
  description: z.string().trim().default(""),
  reasoning: z.string().trim().default(""),
  implications: z.array(z.string()).default([]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  // Moltbook payload fields (all optional)
  rosterAgentId: z.string().optional(),
  submolt: z.string().optional(),
  content: z.string().optional(),
  url: z.string().optional(),
  postId: z.string().optional(),
  parentId: z.string().optional(),
  agentName: z.string().optional(),
  name: z.string().optional(),
  display_name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(ProposeSchema, body);
    if (!parsed.ok) return parsed.response;
    const {
      actionType, title, description, reasoning, implications, riskLevel,
      rosterAgentId, submolt, content, url, postId, parentId, agentName, name, display_name,
    } = parsed.data;

    const moltbookPayload: Record<string, unknown> = {
      type: actionType,
      ...(rosterAgentId && { rosterAgentId }),
      ...(submolt && { submolt }),
      ...(content && { content }),
      ...(url && { url }),
      ...(postId && { postId }),
      ...(parentId && { parentId }),
      ...(agentName && { agentName }),
      ...(name && { name }),
      ...(display_name && { display_name }),
      ...(description && { description }),
      ...(title && { title }),
    };

    const item = await addPending({
      category: "social",
      actionType,
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
