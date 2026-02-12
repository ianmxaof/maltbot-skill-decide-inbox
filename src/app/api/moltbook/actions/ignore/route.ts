/**
 * POST /api/moltbook/actions/ignore
 * Mark a proposed social action as ignored (human said no).
 * Body: { id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { markIgnored } from "@/lib/moltbook-pending";

const IgnoreSchema = z.object({
  id: z.string().trim().min(1, "Missing id"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(IgnoreSchema, body);
    if (!parsed.ok) return parsed.response;
    const { id } = parsed.data;

    const item = await markIgnored(id);
    if (!item) {
      return NextResponse.json({ error: "Not found or already processed" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ignore failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
