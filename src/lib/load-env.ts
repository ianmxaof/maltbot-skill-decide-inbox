/**
 * Load .env.local. Used by the NextAuth API route so auth sees AUTH_* and
 * NEXTAUTH_URL. Returns a plain object so we avoid process.env (Next.js
 * inlines process.env at compile time, so the route never sees our values).
 * Uses only Node built-ins (no dotenv package).
 */
import path from "path";
import { readFileSync, existsSync } from "fs";

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/** Read .env.local and return env as a plain object (no process.env inlining). */
export function getEnvFromFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf-8");
  return parseEnvFile(content);
}

/** Also patch process.env for code that reads it (e.g. middleware). */
export function loadEnv(): void {
  const env = getEnvFromFile();
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
}

loadEnv();
