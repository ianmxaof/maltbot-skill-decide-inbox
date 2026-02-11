/**
 * GET /api/discover — Public pairs for discovery feed.
 * Enriches each pair with theme data (tagline, accentColor) when available.
 */

import { NextResponse } from "next/server";
import { getPublicPairs } from "@/lib/agent-pair-store";
import { getSpaceTheme } from "@/lib/social-store";

export async function GET() {
  try {
    const pairs = await getPublicPairs();

    // Enrich with theme data so Discover cards have taglines + accent colors
    const enriched = await Promise.all(
      pairs.map(async (p) => {
        try {
          const theme = await getSpaceTheme(p.id);
          return {
            ...p,
            tagline: theme.tagline || undefined,
            accentColor: theme.accentColor || undefined,
          };
        } catch {
          return p;
        }
      })
    );

    return NextResponse.json({ success: true, pairs: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get discover pairs";
    return NextResponse.json({ success: false, error: msg, pairs: [] }, { status: 500 });
  }
}
