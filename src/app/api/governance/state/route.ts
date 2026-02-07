/**
 * GET /api/governance/state — Return current system state (MET switch).
 * POST /api/governance/state — Set mode (halt/resume). Body: { mode, haltReason?, haltedBy? }.
 */

import { NextRequest, NextResponse } from "next/server";
import { loadSystemState, setSystemState } from "@/lib/system-state";

export async function GET() {
  try {
    const state = await loadSystemState();
    return NextResponse.json(state);
  } catch (e) {
    console.error("[governance/state] GET:", e);
    return NextResponse.json(
      { error: "Failed to load system state" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode as string | undefined;
    if (!mode || !["active", "supervised", "halted"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Use active, supervised, or halted." },
        { status: 400 }
      );
    }
    const state = await setSystemState({
      mode: mode as "active" | "supervised" | "halted",
      haltReason: body.haltReason as string | undefined,
      haltedBy: body.haltedBy as string | undefined,
    });
    return NextResponse.json(state);
  } catch (e) {
    console.error("[governance/state] POST:", e);
    return NextResponse.json(
      { error: "Failed to save system state" },
      { status: 500 }
    );
  }
}
