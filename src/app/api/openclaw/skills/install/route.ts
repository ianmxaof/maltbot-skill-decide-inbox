/**
 * POST /api/openclaw/skills/install
 * Install an OpenClaw skill by name.
 * Body: { name: string, installSlug?: string }
 * - name: display name (used for moltbook URL install)
 * - installSlug: ClawHub slug if different from name (e.g. "clawdbot-blogwatcher")
 */

import { NextRequest, NextResponse } from "next/server";
import { installSkill, installSkillViaClawHub } from "@/lib/openclaw";
import { addMaltbotInstalledSkill } from "@/lib/maltbot-installed-skills";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const installSlug = typeof body.installSlug === "string" ? body.installSlug.trim() : null;
    if (!name) {
      return NextResponse.json({ success: false, error: "Missing name" }, { status: 400 });
    }

    // Use explicit slug for ClawHub when provided (e.g. phantom-fdjtg, blogwatcher)
    const result = installSlug
      ? await installSkillViaClawHub(installSlug)
      : await installSkill(name);
    if (!result.ok) {
      const status =
        result.error.error.code === OPENCLAW_ERROR_CODES.NOT_FOUND ? 503 : 502;
      return NextResponse.json(
        { success: false, error: result.error.error.message },
        { status }
      );
    }
    // Use slug for ClawHub installs (folder name); name for URL installs (moltbook)
    await addMaltbotInstalledSkill(installSlug ?? name);
    return NextResponse.json({ success: true, message: "Skill installed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Install failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
