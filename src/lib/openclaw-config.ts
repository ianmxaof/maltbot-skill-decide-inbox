/**
 * OpenClaw config and env helpers.
 * Resolves paths for ~/.openclaw/ (or OPENCLAW_STATE_DIR).
 * Never exposes raw API keys to clients.
 */

import * as fs from "fs/promises";
import * as path from "path";

export const OPENCLAW_DIR =
  process.env.OPENCLAW_STATE_DIR ||
  path.join(
    process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || "",
    ".openclaw"
  );

export const CONFIG_PATH = path.join(OPENCLAW_DIR, "openclaw.json");
export const CLAWDBOT_CONFIG_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".clawdbot",
  "clawdbot.json"
);
export const ENV_PATH = path.join(OPENCLAW_DIR, ".env");

function mask(value: string): string {
  if (!value || value.length < 8) return "***";
  return value.slice(0, 4) + "..." + value.slice(-4);
}

export type EnvKey = { name: string; masked: string; hasValue: boolean };

/** Read .env and return masked keys (never raw values) */
export async function readEnvMasked(): Promise<EnvKey[]> {
  const known = [
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
    "BRAVE_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "GROQ_API_KEY",
    "ZAI_API_KEY",
  ];
  const result: EnvKey[] = [];
  try {
    const raw = await fs.readFile(ENV_PATH, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    const seen = new Set<string>();
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const [, key, val] = m;
        const value = (val ?? "").replace(/^["']|["']$/g, "").trim();
        seen.add(key);
        result.push({
          name: key,
          masked: value ? mask(value) : "",
          hasValue: Boolean(value),
        });
      }
    }
    for (const k of known) {
      if (!seen.has(k))
        result.push({ name: k, masked: "", hasValue: false });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return known.map((name) => ({ name, masked: "", hasValue: false }));
    throw e;
  }
}

/** Get the raw value of an env key (server-side only) */
export async function getEnvKeyRaw(key: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(ENV_PATH, "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === key) {
        return (m[2] ?? "").replace(/^["']|["']$/g, "").trim() || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Update or append a key in .env */
export async function setEnvKey(key: string, value: string): Promise<void> {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key))
    throw new Error("Invalid env key");
  let content = "";
  try {
    content = await fs.readFile(ENV_PATH, "utf8");
  } catch {
    await fs.mkdir(OPENCLAW_DIR, { recursive: true });
  }
  const lines = content.split(/\r?\n/);
  const escaped = value.includes(" ") || value.includes("#")
    ? `"${value.replace(/"/g, '\\"')}"`
    : value;
  let found = false;
  const re = new RegExp(`^(${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*=`);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      lines[i] = `${key}=${escaped}`;
      found = true;
      break;
    }
  }
  if (!found) lines.push(`${key}=${escaped}`);
  await fs.writeFile(ENV_PATH, lines.join("\n") + "\n", "utf8");
}

/** Read openclaw.json (or clawdbot.json fallback) */
export async function readConfig(): Promise<{
  config: Record<string, unknown>;
  hash?: string;
}> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf8");
    const config = JSON.parse(content) as Record<string, unknown>;
    return { config };
  } catch {
    try {
      const content = await fs.readFile(CLAWDBOT_CONFIG_PATH, "utf8");
      const config = JSON.parse(content) as Record<string, unknown>;
      return { config };
    } catch {
      return { config: {} };
    }
  }
}

/** Merge and write config. Does not validate against OpenClaw schema. */
export async function patchConfig(
  partial: Record<string, unknown>
): Promise<void> {
  const { config } = await readConfig();
  const merged = deepMerge(config, partial);
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(
    CONFIG_PATH,
    JSON.stringify(merged, null, 2),
    "utf8"
  );
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...target };
  for (const k of Object.keys(source)) {
    const src = source[k];
    if (src === null) {
      delete out[k];
      continue;
    }
    if (
      typeof src === "object" &&
      !Array.isArray(src) &&
      src !== null &&
      typeof target[k] === "object" &&
      !Array.isArray(target[k]) &&
      target[k] !== null
    ) {
      out[k] = deepMerge(
        target[k] as Record<string, unknown>,
        src as Record<string, unknown>
      );
    } else {
      out[k] = src;
    }
  }
  return out;
}
