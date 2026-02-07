/**
 * POST /api/executor/execute — Execute a pending action via PowerCoreExecutor (default: Moltbook).
 * Body: { id: string; approvedBy?: string; adapter?: "moltbook" }
 */

import { NextRequest, NextResponse } from "next/server";
import { runExecute } from "@/lib/executor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }
    const result = await runExecute({
      id,
      approvedBy: typeof body.approvedBy === "string" ? body.approvedBy : undefined,
      adapter: typeof body.adapter === "string" ? body.adapter : undefined,
    });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Execute failed" },
        { status: result.error?.includes("not authorized") ? 403 : result.error?.includes("not found") ? 404 : 502 }
      );
    }
    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Execute failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
