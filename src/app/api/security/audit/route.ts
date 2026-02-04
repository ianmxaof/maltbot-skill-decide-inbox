import { NextRequest, NextResponse } from "next/server";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

/**
 * GET /api/security/audit
 * Returns audit log. Query: since (ISO), result, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");
    const result = searchParams.get("result") as "allowed" | "blocked" | "approved" | "denied" | undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 100;

    const middleware = getSecurityMiddleware();
    const entries = middleware.getAuditLog({
      since: sinceParam ? new Date(sinceParam) : undefined,
      result,
    });
    const sliced = entries.slice(-limit).reverse();

    const serialized = sliced.map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      result: e.result,
      operation: e.operation,
      target: e.target,
      userId: e.userId,
      agentId: e.agentId,
      source: e.source,
      reason: e.reason,
    }));

    return NextResponse.json({ audit: serialized });
  } catch (error) {
    console.error("[API] security/audit:", error);
    return NextResponse.json(
      { error: "Failed to get audit log" },
      { status: 500 }
    );
  }
}
