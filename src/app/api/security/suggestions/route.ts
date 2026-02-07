/**
 * GET /api/security/suggestions — List suggested guardrails from activity (learning loop).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuggestedGuardrails } from "@/lib/security/guardrail-suggestions";

export async function GET(req: NextRequest) {
  try {
    const hoursParam = req.nextUrl.searchParams.get("hours");
    const hours = hoursParam ? Math.min(168, Math.max(1, parseInt(hoursParam, 10) || 24)) : 24;
    const suggestions = await getSuggestedGuardrails(hours);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get suggestions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
