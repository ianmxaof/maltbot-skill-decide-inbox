/**
 * GET /api/social/space/[pairId] — Get public space data for a pair
 *
 * Returns theme, visibility-filtered data, fingerprint summary, recent activity.
 * Optional query: viewerPairId (to include alignment score with viewer)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSpaceTheme,
  getVisibilitySettings,
  getNetworkActivity,
  getFollowersOf,
  isFollowing,
  getGovernanceFingerprint,
  getAlignmentBetween,
} from "@/lib/social-store";
import { summarizeFingerprint } from "@/lib/alignment-engine";
import { getPairById } from "@/lib/agent-pair-store";
import type { PublicSpace, PublicPairInfo } from "@/types/social";

export async function GET(
  req: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;
    const url = new URL(req.url);
    const viewerPairId = url.searchParams.get("viewerPairId")?.trim();

    // Get pair info
    const pair = await getPairById(pairId);
    if (!pair) {
      return NextResponse.json(
        { success: false, error: "Pair not found" },
        { status: 404 }
      );
    }

    // Get theme and visibility
    const [theme, visibility, followers] = await Promise.all([
      getSpaceTheme(pairId),
      getVisibilitySettings(pairId),
      getFollowersOf(pairId),
    ]);

    // Build public pair info
    const viewerIsFollowing = viewerPairId
      ? await isFollowing(viewerPairId, pairId)
      : false;

    const pairInfo: PublicPairInfo = {
      id: pair.id,
      humanName: pair.humanName ?? "Unknown",
      agentName: pair.agentName ?? "Agent",
      tagline: theme.tagline || "",
      createdAt: pair.createdAt ?? new Date().toISOString(),
      followerCount: followers.length,
      isFollowedByViewer: viewerIsFollowing,
    };

    // Get recent activity (public only if not following)
    const recentActivity = await getNetworkActivity({
      pairId,
      limit: 20,
    });

    // Get fingerprint summary if public
    let fingerprint;
    if (visibility.governanceFingerprint === "public") {
      const fp = await getGovernanceFingerprint(pairId);
      if (fp) {
        fingerprint = summarizeFingerprint(fp);
      }
    }

    // Get alignment with viewer if applicable
    let alignmentWithViewer;
    if (viewerPairId && viewerPairId !== pairId) {
      alignmentWithViewer = await getAlignmentBetween(viewerPairId, pairId) ?? undefined;
    }

    const space: PublicSpace = {
      pair: pairInfo,
      theme,
      visibility,
      fingerprint,
      recentActivity,
      alignmentWithViewer,
    };

    return NextResponse.json({ success: true, space });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get space";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
