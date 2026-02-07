/**
 * OpenClaw file-based memory (claude/ directory).
 * identity.md, soul.md, user.md, memory.md, heartbeat.md + claude/memory/ for daily notes.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { OPENCLAW_DIR } from "./openclaw-config";

export const CLAUD_DIR = path.join(OPENCLAW_DIR, "claude");
export const MEMORY_SUBDIR = path.join(CLAUD_DIR, "memory");

export const MEMORY_FILES = {
  identity: path.join(CLAUD_DIR, "identity.md"),
  soul: path.join(CLAUD_DIR, "soul.md"),
  user: path.join(CLAUD_DIR, "user.md"),
  memory: path.join(CLAUD_DIR, "memory.md"),
  heartbeat: path.join(CLAUD_DIR, "heartbeat.md"),
} as const;

export type MemoryFileType = keyof typeof MEMORY_FILES;

const DEFAULT_IDENTITY = `# Identity
- name: OpenClaw
- vibe: Helpful assistant with opinions
- emoji: 🤖
`;

const DEFAULT_SOUL = `# Soul (Personality + Voice + Values)

## Core Truths
- Be genuinely helpful
- Have opinions (not neutral on everything)
- Be resourceful before asking clarifying questions
- Earn trust through competence
- Remember you are a guest (in user's digital life)

## Voice
- Direct and honest
- Contradicts/critiques when warranted
- No AI slop words: [configurable blocklist]
- No AI slop phrases: [configurable blocklist]
- Active voice preferred
- Minimize hedging
- Avoid grandiose claims
- Emoji usage: minimal

## Custom Instructions
[User-defined instructions imported here]
`;

const DEFAULT_USER = `# User Profile
- Current situation
- Goals
- Energy sources (what energizes vs drains)
- Preferences
- Context from connected services
`;

const DEFAULT_MEMORY = `# Long-Term Memory

## Personal Context
[Curated facts about user]

## Connected Services
[List of what bot has access to + permission level]
- Google Workspace: [read/write scope]
- GitHub: [scope]
- Twitter/X: [read-only recommended]
- etc.

## Open Loops
[Commitments/mentions that haven't been resolved]

## Tensions
[Contradictions or gaps worth surfacing to user]

## Patterns
[Behavioral patterns noticed over time]
`;

const DEFAULT_HEARTBEAT = `# Heartbeat (Checked every 30 minutes)
[Ongoing tasks, scheduled checks, cron-like jobs]
`;

function defaultContent(type: MemoryFileType): string {
  switch (type) {
    case "identity":
      return DEFAULT_IDENTITY;
    case "soul":
      return DEFAULT_SOUL;
    case "user":
      return DEFAULT_USER;
    case "memory":
      return DEFAULT_MEMORY;
    case "heartbeat":
      return DEFAULT_HEARTBEAT;
    default:
      return "";
  }
}

/** Ensure claude/ and claude/memory/ exist */
export async function ensureMemoryDirs(): Promise<void> {
  await fs.mkdir(CLAUD_DIR, { recursive: true });
  await fs.mkdir(MEMORY_SUBDIR, { recursive: true });
}

/** Read a memory file; return default content if missing */
export async function readMemoryFile(type: MemoryFileType): Promise<string> {
  await ensureMemoryDirs();
  const filePath = MEMORY_FILES[type];
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultContent(type);
    }
    throw e;
  }
}

/** Write a memory file */
export async function writeMemoryFile(
  type: MemoryFileType,
  content: string
): Promise<void> {
  await ensureMemoryDirs();
  const filePath = MEMORY_FILES[type];
  await fs.writeFile(filePath, content, "utf8");
}

/** Parsed identity (name, vibe, emoji) */
export interface IdentityData {
  name: string;
  vibe: string;
  emoji: string;
}

function parseIdentityMarkdown(raw: string): IdentityData {
  const name = raw.match(/- name:\s*(.+)/)?.[1]?.trim() ?? "";
  const vibe = raw.match(/- vibe:\s*(.+)/)?.[1]?.trim() ?? "";
  const emoji = raw.match(/- emoji:\s*(.+)/)?.[1]?.trim() ?? "";
  return { name, vibe, emoji };
}

function identityToMarkdown(data: IdentityData): string {
  return `# Identity
- name: ${data.name || "[bot name]"}
- vibe: ${data.vibe || "[personality descriptor]"}
- emoji: ${data.emoji || "[optional identifier]"}
`;
}

export async function getIdentity(): Promise<IdentityData> {
  const raw = await readMemoryFile("identity");
  return parseIdentityMarkdown(raw);
}

export async function setIdentity(data: IdentityData): Promise<void> {
  await writeMemoryFile("identity", identityToMarkdown(data));
}

export async function getSoul(): Promise<string> {
  return readMemoryFile("soul");
}

export async function setSoul(content: string): Promise<void> {
  await writeMemoryFile("soul", content);
}

export async function getUserProfile(): Promise<string> {
  return readMemoryFile("user");
}

export async function setUserProfile(content: string): Promise<void> {
  await writeMemoryFile("user", content);
}

export async function getLongTermMemory(): Promise<string> {
  return readMemoryFile("memory");
}

export async function setLongTermMemory(content: string): Promise<void> {
  await writeMemoryFile("memory", content);
}

export async function getHeartbeatConfig(): Promise<string> {
  return readMemoryFile("heartbeat");
}

export async function setHeartbeatConfig(content: string): Promise<void> {
  await writeMemoryFile("heartbeat", content);
}

/** Daily note path: claude/memory/YYYY-MM-DD.md */
export function dailyNotePath(date: string): string {
  return path.join(MEMORY_SUBDIR, `${date}.md`);
}

export async function readDailyNote(date: string): Promise<string | null> {
  await ensureMemoryDirs();
  const filePath = dailyNotePath(date);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function writeDailyNote(
  date: string,
  content: string
): Promise<void> {
  await ensureMemoryDirs();
  await fs.writeFile(dailyNotePath(date), content, "utf8");
}

const DAILY_NOTE_REGEX = /^\d{4}-\d{2}-\d{2}\.md$/;

/** List dates that have daily notes (YYYY-MM-DD), newest first */
export async function listDailyNotes(): Promise<string[]> {
  await ensureMemoryDirs();
  const entries = await fs.readdir(MEMORY_SUBDIR);
  const dates = entries
    .filter((e) => DAILY_NOTE_REGEX.test(e))
    .map((e) => e.slice(0, -3))
    .sort()
    .reverse();
  return dates;
}

/** Create all memory files with defaults if they don't exist */
export async function initMemoryFiles(): Promise<{ created: MemoryFileType[] }> {
  await ensureMemoryDirs();
  const created: MemoryFileType[] = [];
  for (const type of Object.keys(MEMORY_FILES) as MemoryFileType[]) {
    const filePath = MEMORY_FILES[type];
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, defaultContent(type), "utf8");
      created.push(type);
    }
  }
  return { created };
}
