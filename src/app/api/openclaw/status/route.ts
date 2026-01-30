import { NextResponse } from "next/server";
import { getStatus } from "@/lib/openclaw";
export async function GET() {
  const result = await getStatus();
  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.error.error.code === "OPENCLAW_NOT_FOUND" ? 503 : 502 });
  }
  return NextResponse.json({
    ok: true,
    raw: result.raw,
    version: result.version,
  });
}
