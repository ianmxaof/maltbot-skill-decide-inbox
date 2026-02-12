/**
 * POST /api/social/follow — Follow a pair
 * DELETE /api/social/follow — Unfollow a pair
 * GET /api/social/follow?pairId=X — Get followers/following for a pair
 *
 * Body (POST/DELETE): { followerId: string, followingId: string }
 * Query (GET): pairId, direction=followers|following
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  addFollow,
  removeFollow,
  getFollowersOf,
  getFollowingBy,
  isFollowing,
} from "@/lib/social-store";

const FollowSchema = z
  .object({
    followerId: z.string().trim().min(1, "Missing followerId"),
    followingId: z.string().trim().min(1, "Missing followingId"),
  })
  .refine((d) => d.followerId !== d.followingId, {
    message: "Cannot follow yourself",
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(FollowSchema, body);
    if (!parsed.ok) return parsed.response;

    const { followerId, followingId } = parsed.data;

    const follow = await addFollow(followerId, followingId);
    return NextResponse.json({ success: true, follow });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Follow failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(FollowSchema, body);
    if (!parsed.ok) return parsed.response;

    const { followerId, followingId } = parsed.data;

    const removed = await removeFollow(followerId, followingId);
    return NextResponse.json({ success: true, removed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unfollow failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId")?.trim() ?? "";
    const direction = url.searchParams.get("direction") ?? "followers";
    const checkFollowerId = url.searchParams.get("checkFollower")?.trim();

    if (!pairId) {
      return NextResponse.json(
        { success: false, error: "Missing pairId" },
        { status: 400 }
      );
    }

    // Quick check: is a specific user following this pair?
    if (checkFollowerId) {
      const following = await isFollowing(checkFollowerId, pairId);
      return NextResponse.json({ success: true, isFollowing: following });
    }

    const items = direction === "following"
      ? await getFollowingBy(pairId)
      : await getFollowersOf(pairId);

    return NextResponse.json({
      success: true,
      direction,
      pairId,
      count: items.length,
      items,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get follows";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
