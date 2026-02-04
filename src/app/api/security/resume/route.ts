import { NextResponse } from "next/server";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

/**
 * POST /api/security/resume
 * Resume agent execution (security layer)
 */
export async function POST() {
  try {
    const middleware = getSecurityMiddleware();
    middleware.resume();
    return NextResponse.json({ ok: true, isPaused: false });
  } catch (error) {
    console.error("[API] security/resume:", error);
    return NextResponse.json(
      { error: "Failed to resume" },
      { status: 500 }
    );
  }
}
