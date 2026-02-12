/**
 * GET /api/social/visibility?pairId=X — Get visibility settings
 * PUT /api/social/visibility — Update visibility settings
 *
 * Body (PUT): { pairId: string, ...updates }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { getVisibilitySettings, setVisibilitySettings } from "@/lib/social-store";

const UpdateVisibilitySchema = z.object({
  pairId: z.string().trim().min(1, "Missing pairId"),
  contextSources: z.any().optional(),
  decisionPatterns: z.any().optional(),
  agentConfig: z.any().optional(),
  activityFeed: z.any().optional(),
  governanceFingerprint: z.any().optional(),
  signalFeeds: z.any().optional(),
  skills: z.any().optional(),
});

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
    const parsed = parseBody(UpdateVisibilitySchema, body);
    if (!parsed.ok) return parsed.response;

    const { pairId, ...rest } = parsed.data;

    // Extract only valid visibility fields (only include truthy values)
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value) updates[key] = value;
    }

    const settings = await setVisibilitySettings(pairId, updates);
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update visibility";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
