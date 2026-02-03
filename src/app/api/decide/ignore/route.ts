/**
 * POST /api/decide/ignore
 * Mark a proposed action as ignored. Routes by store:
 * - moltbook-pending -> markIgnored
 * - decide-pending (dev) -> markIgnoredDev
 *
 * Body: { id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { markIgnored } from "@/lib/moltbook-pending";
import { getPendingDev, markIgnoredDev } from "@/lib/decide-pending";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    // Dev action
    const devItem = getPendingDev(id);
    if (devItem) {
      markIgnoredDev(id);
      return NextResponse.json({ success: true });
    }

    // Social action
    const item = await markIgnored(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Not found or already processed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ignore failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
