/**
 * POST /api/executor/heartbeat — Run one heartbeat via PowerCoreExecutor (default: Moltbook).
 * Body: { adapter?: "moltbook"; mode?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { runHeartbeat } from "@/lib/executor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runHeartbeat({
      adapter: typeof body.adapter === "string" ? body.adapter : undefined,
      mode: typeof body.mode === "string" ? body.mode : undefined,
    });
    return NextResponse.json({
      success: result.success,
      skipped: result.skipped,
      reason: result.reason,
      error: result.error,
      result: result.result,
      stats: result.stats,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Heartbeat failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
