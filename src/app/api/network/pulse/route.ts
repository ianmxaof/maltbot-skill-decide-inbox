/**
 * GET /api/network/pulse — Get the latest network pulse
 *
 * Query: history=true (to include pulse history), since? (ISO date for history filter)
 */

import { NextRequest, NextResponse } from "next/server";
import { getPulse, getPulseHistory } from "@/lib/network-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeHistory = url.searchParams.get("history") === "true";
    const since = url.searchParams.get("since")?.trim();

    const pulse = await getPulse();

    if (!pulse) {
      return NextResponse.json({
        success: true,
        pulse: null,
        message: "No pulse data yet. Run the cron job to compute.",
      });
    }

    if (includeHistory) {
      const history = await getPulseHistory(since || undefined);
      return NextResponse.json({ success: true, pulse, history });
    }

    return NextResponse.json({ success: true, pulse });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get pulse";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
