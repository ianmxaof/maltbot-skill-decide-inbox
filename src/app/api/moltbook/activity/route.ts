/**
 * GET /api/moltbook/activity
 * Aggregates feed from all roster agents for use in Signal Feeds, Context Hub.
 * Returns posts with source info. Only tags posts that are actually BY your agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMoltbookActivityPosts } from "@/lib/moltbook-activity";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const { posts, rosterCount } = await getMoltbookActivityPosts(limit);
  return NextResponse.json({ posts, rosterCount });
}
