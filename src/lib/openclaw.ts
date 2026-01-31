/**
 * OpenClaw adapter: CLI-only (HTTP optional later).
 * Whitelisted commands only; spawn/execFile; timeouts; safe errors.
 * Never expose raw stdout/stderr to client.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import type { ApiError } from "@/types/api";
import { OPENCLAW_ERROR_CODES, apiError } from "@/types/api";
import type { SkillCard } from "@/types/dashboard";

const execFileAsync = promisify(execFile);

const STATUS_TIMEOUT_MS = 5000;
const DEFAULT_TIMEOUT_MS = 15000;
/** Agent runs (LLM + tools) often take 30s–2min; use longer default */
const AGENT_TIMEOUT_MS = 120000;

function getCliPath(): string {
  return process.env.OPENCLAW_CLI_PATH ?? "openclaw";
}

function getTimeout(short: boolean): number {
  const env = process.env.OPENCLAW_CLI_TIMEOUT_MS;
  if (env != null) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return short ? STATUS_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

function getAgentTimeout(): number {
  const env = process.env.OPENCLAW_AGENT_TIMEOUT_MS;
  if (env != null) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return AGENT_TIMEOUT_MS;
}

type CliResult = { ok: true; stdout: string; stderr?: string } | { ok: false; error: ApiError };

/** On Windows, .cmd/.bat must be run with shell: true or execFile yields EINVAL */
function needsShell(cliPath: string): boolean {
  if (process.platform !== "win32") return false;
  const lower = cliPath.toLowerCase();
  return lower.endsWith(".cmd") || lower.endsWith(".bat");
}

async function runCli(
  args: string[],
  jsonOutput: boolean,
  shortTimeout: boolean,
  overrideTimeoutMs?: number
): Promise<CliResult> {
  const bin = getCliPath();
  const timeout = overrideTimeoutMs ?? getTimeout(shortTimeout);
  const maxBuffer = 2 * 1024 * 1024; // 2MB
  const useShell = needsShell(bin);

  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      timeout,
      maxBuffer,
      encoding: "utf8",
      shell: useShell,
    });
    return { ok: true, stdout: stdout ?? "", stderr: (stderr as string) ?? "" };
  } catch (err: unknown) {
    const e = err as { code?: string; signal?: string; killed?: boolean; message?: string };
    if (e.killed && (e.signal === "SIGTERM" || e.signal === "SIGKILL")) {
      return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.TIMEOUT, "OpenClaw command timed out") };
    }
    if (e.code === "ENOENT" || (e.message && e.message.includes("spawn openclaw ENOENT"))) {
      return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.NOT_FOUND, "OpenClaw CLI not found (not installed or not on PATH)") };
    }
    const message = e.message ?? String(e);
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, message.length > 200 ? message.slice(0, 200) + "…" : message) };
  }
}

/** Whitelisted commands: exact args only */
const WHITELIST: Record<string, { args: string[]; shortTimeout: boolean; json: boolean }> = {
  status: { args: ["status"], shortTimeout: true, json: false },
  "gateway-status": { args: ["gateway", "status", "--json"], shortTimeout: true, json: true },
  health: { args: ["health", "--json"], shortTimeout: false, json: true },
  sessions: { args: ["sessions", "--json"], shortTimeout: false, json: true },
  skills: { args: ["skills", "list"], shortTimeout: false, json: false },
  "approvals-get": { args: ["approvals", "get"], shortTimeout: false, json: false },
};

/** Optional: get OpenClaw version for status/health */
export async function getVersion(): Promise<{ ok: true; version: string } | { ok: false; error: ApiError }> {
  const bin = getCliPath();
  const timeout = 3000;
  try {
    const { stdout } = await execFileAsync(bin, ["--version"], {
      timeout,
      encoding: "utf8",
      maxBuffer: 1024,
      shell: needsShell(bin),
    });
    return { ok: true, version: (stdout ?? "").trim() || "unknown" };
  } catch {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.NOT_FOUND, "OpenClaw CLI not found") };
  }
}

export async function getStatus(): Promise<{ ok: true; raw: string; version?: string } | { ok: false; error: ApiError }> {
  const versionResult = await getVersion();
  const result = await runCli(WHITELIST.status.args, false, true);
  if (!result.ok) return result;
  return {
    ok: true,
    raw: result.stdout,
    version: versionResult.ok ? versionResult.version : undefined,
  };
}

const GATEWAY_CALL_ALLOWED = new Set(["config.get", "config.patch"]);

/** Call Gateway RPC (config.get, config.patch only). Params are server-controlled. */
export async function gatewayCall(
  method: string,
  params: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; error: ApiError }> {
  if (!GATEWAY_CALL_ALLOWED.has(method)) {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, "Method not allowed") };
  }
  const bin = getCliPath();
  const args = ["gateway", "call", method, "--params", JSON.stringify(params)];
  const result = await runCli(args, true, false);
  if (!result.ok) return result;
  try {
    const data = JSON.parse(result.stdout) as unknown;
    return { ok: true, data };
  } catch {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.PARSE_ERROR, "Invalid JSON from gateway call") };
  }
}

