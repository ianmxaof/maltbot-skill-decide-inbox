/**
 * GET /api/social/visibility?pairId=X — Get visibility settings
 * PUT /api/social/visibility — Update visibility settings
 *
 * Body (PUT): { pairId: string, ...updates }
 */

import { NextRequest, NextResponse } from "next/server";
import { getVisibilitySettings, setVisibilitySettings } from "@/lib/social-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId")?.trim() ?? "";

    if (!pairId) {
      return NextResponse.json(
        { success: false, error: "Missing pairId" },
        { status: 400 }
      );
    }

    const settings = await getVisibilitySettings(pairId);
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get visibility";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const pairId = typeof body.pairId === "string" ? body.pairId.trim() : "";

    if (!pairId) {
      return NextResponse.json(
        { success: false, error: "Missing pairId" },
        { status: 400 }
      );
    }

    // Extract only valid visibility fields
    const { contextSources, decisionPatterns, agentConfig, activityFeed, governanceFingerprint, signalFeeds, skills } = body;
    const updates: Record<string, unknown> = {};
    if (contextSources) updates.contextSources = contextSources;
    if (decisionPatterns) updates.decisionPatterns = decisionPatterns;
    if (agentConfig) updates.agentConfig = agentConfig;
    if (activityFeed) updates.activityFeed = activityFeed;
    if (governanceFingerprint) updates.governanceFingerprint = governanceFingerprint;
    if (signalFeeds) updates.signalFeeds = signalFeeds;
    if (skills) updates.skills = skills;

    const settings = await setVisibilitySettings(pairId, updates);
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update visibility";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
