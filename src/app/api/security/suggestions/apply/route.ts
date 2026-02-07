/**
 * POST /api/security/suggestions/apply — Apply a suggested rule. Body: { id?: string; suggestion: SuggestedRule }.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSuggestedGuardrails,
  applySuggestedRule,
  type SuggestedRule,
} from "@/lib/security/guardrail-suggestions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let suggestion: SuggestedRule | null = null;
    if (body.suggestion && typeof body.suggestion === "object") {
      suggestion = body.suggestion as SuggestedRule;
    } else if (typeof body.id === "string") {
      const all = await getSuggestedGuardrails(24);
      suggestion = all.find((s) => s.id === body.id) ?? null;
    }
    if (!suggestion) {
      return NextResponse.json(
        { error: "suggestion object or id required" },
        { status: 400 }
      );
    }
    await applySuggestedRule(suggestion);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to apply suggestion";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
