/**
 * GET /api/security/overrides — List operation overrides.
 * POST /api/security/overrides — Add an override. Body: OperationOverride.
 * DELETE /api/security/overrides — Remove override. Body: { operation: string; target?: string; agentId?: string }.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOperationOverrides,
  addOperationOverride,
  removeOperationOverride,
  type OperationOverride,
} from "@/lib/security/operation-overrides";
import { getOperatorId } from "@/lib/operator";

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
    const override: OperationOverride = {
      operation: typeof body.operation === "string" ? body.operation.trim() : "",
      target: typeof body.target === "string" ? body.target.trim() : undefined,
      scope: body.scope === "agent" ? "agent" : "global",
      agentId: typeof body.agentId === "string" ? body.agentId.trim() : undefined,
      action: body.action === "block" || body.action === "ask" ? body.action : "allow",
      expiresAt: typeof body.expiresAt === "number" ? body.expiresAt : undefined,
      reason: typeof body.reason === "string" ? body.reason.trim() : undefined,
      operatorId: getOperatorId(),
      visibility: "private",
    };
    if (!override.operation) {
      return NextResponse.json({ error: "operation is required" }, { status: 400 });
    }
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
    const operation = typeof body.operation === "string" ? body.operation.trim() : "";
    if (!operation) {
      return NextResponse.json({ error: "operation is required" }, { status: 400 });
    }
    const removed = await removeOperationOverride({
      operation,
      target: typeof body.target === "string" ? body.target : undefined,
      agentId: typeof body.agentId === "string" ? body.agentId : undefined,
    });
    return NextResponse.json({ success: true, removed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove override";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
