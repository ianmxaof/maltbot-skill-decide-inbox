import { NextResponse } from "next/server";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

/**
 * GET /api/security/approvals
 * Returns pending approval requests
 */
export async function GET() {
  try {
    const middleware = getSecurityMiddleware();
    const pending = middleware.getPendingApprovals();
    const serialized = pending.map((p) => ({
      id: p.id,
      operation: `${p.operation.category}:${p.operation.action}`,
      reason: p.reason,
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiresAt.toISOString(),
      source: p.context.source,
    }));
    return NextResponse.json({ approvals: serialized });
  } catch (error) {
    console.error("[API] security/approvals:", error);
    return NextResponse.json(
      { error: "Failed to get approvals" },
      { status: 500 }
    );
  }
}
