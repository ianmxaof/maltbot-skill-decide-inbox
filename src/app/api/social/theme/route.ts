/**
 * GET /api/social/theme?pairId=X — Get space theme
 * PUT /api/social/theme — Update space theme
 *
 * Body (PUT): { pairId: string, ...updates }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSpaceTheme, setSpaceTheme } from "@/lib/social-store";

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
    const pairId = typeof body.pairId === "string" ? body.pairId.trim() : "";

    if (!pairId) {
      return NextResponse.json(
        { success: false, error: "Missing pairId" },
        { status: 400 }
      );
    }

    // Extract valid theme fields
    const {
      accentColor, backgroundStyle, gradientFrom, gradientTo,
      headerImage, layout, tagline, bioMarkdown,
      pinnedContextIds, featuredDecisionIds, customSections,
    } = body;

    const updates: Record<string, unknown> = {};
    if (accentColor !== undefined) updates.accentColor = accentColor;
    if (backgroundStyle !== undefined) updates.backgroundStyle = backgroundStyle;
    if (gradientFrom !== undefined) updates.gradientFrom = gradientFrom;
    if (gradientTo !== undefined) updates.gradientTo = gradientTo;
    if (headerImage !== undefined) updates.headerImage = headerImage;
    if (layout !== undefined) updates.layout = layout;
    if (tagline !== undefined) updates.tagline = tagline;
    if (bioMarkdown !== undefined) updates.bioMarkdown = bioMarkdown;
    if (pinnedContextIds !== undefined) updates.pinnedContextIds = pinnedContextIds;
    if (featuredDecisionIds !== undefined) updates.featuredDecisionIds = featuredDecisionIds;
    if (customSections !== undefined) updates.customSections = customSections;

    const theme = await setSpaceTheme(pairId, updates);
    return NextResponse.json({ success: true, theme });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update theme";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
