/**
 * GET /api/security/trust-scores — List trust score entries (for Security UI).
 */

import { NextResponse } from "next/server";
import { getTrustScores } from "@/lib/security/trust-scoring";

export async function GET() {
  try {
    const scores = await getTrustScores();
    return NextResponse.json({ success: true, scores });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load trust scores";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
