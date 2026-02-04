import { NextResponse } from "next/server";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

/**
 * GET /api/security/stats
 * Returns security layer stats (operations, allowed, blocked, pending approvals, anomalies, isPaused)
 */
export async function GET() {
  try {
    const middleware = getSecurityMiddleware();
    const stats = middleware.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API] security/stats:", error);
    return NextResponse.json(
      { error: "Failed to get security stats" },
      { status: 500 }
    );
  }
}
