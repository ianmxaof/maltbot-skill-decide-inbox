/**
 * POST /api/openclaw/agent/run
 * Sends a message to the OpenClaw agent. The agent interprets and executes.
 *
 * Body: { message: string, agentId?: string }
 *
 * Requires OpenClaw CLI + Gateway. Uses openclaw agent --message "..." .
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { runAgent } from "@/lib/openclaw";

const RunSchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  agentId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(RunSchema, body);
    if (!parsed.ok) return parsed.response;
    const { message, agentId } = parsed.data;

    const result = await runAgent(message, { agentId, json: false });

    if (!result.ok) {
      const err = result.error.error;
      const fullError = err.message ?? "Unknown error";
      // Log full error server-side for debugging
      console.error("[openclaw/agent/run] Agent failed:", fullError);
      return NextResponse.json(
        { success: false, error: fullError, code: err.code },
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
