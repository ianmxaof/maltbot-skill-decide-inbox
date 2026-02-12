/**
 * GET /api/openclaw/env — read env keys (masked, never raw values)
 * POST /api/openclaw/env — set a key (body: { key, value })
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { readEnvMasked, setEnvKey } from "@/lib/openclaw-config";

const SetEnvSchema = z.object({
  key: z.string().trim().regex(/^[A-Z_][A-Z0-9_]*$/, "Invalid or missing key"),
  value: z.string().trim(),
});

export async function GET() {
  try {
    const keys = await readEnvMasked();
    return NextResponse.json({ success: true, keys });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read env";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(SetEnvSchema, body);
    if (!parsed.ok) return parsed.response;
    const { key, value } = parsed.data;

    await setEnvKey(key, value);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to set env";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
