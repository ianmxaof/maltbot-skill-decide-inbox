/**
 * GET /api/network/groups — List all emergent groups
 * POST /api/network/groups — Claim / update a group
 *
 * Query (GET): pairId (optional — filter to groups this pair belongs to)
 * Body (POST): { groupId, claimerPairId, name?, description? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { getGroups, getGroupsForPair } from "@/lib/network-store";
import { claimGroup } from "@/lib/group-engine";

const ClaimGroupSchema = z.object({
  groupId: z.string().trim().min(1, "Missing groupId"),
  claimerPairId: z.string().trim().min(1, "Missing claimerPairId"),
  name: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId")?.trim();

    const groups = pairId ? await getGroupsForPair(pairId) : await getGroups();

    return NextResponse.json({
      success: true,
      groups,
      count: groups.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get groups";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(ClaimGroupSchema, body);
    if (!parsed.ok) return parsed.response;

    const { groupId, claimerPairId, name, description } = parsed.data;

    const group = await claimGroup(groupId, claimerPairId, name, description);

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found or you are not a member" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, group });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update group";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
