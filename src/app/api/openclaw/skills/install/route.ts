/**
 * POST /api/openclaw/skills/install
 * Install an OpenClaw skill by name.
 * Body: { name: string, installSlug?: string }
 * - name: display name (used for moltbook URL install)
 * - installSlug: ClawHub slug if different from name (e.g. "clawdbot-blogwatcher")
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { installSkill, installSkillViaClawHub } from "@/lib/openclaw";
import { addMaltbotInstalledSkill } from "@/lib/maltbot-installed-skills";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

const InstallSchema = z.object({
  name: z.string().trim().min(1, "Missing name"),
  installSlug: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(InstallSchema, body);
    if (!parsed.ok) return parsed.response;
    const { name, installSlug } = parsed.data;

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
