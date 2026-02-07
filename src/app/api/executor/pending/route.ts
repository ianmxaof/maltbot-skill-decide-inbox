/**
 * GET /api/executor/pending — List pending items via PowerCoreExecutor (default: Moltbook).
 * Query: ?adapter=moltbook
 */

import { NextRequest, NextResponse } from "next/server";
import { listPending } from "@/lib/executor";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adapter = searchParams.get("adapter") ?? undefined;
    const result = await listPending(adapter ?? undefined);
    if (!result.success) {
      return NextResponse.json(
        { success: false, items: [], error: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, items: result.items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "List pending failed";
    return NextResponse.json({ success: false, items: [], error: msg }, { status: 500 });
  }
}
