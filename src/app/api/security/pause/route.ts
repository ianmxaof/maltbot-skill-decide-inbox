import { NextResponse } from "next/server";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

/**
 * POST /api/security/pause
 * Pause agent execution (security layer)
 */
export async function POST() {
  try {
    const middleware = getSecurityMiddleware();
    middleware.pause();
    return NextResponse.json({ ok: true, isPaused: true });
  } catch (error) {
    console.error("[API] security/pause:", error);
    return NextResponse.json(
      { error: "Failed to pause" },
      { status: 500 }
    );
  }
}
