/**
 * POST /api/openclaw/memory/init — ensure claude/ memory files exist with defaults
 */

import { NextResponse } from "next/server";
import { initMemoryFiles } from "@/lib/openclaw-memory";

export async function POST() {
  try {
    const { created } = await initMemoryFiles();
    return NextResponse.json({ success: true, created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to init memory";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
