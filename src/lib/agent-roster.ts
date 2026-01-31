/**
 * Agent roster — stores agents the user has registered via the dashboard.
 * Persists to .data/agents.json (gitignored, contains API keys).
 *
 * For production, replace with a proper database and secrets manager.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export type RosterAgent = {
  id: string;
  name: string;
  apiKey: string;
  addedAt: string;
};

type RosterFile = {
  agents: RosterAgent[];
  version: number;
};

const ROSTER_PATH = path.join(process.cwd(), ".data", "agents.json");
const ROSTER_VERSION = 1;

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(ROSTER_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readRoster(): Promise<RosterFile> {
  try {
    const raw = await readFile(ROSTER_PATH, "utf-8");
    const data = JSON.parse(raw) as RosterFile;
    return data?.agents ? data : { agents: [], version: ROSTER_VERSION };
  } catch {
    return { agents: [], version: ROSTER_VERSION };
  }
}

async function writeRoster(data: RosterFile): Promise<void> {
  await ensureDataDir();
  await writeFile(ROSTER_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function nextId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function listAgents(): Promise<RosterAgent[]> {
  const { agents } = await readRoster();
  return agents;
}

/** Returns agent with full apiKey (server-only). */
export async function getAgentById(id: string): Promise<RosterAgent | null> {
  const agents = await listAgents();
  return agents.find((a) => a.id === id) ?? null;
}

/** Add agent to roster. */
export async function addAgent(name: string, apiKey: string): Promise<RosterAgent> {
  const roster = await readRoster();
  const existing = roster.agents.find((a) => a.name === name);
  if (existing) {
    existing.apiKey = apiKey;
    existing.addedAt = new Date().toISOString();
    await writeRoster(roster);
    return existing;
  }
  const agent: RosterAgent = {
    id: nextId(),
    name: name.trim(),
    apiKey: apiKey.trim(),
    addedAt: new Date().toISOString(),
  };
  roster.agents.push(agent);
  roster.version = ROSTER_VERSION;
  await writeRoster(roster);
  return agent;
}

export async function removeAgent(id: string): Promise<boolean> {
  const roster = await readRoster();
  const idx = roster.agents.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  roster.agents.splice(idx, 1);
  await writeRoster(roster);
  return true;
}

/** Get API key for an agent (server-only). */
export async function getApiKeyForAgent(id: string): Promise<string | null> {
  const agent = await getAgentById(id);
  return agent?.apiKey ?? null;
}
