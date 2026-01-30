import { NextResponse } from "next/server";
import { getSessions } from "@/lib/openclaw";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

/** Returns minimal sessions shape; no conversion to Context Hub Project[]. */
export async function GET() {
  const result = await getSessions();
  if (!result.ok) {
    const status = result.error.error.code === OPENCLAW_ERROR_CODES.NOT_FOUND ? 503 : 502;
    return NextResponse.json(result.error, { status });
  }
  return NextResponse.json({ ok: true, sessions: result.sessions });
}
