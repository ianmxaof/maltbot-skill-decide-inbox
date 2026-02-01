/**
 * OpenClaw adapter: CLI-only (HTTP optional later).
 * Whitelisted commands only; spawn/execFile; timeouts; safe errors.
 * Never expose raw stdout/stderr to client.
 */

import { execFile, spawn, exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
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
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, message.length > 2000 ? message.slice(0, 2000) + "…" : message) };
  }
}

/** Whitelisted commands: exact args only */
const WHITELIST: Record<string, { args: string[]; shortTimeout: boolean; json: boolean }> = {
  status: { args: ["status"], shortTimeout: true, json: false },
  "gateway-status": { args: ["gateway", "status", "--json"], shortTimeout: true, json: true },
  "gateway-restart": { args: ["gateway", "restart"], shortTimeout: false, json: false },
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

const GATEWAY_RESTART_TIMEOUT_MS = 30000;
const DEFAULT_GATEWAY_PORT = "18789";

function getGatewayPort(): string {
  return process.env.OPENCLAW_GATEWAY_PORT ?? DEFAULT_GATEWAY_PORT;
}

/**
 * Kill any process listening on the gateway port.
 * Prevents accumulation of zombie Node/OpenClaw processes when starting a new gateway.
 */
export async function killProcessOnGatewayPort(): Promise<void> {
  const port = getGatewayPort();
  const isWin = process.platform === "win32";

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(safety);
      resolve();
    };
    const safety = setTimeout(done, 6000);

    if (isWin) {
      // PowerShell: find process on port, kill it (use temp file to avoid quoting issues)
      const ps = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`;
      const psFile = join(tmpdir(), `openclaw-kill-port-${Date.now()}.ps1`);
      try {
        writeFileSync(psFile, ps, "utf8");
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 5000 }, () => {
          try {
            unlinkSync(psFile);
          } catch {
            /* ignore */
          }
          done();
        });
      } catch (e) {
        try {
          unlinkSync(psFile);
        } catch {
          /* ignore */
        }
        done();
      }
    } else {
      // lsof -i :PORT -t returns PIDs; kill -9 each
      exec(`lsof -i :${port} -t 2>/dev/null`, { timeout: 3000 }, (err, stdout) => {
        const pids = (stdout ?? "")
          .trim()
          .split(/\r?\n/)
          .filter((s) => /^\d+$/.test(s));
        if (pids.length === 0) {
          done();
          return;
        }
        exec(`kill -9 ${pids.join(" ")} 2>/dev/null`, { timeout: 3000 }, done);
      });
    }
  });
}

/**
 * Start the OpenClaw Gateway as a detached background process (runs until stopped).
 * On Windows, uses VBScript to launch truly hidden (no console window).
 * On Unix, uses detached spawn.
 */
export function startGateway(): { ok: true } | { ok: false; error: ApiError } {
  const bin = getCliPath();
  const port = getGatewayPort();
  const gatewayArgs = ["gateway", "--port", port];
  const isWin = process.platform === "win32";

  try {
    if (isWin) {
      // Use VBScript to launch truly hidden on Windows.
      // WScript.Shell.Run with 0 = hidden window, False = don't wait.
      // This works even for .cmd/.bat wrappers that normally create console windows.
      const vbsPath = join(tmpdir(), `openclaw-gateway-${Date.now()}.vbs`);

      // Build the command - escape double quotes for VBScript
      const cmdEscaped = `"${bin}" gateway --port ${port}`.replace(/"/g, '""');

      // VBScript content: run command hidden, don't wait
      const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${process.cwd().replace(/\\/g, "\\\\").replace(/"/g, '""')}"
WshShell.Run "${cmdEscaped}", 0, False
`;

      try {
        // Write temporary VBScript
        writeFileSync(vbsPath, vbsContent, "utf8");

        // Run VBScript with wscript (GUI host, no console) - fire and forget
        const child = spawn("wscript", [vbsPath], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        });
        child.unref();

        // Clean up VBS file after a delay (give wscript time to read it)
        setTimeout(() => {
          try {
            unlinkSync(vbsPath);
          } catch {
            // Ignore cleanup errors
          }
        }, 5000);
      } catch (vbsErr) {
        // Fallback: try PowerShell approach if VBScript fails
        const psPath = (p: string) => p.replace(/'/g, "''");
        const psCmd = `Start-Process -FilePath '${psPath(bin)}' -ArgumentList 'gateway','--port','${port}' -WindowStyle Hidden -WorkingDirectory '${psPath(process.cwd())}'`;
        const child = spawn("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", psCmd], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          env: process.env,
          cwd: process.cwd(),
        });
        child.unref();
      }
    } else {
      // Unix: simple detached spawn
      const useShell = needsShell(bin);
      const child = spawn(bin, gatewayArgs, {
        detached: true,
        stdio: "ignore",
        shell: useShell,
        env: process.env,
        cwd: process.cwd(),
      });
      child.unref();
    }
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { message?: string };
    const message = e?.message ?? String(err);
    return {
      ok: false,
      error: apiError(
        OPENCLAW_ERROR_CODES.CLI_ERROR,
        message.length > 2000 ? message.slice(0, 2000) + "…" : message
      ),
    };
  }
}

/** Restart the OpenClaw Gateway service (works when gateway is installed as a service). */
export async function restartGateway(): Promise<{ ok: true } | { ok: false; error: ApiError }> {
  const result = await runCli(
    WHITELIST["gateway-restart"].args,
    true,
    false,
    GATEWAY_RESTART_TIMEOUT_MS
  );
  if (!result.ok) return result;
  return { ok: true };
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

/**
 * Verify gateway is reachable by pinging its HTTP endpoint.
 * Returns true if gateway responds, false otherwise.
 * Uses GET instead of HEAD for better compatibility.
 */
export async function pingGateway(): Promise<boolean> {
  const port = getGatewayPort();
  // Try the canvas endpoint first, then root as fallback
  const endpoints = [
    `http://127.0.0.1:${port}/__openclaw__/canvas/`,
    `http://127.0.0.1:${port}/`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal, method: "GET" });
      clearTimeout(timeoutId);
      // Any response (even 404, 405, etc.) means the gateway is up
      if (res.status < 500) {
        return true;
      }
    } catch {
      // Continue to next endpoint
    }
  }
  return false;
}
