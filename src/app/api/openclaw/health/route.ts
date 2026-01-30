import { NextResponse } from "next/server";
import { getHealth } from "@/lib/openclaw";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

export async function GET() {
  const result = await getHealth();
  if (!result.ok) {
    const status = result.error.error.code === OPENCLAW_ERROR_CODES.GATEWAY_UNREACHABLE || result.error.error.code === OPENCLAW_ERROR_CODES.NOT_FOUND ? 503 : 502;
    return NextResponse.json(result.error, { status });
  }
  return NextResponse.json({ ok: true, data: result.data });
}
