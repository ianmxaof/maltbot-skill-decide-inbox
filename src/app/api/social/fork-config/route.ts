/**
 * POST /api/social/fork-config — Fork another pair's configuration
 *
 * Copies context sources, autonomy tiers, and operating philosophy
 * from one pair to the requesting pair. Does NOT copy identity,
 * trust metrics, or private data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPairById, updatePair } from "@/lib/agent-pair-store";
import { getVisibilitySettings } from "@/lib/social-store";
import type { ContextSources } from "@/types/agent-pair";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourcePairId, targetPairId, options } = body;

    if (!sourcePairId || !targetPairId) {
      return NextResponse.json(
        { success: false, error: "sourcePairId and targetPairId required" },
        { status: 400 }
      );
    }

    if (sourcePairId === targetPairId) {
      return NextResponse.json(
        { success: false, error: "Cannot fork your own config" },
        { status: 400 }
      );
    }

    // Check source pair exists and is public
    const sourcePair = await getPairById(sourcePairId);
    if (!sourcePair) {
      return NextResponse.json(
        { success: false, error: "Source pair not found" },
        { status: 404 }
      );
    }

    const visibility = await getVisibilitySettings(sourcePairId);
    if (visibility.governanceFingerprint === "private") {
      return NextResponse.json(
        { success: false, error: "This pair's configuration is private" },
        { status: 403 }
      );
    }

    // Check target pair exists
    const targetPair = await getPairById(targetPairId);
    if (!targetPair) {
      return NextResponse.json(
        { success: false, error: "Your pair not found" },
        { status: 404 }
      );
    }

    // Build the forked config
    const forkContextSources = options?.contextSources !== false;
    const forkAutonomyTiers = options?.autonomyTiers !== false;
    const forkPhilosophy = options?.philosophy !== false;

    const updates: Record<string, unknown> = {};
    const forkedItems: string[] = [];

    if (forkContextSources) {
      // Merge context sources (add new, don't remove existing)
      const merged: ContextSources = {
        githubRepos: dedupe([
          ...(targetPair.contextSources.githubRepos ?? []),
          ...(sourcePair.contextSources.githubRepos ?? []),
        ]),
        githubUsers: dedupe([
          ...(targetPair.contextSources.githubUsers ?? []),
          ...(sourcePair.contextSources.githubUsers ?? []),
        ]),
        rssUrls: dedupe([
          ...(targetPair.contextSources.rssUrls ?? []),
          ...(sourcePair.contextSources.rssUrls ?? []),
        ]),
        moltbookTopics: dedupe([
          ...(targetPair.contextSources.moltbookTopics ?? []),
          ...(sourcePair.contextSources.moltbookTopics ?? []),
        ]),
      };
      updates.contextSources = merged;

      const newRepos = (sourcePair.contextSources.githubRepos ?? []).length;
      const newFeeds = (sourcePair.contextSources.rssUrls ?? []).length;
      forkedItems.push(`${newRepos} repos, ${newFeeds} feeds`);
    }

    if (forkAutonomyTiers) {
      updates.autonomyTiers = {
        tier1: dedupe([
          ...targetPair.autonomyTiers.tier1,
          ...sourcePair.autonomyTiers.tier1,
        ]),
        tier2: dedupe([
          ...targetPair.autonomyTiers.tier2,
          ...sourcePair.autonomyTiers.tier2,
        ]),
        tier3: dedupe([
          ...targetPair.autonomyTiers.tier3,
          ...sourcePair.autonomyTiers.tier3,
        ]),
      };
      forkedItems.push("autonomy tiers");
    }

    if (forkPhilosophy) {
      updates.operatingPhilosophy = sourcePair.operatingPhilosophy;
      forkedItems.push(`philosophy: ${sourcePair.operatingPhilosophy}`);
    }

    // Apply
    await updatePair(targetPairId, updates);

    return NextResponse.json({
      success: true,
      forked: forkedItems,
      message: `Config forked from ${sourcePair.humanName} × ${sourcePair.agentName}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fork config";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
