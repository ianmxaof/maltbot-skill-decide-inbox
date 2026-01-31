/**
 * POST /api/openclaw/agent/run
 * Sends a message to the OpenClaw agent. The agent interprets and executes.
 *
 * Body: { message: string, agentId?: string }
 *
 * Requires OpenClaw CLI + Gateway. Uses openclaw agent --message "..." .
 */

import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/openclaw";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message : "";
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : undefined;

    if (!message.trim()) {
      return NextResponse.json(
        { success: false, error: "message is required" },
        { status: 400 }
      );
    }

    const result = await runAgent(message, { agentId, json: false });

    if (!result.ok) {
      const err = result.error.error;
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      stdout: result.stdout,
      raw: result.raw,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent run failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
