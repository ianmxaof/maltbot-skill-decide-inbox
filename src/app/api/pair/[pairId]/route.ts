/**
 * GET /api/pair/[pairId] — Get a single pair.
 * PATCH /api/pair/[pairId] — Update a pair.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { getPairById, updatePair } from "@/lib/agent-pair-store";
import type { UpdatePairInput } from "@/lib/agent-pair-store";

const UpdatePairSchema = z.object({
  humanName: z.string().optional(),
  agentName: z.string().optional(),
  operatingPhilosophy: z
    .enum(["ship-while-sleep", "review-before-deploy", "collaborative", "research-only"])
    .optional(),
  visibility: z.enum(["private", "unlisted", "public"]).optional(),
  contextSources: z
    .object({
      githubRepos: z.array(z.string()).optional(),
      githubUsers: z.array(z.string()).optional(),
      rssUrls: z.array(z.string()).optional(),
      moltbookTopics: z.array(z.string()).optional(),
    })
    .optional(),
  soulMd: z.string().optional(),
  activityPattern: z.any().optional(),
});

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
    const body = await req.json();
    const parsed = parseBody(UpdatePairSchema, body);
    if (!parsed.ok) return parsed.response;

    const input: UpdatePairInput = parsed.data;

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