export async function getGatewayStatus(): Promise<{ ok: true; data: unknown } | { ok: false; error: ApiError }> {
  const result = await runCli(WHITELIST["gateway-status"].args, true, true);
  if (!result.ok) return result;
  try {
    const data = JSON.parse(result.stdout) as unknown;
    return { ok: true, data };
  } catch {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.PARSE_ERROR, "Invalid JSON from openclaw gateway status") };
  }
}

export async function getHealth(): Promise<{ ok: true; data: unknown } | { ok: false; error: ApiError }> {
  const result = await runCli(WHITELIST.health.args, true, false);
  if (!result.ok) return result;
  try {
    const data = JSON.parse(result.stdout) as unknown;
    return { ok: true, data };
  } catch {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.PARSE_ERROR, "Invalid JSON from openclaw health") };
  }
}

/** Minimal sessions shape; no conversion to Project[] */
export async function getSessions(): Promise<{ ok: true; sessions: unknown[] } | { ok: false; error: ApiError }> {
  const result = await runCli(WHITELIST.sessions.args, true, false);
  if (!result.ok) return result;
  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    const sessions = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && "sessions" in parsed && Array.isArray((parsed as { sessions: unknown[] }).sessions) ? (parsed as { sessions: unknown[] }).sessions : []);
    return { ok: true, sessions };
  } catch {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.PARSE_ERROR, "Invalid JSON from openclaw sessions") };
  }
}

/** Slugify for skill id from name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "skill";
}

/**
 * Map OpenClaw skills list output to SkillCard[].
 * CLI output format may vary; we parse line-based or JSON if present.
 * SkillCard fields may be defaulted when OpenClaw does not provide them.
 */
export async function getSkills(): Promise<{ ok: true; skills: SkillCard[] } | { ok: false; error: ApiError }> {
  const result = await runCli(WHITELIST.skills.args, false, false);
  if (!result.ok) return result;

  const raw = result.stdout.trim();
  const skills: SkillCard[] = [];

  // Try JSON first (if CLI ever outputs --json)
  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw) as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (item && typeof item === "object" && "name" in item) {
          const o = item as Record<string, unknown>;
          const name = String(o.name ?? `skill-${i}`);
          skills.push({
            id: slugify(name) + "-" + i,
            name,
            description: String(o.description ?? ""),
            authorId: String(o.authorId ?? "openclaw"),
            authorName: String(o.authorName ?? "OpenClaw"),
            authorReputation: (o.authorReputation as "verified" | "community" | "unknown") ?? "community",
            dependencyRiskScore: typeof o.dependencyRiskScore === "number" ? o.dependencyRiskScore : 50,
            usageCount: typeof o.usageCount === "number" ? o.usageCount : undefined,
            timeToRollback: typeof o.timeToRollback === "string" ? o.timeToRollback : undefined,
            hasDryRun: Boolean(o.hasDryRun),
          });
        }
      }
      return { ok: true, skills };
    } catch {
      // fall through to line-based
    }
  }

  // Line-based: each non-empty line is a skill name
  const lines = raw.split(/\r?\n/).filter((s) => s.trim());
  for (let i = 0; i < lines.length; i++) {
    const name = lines[i].trim();
    if (!name) continue;
    skills.push({
      id: slugify(name) + "-" + i,
      name,
      description: "",
      authorId: "openclaw",
      authorName: "OpenClaw",
      authorReputation: "community",
      dependencyRiskScore: 50,
      hasDryRun: false,
    });
  }

  return { ok: true, skills };
}

export async function getApprovals(): Promise<{ ok: true; raw: string } | { ok: false; error: ApiError }> {
  const result = await runCli(WHITELIST["approvals-get"].args, false, false);
  if (!result.ok) return result;
  return { ok: true, raw: result.stdout };
}

/** Sanitize user message for openclaw agent: trim, limit length, remove null bytes */
function sanitizeMessage(msg: string): string {
  return String(msg ?? "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, 8000);
}

/** When using shell (Windows .cmd), quote the message so it isn't split on spaces */
function messageArgForShell(sanitized: string): string {
  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * Run agent with a message (openclaw agent --message "...").
 * Requires Gateway. Use --agent <id> if agentId provided.
 */
export async function runAgent(
  message: string,
  opts?: { agentId?: string; json?: boolean }
): Promise<{ ok: true; stdout: string; raw: string } | { ok: false; error: ApiError }> {
  const sanitized = sanitizeMessage(message);
  if (!sanitized) {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, "Message is empty") };
  }

  const bin = getCliPath();
  const messageArg = needsShell(bin) ? messageArgForShell(sanitized) : sanitized;
  const args = ["agent", "--message", messageArg];
  // Gateway requires one of --to, --session-id, or --agent; default to main
  const agentId = opts?.agentId?.trim() || process.env.OPENCLAW_AGENT_ID || "main";
  args.push("--agent", agentId);
  if (opts?.json) {
    args.push("--json");
  }

  const result = await runCli(args, opts?.json ?? false, false, getAgentTimeout());
  if (!result.ok) return result;
  return {
    ok: true,
    stdout: result.stdout,
    raw: result.stdout,
  };
}
