/**
 * Tracks skills installed via Maltbot UI.
 * Persists to .data/maltbot-installed-skills.json so installed skills
 * appear in the Installed tab even if OpenClaw CLI doesn't list them.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), ".data", "maltbot-installed-skills.json");

type InstalledSkills = {
  skills: string[];
  version: number;
};

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(FILE_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readFile_(): Promise<InstalledSkills> {
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw) as InstalledSkills;
    return data?.skills ? data : { skills: [], version: 1 };
  } catch {
    return { skills: [], version: 1 };
  }
}

export async function getMaltbotInstalledSkills(): Promise<string[]> {
  const data = await readFile_();
  return data.skills ?? [];
}

export async function addMaltbotInstalledSkill(name: string): Promise<void> {
  const data = await readFile_();
  const lower = name.toLowerCase().trim();
  if (!data.skills.some((s) => s.toLowerCase() === lower)) {
    data.skills.push(name.trim());
    await ensureDataDir();
    await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  }
}

export async function removeMaltbotInstalledSkill(name: string): Promise<void> {
  const data = await readFile_();
  const lower = name.toLowerCase().trim();
  data.skills = data.skills.filter((s) => s.toLowerCase() !== lower);
  await ensureDataDir();
  await writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}
