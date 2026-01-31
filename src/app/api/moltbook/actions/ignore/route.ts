/**
 * POST /api/moltbook/actions/ignore
 * Mark a proposed social action as ignored (human said no).
 * Body: { id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { markIgnored } from "@/lib/moltbook-pending";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const item = markIgnored(id);
    if (!item) {
      return NextResponse.json({ error: "Not found or already processed" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ignore failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
