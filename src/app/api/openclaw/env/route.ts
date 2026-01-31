/**
 * GET /api/openclaw/env — read env keys (masked, never raw values)
 * POST /api/openclaw/env — set a key (body: { key, value })
 */

import { NextRequest, NextResponse } from "next/server";
import { readEnvMasked, setEnvKey } from "@/lib/openclaw-config";

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
    const key = typeof body.key === "string" ? body.key.trim() : "";
    const value = typeof body.value === "string" ? body.value.trim() : "";
    if (!key || !/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing key" },
        { status: 400 }
      );
    }
    await setEnvKey(key, value);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to set env";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
