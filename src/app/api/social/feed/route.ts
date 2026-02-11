/**
 * GET /api/social/feed — Get social feed for a pair
 *
 * Query: viewerPairId (required), limit?, before?
 * Returns activity from followed pairs, filtered by visibility.
 * Enriches each activity with the pair name for display.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSocialFeed, getNetworkActivity } from "@/lib/social-store";
import { getPairById } from "@/lib/agent-pair-store";

async function enrichWithPairNames<T extends { pairId: string }>(activities: T[]): Promise<(T & { pairName?: string })[]> {
  const pairCache = new Map<string, string>();
  return Promise.all(
    activities.map(async (a) => {
      if (!pairCache.has(a.pairId)) {
        try {
          const pair = await getPairById(a.pairId);
          pairCache.set(a.pairId, pair ? `${pair.humanName} + ${pair.agentName}` : a.pairId);
        } catch {
          pairCache.set(a.pairId, a.pairId);
        }
      }
      return { ...a, pairName: pairCache.get(a.pairId) };
    })
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const viewerPairId = url.searchParams.get("viewerPairId")?.trim() ?? "";
    const pairId = url.searchParams.get("pairId")?.trim();
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const before = url.searchParams.get("before")?.trim();

    // If pairId is given, return that pair's public activity
    if (pairId) {
      const activities = await getNetworkActivity({
        pairId,
        limit,
        before: before || undefined,
      });
      const enriched = await enrichWithPairNames(activities);
      return NextResponse.json({ success: true, activities: enriched });
    }

    // Otherwise return the social feed for the viewer
    if (!viewerPairId) {
      return NextResponse.json(
        { success: false, error: "Missing viewerPairId" },
        { status: 400 }
      );
    }

    const activities = await getSocialFeed(viewerPairId, {
      limit,
      before: before || undefined,
    });
    const enriched = await enrichWithPairNames(activities);

    return NextResponse.json({ success: true, activities: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get feed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
