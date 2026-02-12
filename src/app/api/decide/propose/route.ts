/**
 * POST /api/decide/propose
 * Unified propose API. Routes by category:
 * - social -> moltbook-pending (existing flow)
 * - dev -> decide-pending (projectId required)
 * - signal -> signal-pending (Send to inbox from Signals panel)
 *
 * Body for signal: { category: "signal", title, url?, summary?, source: "moltbook" | "rss" | "github", sourceId? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { addPending } from "@/lib/moltbook-pending";
import { addPendingDev } from "@/lib/decide-pending";
import { addPendingSignal } from "@/lib/signal-pending";

const DEV_ACTION_TYPES = [
  "add_dependency",
  "create_file",
  "modify_file",
  "delete_file",
  "architecture_change",
  "external_api",
  "auth_or_payment",
] as const;

const SOCIAL_ACTION_TYPES = ["post", "comment", "follow", "create_submolt"] as const;

const RiskLevel = z.enum(["low", "medium", "high", "critical"]).default("medium");

const DevSchema = z.object({
  category: z.literal("dev"),
  projectId: z.string().trim().optional(),
  actionType: z.enum(DEV_ACTION_TYPES),
  title: z.string().trim().default("Proposed dev action"),
  description: z.string().trim().default(""),
  reasoning: z.string().trim().default(""),
  implications: z.array(z.string()).default([]),
  riskLevel: RiskLevel,
  path: z.string().optional(),
  packageName: z.string().optional(),
  content: z.string().optional(),
  diff: z.string().optional(),
});

const SocialSchema = z.object({
  category: z.literal("social"),
  actionType: z.enum(SOCIAL_ACTION_TYPES),
  title: z.string().trim().default("Proposed action"),
  description: z.string().trim().default(""),
  reasoning: z.string().trim().default(""),
  implications: z.array(z.string()).default([]),
  riskLevel: RiskLevel,
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

const SignalSchema = z.object({
  category: z.literal("signal"),
  title: z.string().trim().min(1, "title required for signal"),
  source: z.enum(["moltbook", "rss", "github"]),
  url: z.string().optional(),
  summary: z.string().optional(),
  sourceId: z.string().optional(),
});

const ProposeSchema = z.discriminatedUnion("category", [DevSchema, SocialSchema, SignalSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(ProposeSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    if (data.category === "dev") {
      const projectIdResolved = data.projectId || req.headers.get("X-Context-Project")?.trim();
      if (!projectIdResolved) {
        return NextResponse.json(
          { success: false, error: "projectId required for dev actions (or X-Context-Project header)" },
          { status: 400 }
        );
      }

      const devPayload = {
        type: data.actionType,
        ...(data.path && { path: data.path }),
        ...(data.packageName && { packageName: data.packageName }),
        ...(data.content && { content: data.content }),
        ...(data.diff && { diff: data.diff }),
      };

      const item = addPendingDev({
        category: "dev",
        actionType: data.actionType,
        title: data.title,
        description: data.description,
        reasoning: data.reasoning,
        implications: data.implications,
        riskLevel: data.riskLevel,
        projectId: projectIdResolved,
        devPayload,
      });

      return NextResponse.json({ success: true, id: item.id });
    }

    if (data.category === "social") {
      const moltbookPayload: Record<string, unknown> = {
        type: data.actionType,
        ...(data.rosterAgentId && { rosterAgentId: data.rosterAgentId }),
        ...(data.submolt && { submolt: data.submolt }),
        ...(data.content && { content: data.content }),
        ...(data.url && { url: data.url }),
        ...(data.postId && { postId: data.postId }),
        ...(data.parentId && { parentId: data.parentId }),
        ...(data.agentName && { agentName: data.agentName }),
        ...(data.name && { name: data.name }),
        ...(data.display_name && { display_name: data.display_name }),
        ...(data.description && { description: data.description }),
        ...(data.title && { title: data.title }),
      };

      const item = await addPending({
        category: "social",
        actionType: data.actionType,
        title: data.title,
        description: data.description,
        reasoning: data.reasoning,
        implications: data.implications,
        riskLevel: data.riskLevel,
        moltbookPayload: moltbookPayload as Parameters<typeof addPending>[0]["moltbookPayload"],
      });

      return NextResponse.json({ success: true, id: item.id });
    }

    // signal
    const item = await addPendingSignal({
      title: data.title,
      url: data.url,
      summary: data.summary,
      source: data.source,
      sourceId: data.sourceId,
    });
    return NextResponse.json({ success: true, id: item.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Propose failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
