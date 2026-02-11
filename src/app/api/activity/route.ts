/**
 * GET /api/activity — Fetch activity feed items.
 * Query: pairId?, limit?, since?
 */

import { NextRequest, NextResponse } from "next/server";
import { getActivityFeed } from "@/lib/activity-feed-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pairId = searchParams.get("pairId") ?? undefined;
    const limit = searchParams.get("limit");
    const since = searchParams.get("since") ?? undefined;
    const items = await getActivityFeed({
      pairId,
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100,
      since,
    });
    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Activity fetch failed";
    return NextResponse.json({ error: msg, items: [] }, { status: 500 });
  }
}
