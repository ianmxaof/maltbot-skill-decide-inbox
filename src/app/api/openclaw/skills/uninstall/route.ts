/**
 * POST /api/openclaw/skills/uninstall
 * Uninstall an OpenClaw skill by name.
 * Body: { name: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { uninstallSkill } from "@/lib/openclaw";
import { removeMaltbotInstalledSkill } from "@/lib/maltbot-installed-skills";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "Missing name" }, { status: 400 });
    }

    const result = await uninstallSkill(name);
    if (!result.ok) {
      const status =
        result.error.error.code === OPENCLAW_ERROR_CODES.NOT_FOUND ? 503 : 502;
      return NextResponse.json(
        { success: false, error: result.error.error.message },
        { status }
      );
    }
    await removeMaltbotInstalledSkill(name);
    return NextResponse.json({ success: true, message: "Skill uninstalled" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Uninstall failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
