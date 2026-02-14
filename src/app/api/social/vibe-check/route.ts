/**
 * POST /api/social/vibe-check — Submit a vibe check reaction
 * GET  /api/social/vibe-check?targetPairId=xxx — Get aggregated vibes
 */

import { NextRequest, NextResponse } from "next/server";
import { submitVibeCheck, getVibeCheckSummary } from "@/lib/vibe-check-store";
import type { VibeReaction } from "@/types/social";

const VALID_REACTIONS: VibeReaction[] = [
  "aligned", "interesting", "inspiring", "chaotic", "based", "galaxy-brain",
];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const targetPairId = url.searchParams.get("targetPairId")?.trim();
    const viewerPairId = url.searchParams.get("viewerPairId")?.trim();

    if (!targetPairId) {
      return NextResponse.json(
        { success: false, error: "targetPairId required" },
        { status: 400 }
      );
    }

    const summary = await getVibeCheckSummary(targetPairId, viewerPairId || undefined);
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get vibes";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetPairId, reactorPairId, reaction } = body;

    if (!targetPairId || !reactorPairId || !reaction) {
      return NextResponse.json(
        { success: false, error: "targetPairId, reactorPairId, and reaction required" },
        { status: 400 }
      );
    }

    if (targetPairId === reactorPairId) {
      return NextResponse.json(
        { success: false, error: "Cannot vibe check your own profile" },
        { status: 400 }
      );
    }

    if (!VALID_REACTIONS.includes(reaction)) {
      return NextResponse.json(
        { success: false, error: `Invalid reaction. Valid: ${VALID_REACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const vibe = await submitVibeCheck(targetPairId, reactorPairId, reaction);
    return NextResponse.json({ success: true, vibe });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to submit vibe";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
