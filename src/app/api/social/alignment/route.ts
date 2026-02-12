/**
 * GET /api/social/alignment?pairId=X — Get alignment scores for a pair
 * POST /api/social/alignment/recompute — Recompute all alignment scores
 *
 * Query (GET): pairId (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { getAlignmentScores } from "@/lib/social-store";
import { computeAlignmentForPair, recomputeAllAlignments } from "@/lib/alignment-engine";

const AlignmentPostSchema = z.object({
  pairId: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId")?.trim() ?? "";
    const recompute = url.searchParams.get("recompute") === "true";

    if (!pairId) {
      return NextResponse.json(
        { success: false, error: "Missing pairId" },
        { status: 400 }
      );
    }

    // Optionally recompute for this pair before returning
    if (recompute) {
      const scores = await computeAlignmentForPair(pairId);
      return NextResponse.json({ success: true, scores, recomputed: true });
    }

    const scores = await getAlignmentScores(pairId);
    return NextResponse.json({ success: true, scores });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get alignment";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseBody(AlignmentPostSchema, body);
    if (!parsed.ok) return parsed.response;

    const { pairId } = parsed.data;

    // If pairId given, compute for that pair only
    if (pairId) {
      const scores = await computeAlignmentForPair(pairId);
      return NextResponse.json({ success: true, count: scores.length, scores });
    }

    // Otherwise, recompute all
    const count = await recomputeAllAlignments();
    return NextResponse.json({ success: true, count, message: "All alignments recomputed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to recompute alignment";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
