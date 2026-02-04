/**
 * POST /api/decide/propose
 * Unified propose API. Routes by category:
 * - social -> moltbook-pending (existing flow)
 * - dev -> decide-pending (projectId required)
 *
 * Body: {
 *   category: "social" | "dev",
 *   actionType: string,
 *   title: string,
 *   description: string,
 *   reasoning: string,
 *   implications?: string[],
 *   riskLevel?: "low" | "medium" | "high" | "critical",
 *   projectId?: string,  // required for category: "dev"
 *   ...payload
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { addPending } from "@/lib/moltbook-pending";
import { addPendingDev } from "@/lib/decide-pending";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const category = body.category as string;
    const projectId = body.projectId as string | undefined;
    const xContextProject = req.headers.get("X-Context-Project")?.trim();

    if (category === "dev") {
      const projectIdResolved = projectId || xContextProject;
      if (!projectIdResolved) {
        return NextResponse.json(
          { success: false, error: "projectId required for dev actions (or X-Context-Project header)" },
          { status: 400 }
        );
      }

      const actionType = body.actionType as string;
      if (!DEV_ACTION_TYPES.includes(actionType as (typeof DEV_ACTION_TYPES)[number])) {
        return NextResponse.json(
          { success: false, error: `Invalid actionType. Must be one of: ${DEV_ACTION_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      const title = typeof body.title === "string" ? body.title.trim() : "Proposed dev action";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const reasoning = typeof body.reasoning === "string" ? body.reasoning.trim() : "";
      const implications = Array.isArray(body.implications)
        ? body.implications.filter((x: unknown) => typeof x === "string")
        : [];
      const riskLevel = ["low", "medium", "high", "critical"].includes(body.riskLevel)
        ? body.riskLevel
        : "medium";

      const devPayload = {
        type: actionType,
        ...(body.path && { path: body.path }),
        ...(body.packageName && { packageName: body.packageName }),
        ...(body.content && { content: body.content }),
        ...(body.diff && { diff: body.diff }),
      };

      const item = addPendingDev({
        category: "dev",
        actionType: actionType as (typeof DEV_ACTION_TYPES)[number],
        title,
        description,
        reasoning,
        implications,
        riskLevel,
        projectId: projectIdResolved,
        devPayload,
      });

      return NextResponse.json({ success: true, id: item.id });
    }

    if (category === "social") {
      const actionType = body.actionType as string;
      if (!SOCIAL_ACTION_TYPES.includes(actionType as (typeof SOCIAL_ACTION_TYPES)[number])) {
        return NextResponse.json(
          { success: false, error: `Invalid actionType. Must be one of: ${SOCIAL_ACTION_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      const title = typeof body.title === "string" ? body.title.trim() : "Proposed action";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const reasoning = typeof body.reasoning === "string" ? body.reasoning.trim() : "";
      const implications = Array.isArray(body.implications)
        ? body.implications.filter((x: unknown) => typeof x === "string")
        : [];
      const riskLevel = ["low", "medium", "high", "critical"].includes(body.riskLevel)
        ? body.riskLevel
        : "medium";

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

      const item = await addPending({
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
    }

    return NextResponse.json(
      { success: false, error: `Unknown category: ${category}. Use "social" or "dev".` },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Propose failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
