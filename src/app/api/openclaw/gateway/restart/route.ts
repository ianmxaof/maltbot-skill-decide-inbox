/**
 * POST /api/openclaw/gateway/restart — restart the OpenClaw Gateway
 * Works when Gateway is installed as a service (launchd/systemd/schtasks).
 * If running Gateway in foreground, you must restart it manually.
 */

import { NextResponse } from "next/server";
import { restartGateway } from "@/lib/openclaw";

export async function POST() {
  try {
    const result = await restartGateway();
    if (!result.ok) {
      const msg = result.error?.error?.message ?? "Gateway restart failed";
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to restart Gateway";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
