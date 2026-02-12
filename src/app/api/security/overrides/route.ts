/**
 * GET /api/security/overrides — List operation overrides.
 * POST /api/security/overrides — Add an override. Body: OperationOverride.
 * DELETE /api/security/overrides — Remove override. Body: { operation: string; target?: string; agentId?: string }.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  getOperationOverrides,
  addOperationOverride,
  removeOperationOverride,
  type OperationOverride,
} from "@/lib/security/operation-overrides";
import { getOperatorId } from "@/lib/operator";

const PostOverrideSchema = z.object({
  operation: z.string().trim().min(1, "operation is required"),
  target: z.string().trim().optional(),
  scope: z.enum(["agent", "global"]).default("global"),
  agentId: z.string().trim().optional(),
  action: z.enum(["allow", "block", "ask"]).default("allow"),
  expiresAt: z.number().optional(),
  reason: z.string().trim().optional(),
});

const DeleteOverrideSchema = z.object({
  operation: z.string().trim().min(1, "operation is required"),
  target: z.string().optional(),
  agentId: z.string().optional(),
});

export async function GET() {
  try {
    const overrides = await getOperationOverrides();
    return NextResponse.json({ overrides });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load overrides";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(PostOverrideSchema, body);
    if (!parsed.ok) return parsed.response;

    const { operation, target, scope, agentId, action, expiresAt, reason } = parsed.data;

    const override: OperationOverride = {
      operation,
      target,
      scope,
      agentId,
      action,
      expiresAt,
      reason,
      operatorId: getOperatorId(),
      visibility: "private",
    };

    await addOperationOverride(override);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add override";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseBody(DeleteOverrideSchema, body);
    if (!parsed.ok) return parsed.response;

    const { operation, target, agentId } = parsed.data;

    const removed = await removeOperationOverride({
      operation,
      target,
      agentId,
    });
    return NextResponse.json({ success: true, removed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove override";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
