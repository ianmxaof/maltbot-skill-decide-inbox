/**
 * GET /api/social/theme?pairId=X — Get space theme
 * PUT /api/social/theme — Update space theme
 *
 * Body (PUT): { pairId: string, ...updates }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { getSpaceTheme, setSpaceTheme } from "@/lib/social-store";

const UpdateThemeSchema = z.object({
  pairId: z.string().trim().min(1, "Missing pairId"),
  accentColor: z.string().optional(),
  backgroundStyle: z.string().optional(),
  gradientFrom: z.string().optional(),
  gradientTo: z.string().optional(),
  headerImage: z.string().optional(),
  layout: z.string().optional(),
  tagline: z.string().optional(),
  bioMarkdown: z.string().optional(),
  bulletin: z.string().optional(),
  bulletinUpdatedAt: z.string().optional(),
  pinnedContextIds: z.array(z.string()).optional(),
  featuredDecisionIds: z.array(z.string()).optional(),
  customSections: z.any().optional(),
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

    const theme = await getSpaceTheme(pairId);
    return NextResponse.json({ success: true, theme });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get theme";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(UpdateThemeSchema, body);
    if (!parsed.ok) return parsed.response;

    const { pairId, ...rest } = parsed.data;

    // Extract valid theme fields (only include defined values)
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) updates[key] = value;
    }

    const theme = await setSpaceTheme(pairId, updates);
    return NextResponse.json({ success: true, theme });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update theme";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
