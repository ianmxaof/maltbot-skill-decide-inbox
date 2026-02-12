/**
 * GET  /api/digest              — Get latest daily digest
 * GET  /api/digest?history=1    — Get digest history
 * POST /api/digest              — Generate a new digest now (morning briefing)
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDailyDigest, getLatestDigest, getDigestHistory } from "@/lib/daily-digest";
import { getActivePairId } from "@/lib/agent-pair-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get("pairId") ?? await getActivePairId();

    if (searchParams.get("history") === "1") {
      const limit = parseInt(searchParams.get("limit") ?? "7", 10);
      const history = await getDigestHistory(pairId, limit);
      return NextResponse.json({ digests: history });
    }

    const latest = await getLatestDigest(pairId);
    if (!latest) {
      return NextResponse.json({ digest: null, message: "No digest generated yet" });
    }

    return NextResponse.json({ digest: latest });
  } catch (error) {
    console.error("[API] digest GET:", error);
    return NextResponse.json({ error: "Failed to get digest" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pairId = (body.pairId as string) ?? await getActivePairId();

    const digest = await generateDailyDigest(pairId);

    return NextResponse.json({ digest });
  } catch (error) {
    console.error("[API] digest POST:", error);
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}
