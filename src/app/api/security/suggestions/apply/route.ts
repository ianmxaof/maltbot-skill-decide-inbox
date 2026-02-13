/**
 * POST /api/security/suggestions/apply — Apply a suggested rule. Body: { id?: string; suggestion: SuggestedRule }.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  getSuggestedGuardrails,
  applySuggestedRule,
  type SuggestedRule,
} from "@/lib/security/guardrail-suggestions";

const ApplySuggestionSchema = z.object({
  id: z.string().optional(),
  suggestion: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => data.id !== undefined || data.suggestion !== undefined,
  { message: "suggestion object or id required" }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(ApplySuggestionSchema, body);
    if (!parsed.ok) return parsed.response;

    const { id, suggestion: suggestionObj } = parsed.data;

    let suggestion: SuggestedRule | null = null;
    if (suggestionObj && typeof suggestionObj === "object") {
      suggestion = suggestionObj as SuggestedRule;
    } else if (typeof id === "string") {
      const all = await getSuggestedGuardrails(24);
      suggestion = all.find((s) => s.id === id) ?? null;
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
