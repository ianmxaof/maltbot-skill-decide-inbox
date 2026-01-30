import { NextResponse } from "next/server";
import { getApprovals } from "@/lib/openclaw";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

/** OpenClaw approvals = exec allowlist, not Decide Inbox items. */
export async function POST() {
  const result = await getApprovals();
  if (!result.ok) {
    const status = result.error.error.code === OPENCLAW_ERROR_CODES.NOT_FOUND ? 503 : 502;
    return NextResponse.json(result.error, { status });
  }
  return NextResponse.json({ ok: true, raw: result.raw });
}
