/**
 * GET /api/social/space/[pairId] — Get public space data for a pair
 *
 * Returns theme, visibility-filtered data, fingerprint summary, recent activity,
 * badges, milestones, and follower/following counts.
 * Optional query: viewerPairId (to include alignment score with viewer)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSpaceTheme,
  getVisibilitySettings,
  getNetworkActivity,
  getFollowersOf,
  getFollowingBy,
  isFollowing,
  getGovernanceFingerprint,
  getAlignmentBetween,
  getAlignmentScores,
} from "@/lib/social-store";
import { summarizeFingerprint } from "@/lib/alignment-engine";
import { getPairById } from "@/lib/agent-pair-store";
import { computeBadges, computeMilestones } from "@/lib/badges-engine";
import { computeWidgetData } from "@/lib/widget-data-engine";
import { getDefaultWidgets } from "@/data/widget-definitions";
import { getVibeCheckSummary } from "@/lib/vibe-check-store";
import { getGuestbookEntries } from "@/lib/guestbook-store";
import { getQuestions } from "@/lib/question-store";
import { computeMutualSignals } from "@/lib/mutual-signals";
import { buildConstellation } from "@/lib/topic-constellation";
import type { PublicSpace, PublicPairInfo, AlignmentCircleNode } from "@/types/social";

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

    // Get theme, visibility, followers, following, badges, milestones in parallel
    const [theme, visibility, followers, following, badges, milestones] = await Promise.all([
      getSpaceTheme(pairId),
      getVisibilitySettings(pairId),
      getFollowersOf(pairId),
      getFollowingBy(pairId),
      computeBadges(pair),
      computeMilestones(pair),
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
      followingCount: following.length,
      isFollowedByViewer: viewerIsFollowing,
    };

    // Get recent activity (public only if not following)
    const recentActivity = await getNetworkActivity({
      pairId,
      limit: 20,
    });

    // Get fingerprint (raw + summary) if public
    const rawFingerprint = visibility.governanceFingerprint === "public"
      ? await getGovernanceFingerprint(pairId)
      : null;
    const fingerprint = rawFingerprint ? summarizeFingerprint(rawFingerprint) : undefined;

    // Get alignment with viewer if applicable
    let alignmentWithViewer;
    if (viewerPairId && viewerPairId !== pairId) {
      alignmentWithViewer = await getAlignmentBetween(viewerPairId, pairId) ?? undefined;
    }

    // Compute widget data, vibe checks, guestbook, questions, alignment circle, and topic constellation
    const widgets = theme.widgets ?? getDefaultWidgets();

    const [widgetData, vibeChecks, guestbook, questions, alignmentScores] = await Promise.all([
      computeWidgetData(pair, widgets),
      getVibeCheckSummary(pairId, viewerPairId || undefined),
      getGuestbookEntries(pairId, {
        includeHidden: viewerPairId === pairId,
        limit: 20,
      }),
      getQuestions(pairId, { includeAll: viewerPairId === pairId }),
      getAlignmentScores(pairId),
    ]);

    // Build alignment circle from top scored peers
    const alignmentCircle: AlignmentCircleNode[] = [];
    for (const as of alignmentScores.slice(0, 8)) {
      const peerId = as.pairAId === pairId ? as.pairBId : as.pairAId;
      const peerPair = await getPairById(peerId);
      if (!peerPair) continue;
      const peerTheme = await getSpaceTheme(peerId);
      alignmentCircle.push({
        pairId: peerId,
        name: `${peerPair.humanName} × ${peerPair.agentName}`,
        score: as.score,
        accentColor: peerTheme.accentColor || "#8b5cf6",
      });
    }

    // Topic constellation
    const topicConstellation = buildConstellation(pair, rawFingerprint);

    // Mutual signals (only if viewer is logged in and not self)
    let mutualSignals;
    if (viewerPairId && viewerPairId !== pairId) {
      const viewerPair = await getPairById(viewerPairId);
      if (viewerPair) {
        mutualSignals = computeMutualSignals(viewerPair, pair);
      }
    }

    const space: PublicSpace = {
      pair: pairInfo,
      theme: { ...theme, widgets },
      visibility,
      fingerprint,
      recentActivity,
      badges,
      milestones,
      widgetData,
      vibeChecks,
      guestbook,
      questions,
      mutualSignals,
      alignmentCircle,
      topicConstellation,
      alignmentWithViewer,
    };

    return NextResponse.json({ success: true, space });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get space";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
