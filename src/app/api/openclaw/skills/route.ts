import { NextResponse } from "next/server";
import { getSkills } from "@/lib/openclaw";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

export async function GET() {
  const result = await getSkills();
  if (!result.ok) {
    const status = result.error.error.code === OPENCLAW_ERROR_CODES.NOT_FOUND ? 503 : 502;
    return NextResponse.json(result.error, { status });
  }
  return NextResponse.json({ ok: true, skills: result.skills });
}
