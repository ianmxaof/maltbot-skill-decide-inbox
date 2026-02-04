import { NextResponse } from "next/server";
import { getSkills, getSkillsFromFilesystem } from "@/lib/openclaw";
import { getMaltbotInstalledSkills } from "@/lib/maltbot-installed-skills";
import { OPENCLAW_ERROR_CODES } from "@/types/api";

function toSkillCard(name: string, id: number) {
  return {
    id: `maltbot-${name}-${id}`,
    name,
    description: "Installed via Maltbot",
    authorId: "maltbot",
    authorName: "Maltbot",
    authorReputation: "community" as const,
    dependencyRiskScore: 50,
    hasDryRun: false,
    status: "ready" as const,
    source: "filesystem",
  };
}

export async function GET() {
  // Get skills from OpenClaw CLI
  const result = await getSkills();
  let skills = result.ok ? result.skills : [];

  const listedNames = new Set(skills.map((s) => s.name.toLowerCase()));

  // Merge in skills from Maltbot's install tracker (most reliable)
  const maltbotInstalled = await getMaltbotInstalledSkills();
  for (let i = 0; i < maltbotInstalled.length; i++) {
    const name = maltbotInstalled[i];
    if (name && !listedNames.has(name.toLowerCase())) {
      skills = [...skills, toSkillCard(name, i)];
      listedNames.add(name.toLowerCase());
    }
  }

  // Also merge from filesystem scan (backup for skills installed outside Maltbot)
  const fsSkills = getSkillsFromFilesystem();
  for (const fs of fsSkills) {
    if (!listedNames.has(fs.name.toLowerCase())) {
      skills = [...skills, { ...fs, status: "ready" as const }];
      listedNames.add(fs.name.toLowerCase());
    }
  }

  // Ensure Maltbot-installed skills have status "ready" so they appear in Installed tab
  const maltbotInstalledLower = new Set(maltbotInstalled.map((n) => n.toLowerCase()));
  skills = skills.map((s) => {
    if (maltbotInstalledLower.has((s.name ?? "").toLowerCase())) {
      return { ...s, status: "ready" as const };
    }
    return s;
  });

  if (!result.ok) {
    // OpenClaw failed; if we have Maltbot/FS skills, return those anyway
    if (skills.length > 0) {
      return NextResponse.json({ ok: true, skills });
    }
    const status = result.error.error.code === OPENCLAW_ERROR_CODES.NOT_FOUND ? 503 : 502;
    return NextResponse.json(result.error, { status });
  }
  return NextResponse.json(
    { ok: true, skills },
    { headers: { "Cache-Control": "no-store" } }
  );
}
