/**
 * GET /api/network/signals — Get signal convergences
 *
 * Query: viewerPairId (optional — for relevance scoring), limit?
 */

import { NextRequest, NextResponse } from "next/server";
import { getConvergences } from "@/lib/network-store";
import { enrichForViewer } from "@/lib/convergence-engine";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const viewerPairId = url.searchParams.get("viewerPairId")?.trim();
    const limit = parseInt(url.searchParams.get("limit") ?? "30", 10);

    let convergences = await getConvergences();

    if (viewerPairId) {
      convergences = await enrichForViewer(viewerPairId, convergences);
    }

    // Sort by strength, then relevance
    convergences.sort(
      (a, b) =>
        b.relevanceToViewer - a.relevanceToViewer ||
        b.strength - a.strength
    );

    return NextResponse.json({
      success: true,
      convergences: convergences.slice(0, limit),
      total: convergences.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get convergences";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
