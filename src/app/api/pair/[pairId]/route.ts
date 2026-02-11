/**
 * GET /api/pair/[pairId] — Get a single pair.
 * PATCH /api/pair/[pairId] — Update a pair.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPairById, updatePair } from "@/lib/agent-pair-store";
import type { UpdatePairInput } from "@/lib/agent-pair-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;
    const pair = await getPairById(pairId);
    if (!pair) {
      return NextResponse.json({ success: false, error: "Pair not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, pair });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get pair";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const input: UpdatePairInput = {};

    if (typeof body.humanName === "string") input.humanName = body.humanName;
    if (typeof body.agentName === "string") input.agentName = body.agentName;
    if (typeof body.operatingPhilosophy === "string") input.operatingPhilosophy = body.operatingPhilosophy as UpdatePairInput["operatingPhilosophy"];
    if (typeof body.visibility === "string") input.visibility = body.visibility as UpdatePairInput["visibility"];
    if (body.contextSources && typeof body.contextSources === "object") input.contextSources = body.contextSources as UpdatePairInput["contextSources"];
    if (typeof body.soulMd === "string") input.soulMd = body.soulMd;
    if (body.activityPattern) input.activityPattern = body.activityPattern as UpdatePairInput["activityPattern"];

    const pair = await updatePair(pairId, input);
    if (!pair) {
      return NextResponse.json({ success: false, error: "Pair not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, pair });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update pair";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
