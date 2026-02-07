/**
 * OpenClaw adapter: CLI-only (HTTP optional later).
 * Whitelisted commands only; spawn/execFile; timeouts; safe errors.
 * Never expose raw stdout/stderr to client.
 */

import { execFile, spawn, exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { homedir } from "os";
import type { ApiError } from "@/types/api";
import { OPENCLAW_ERROR_CODES, apiError } from "@/types/api";
import type { SkillCard } from "@/types/dashboard";

const execFileAsync = promisify(execFile);

const STATUS_TIMEOUT_MS = 5000;
const DEFAULT_TIMEOUT_MS = 15000;
/** Agent runs (LLM + tools) often take 30s–2min; use longer default */
const AGENT_TIMEOUT_MS = 120000;
/** Skills list can be slow on first run; use much longer timeout to avoid 502 */
const SKILLS_TIMEOUT_MS = 90000; // 90 seconds - OpenClaw may need to initialize

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
const WHITELIST: Record<string, { args: string[]; shortTimeout: boolean; json: boolean; customTimeout?: number }> = {
  status: { args: ["status"], shortTimeout: true, json: false },
  "gateway-status": { args: ["gateway", "status", "--json"], shortTimeout: true, json: true },
  "gateway-restart": { args: ["gateway", "restart"], shortTimeout: false, json: false },
  health: { args: ["health", "--json"], shortTimeout: false, json: true },
  sessions: { args: ["sessions", "--json"], shortTimeout: false, json: true },
  skills: { args: ["skills", "list"], shortTimeout: false, json: false, customTimeout: SKILLS_TIMEOUT_MS },
  "skills-json": { args: ["skills", "list", "--json"], shortTimeout: false, json: true, customTimeout: SKILLS_TIMEOUT_MS },
  "approvals-get": { args: ["approvals", "get"], shortTimeout: false, json: false },
};

/** Allowed skill name: alphanumeric, hyphen, underscore, dot (no path/shell). Max 120 chars. */
const SAFE_SKILL_NAME = /^[a-zA-Z0-9_.-]{1,120}$/;
function isSafeSkillName(name: string): boolean {
  return typeof name === "string" && name.trim() === name && SAFE_SKILL_NAME.test(name);
}

const SKILL_INSTALL_TIMEOUT_MS = 60000;
const SKILL_UNINSTALL_TIMEOUT_MS = 30000;

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

/** Base URL for this app (propose endpoint); agent uses this to send proposals to Decide Inbox. */
function getMaltbotBaseUrl(): string {
  return process.env.MALTBOT_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Start the OpenClaw Gateway as a detached background process (runs until stopped).
 * On Windows, uses VBScript to launch truly hidden (no console window).
 * On Unix, uses detached spawn.
 * Passes MALTBOT_PROPOSE_URL and MALTBOT_BASE_URL so the Moltbook skill sends proposals to Decide Inbox.
 */
export function startGateway(): { ok: true } | { ok: false; error: ApiError } {
  const bin = getCliPath();
  const port = getGatewayPort();
  const gatewayArgs = ["gateway", "--port", port];
  const isWin = process.platform === "win32";
  const baseUrl = getMaltbotBaseUrl();
  const proposeUrl = `${baseUrl.replace(/\/$/, "")}/api/moltbook/actions/propose`;
  const gatewayEnv = {
    ...process.env,
    MALTBOT_PROPOSE_URL: proposeUrl,
    MALTBOT_BASE_URL: baseUrl,
  };

  try {
    if (isWin) {
      // Use VBScript to launch truly hidden on Windows.
      // Use cmd /c "set VAR=value & ..." so the gateway process gets MALTBOT_* and proposals go to Decide Inbox.
      const vbsPath = join(tmpdir(), `openclaw-gateway-${Date.now()}.vbs`);
      // In cmd, use set "VAR=value" so URLs with & are safe; & between set and next command
      const proposeEsc = proposeUrl.replace(/"/g, '""');
      const baseEsc = baseUrl.replace(/"/g, '""');
      const cmdWithEnv = `cmd /c set "MALTBOT_PROPOSE_URL=${proposeEsc}" & set "MALTBOT_BASE_URL=${baseEsc}" & "${bin}" gateway --port ${port}`.replace(/"/g, '""');
      const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${process.cwd().replace(/\\/g, "\\\\").replace(/"/g, '""')}"
WshShell.Run "${cmdWithEnv}", 0, False
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
      // Unix: simple detached spawn; pass MALTBOT_* so agent proposals go to Decide Inbox
      const useShell = needsShell(bin);
      const child = spawn(bin, gatewayArgs, {
        detached: true,
        stdio: "ignore",
        shell: useShell,
        env: gatewayEnv,
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

/** True if line is only table separators (dashes, pipes, spaces). */
function isSeparatorLine(line: string): boolean {
  return /^[\s|\-_:]+$/.test(line.trim());
}

/** True if string looks like a valid skill name (has at least one letter, not a header/separator). */
function isLikelySkillName(name: string): boolean {
  const t = name.trim();
  if (!t || t.length > 120) return false;
  if (/^(Status|Skill|Description|Source)$/i.test(t)) return false;
  if (isSeparatorLine(t)) return false;
  return /[a-zA-Z]/.test(t);
}

/** Build one SkillCard from parsed fields (shared by JSON and table). */
function toSkillCard(
  name: string,
  i: number,
  opts: {
    description?: string;
    authorId?: string;
    authorName?: string;
    authorReputation?: "verified" | "community" | "unknown";
    dependencyRiskScore?: number;
    usageCount?: number;
    timeToRollback?: string;
    hasDryRun?: boolean;
    status?: "ready" | "missing" | "disabled";
    source?: string;
  } = {}
): SkillCard {
  return {
    id: slugify(name) + "-" + i,
    name,
    description: (opts.description ?? "").slice(0, 500),
    authorId: opts.authorId ?? "openclaw",
    authorName: opts.authorName ?? "OpenClaw",
    authorReputation: opts.authorReputation ?? "community",
    dependencyRiskScore: opts.dependencyRiskScore ?? 50,
    usageCount: opts.usageCount,
    timeToRollback: opts.timeToRollback,
    hasDryRun: opts.hasDryRun ?? false,
    status: opts.status,
    source: opts.source,
  };
}

/**
 * Map OpenClaw skills list output to SkillCard[].
 * Tries --json first; falls back to table parsing. Filters out headers and separator rows.
 */
export async function getSkills(): Promise<{ ok: true; skills: SkillCard[] } | { ok: false; error: ApiError }> {
  // Prefer JSON if CLI supports it
  const jsonResult = await runCli(
    WHITELIST["skills-json"].args,
    true,
    false,
    WHITELIST["skills-json"].customTimeout
  );
  if (jsonResult.ok) {
    const raw = jsonResult.stdout.trim();
    if (raw.startsWith("[") || raw.startsWith("{")) {
      try {
        const data = raw.startsWith("[") ? (JSON.parse(raw) as unknown[]) : (JSON.parse(raw) as { skills?: unknown[] }).skills;
        const arr = Array.isArray(data) ? data : [];
        const skills: SkillCard[] = [];
        for (let i = 0; i < arr.length; i++) {
          const item = arr[i];
          if (item && typeof item === "object" && "name" in item) {
            const o = item as Record<string, unknown>;
            const name = String(o.name ?? `skill-${i}`).trim();
            if (!isLikelySkillName(name)) continue;
            const statusVal = o.status as string | undefined;
            const status =
              statusVal === "ready" || statusVal === "missing" || statusVal === "disabled"
                ? statusVal
                : undefined;
            skills.push(
              toSkillCard(name, i, {
                description: String(o.description ?? ""),
                authorId: String(o.authorId ?? "openclaw"),
                authorName: String(o.authorName ?? "OpenClaw"),
                authorReputation: (o.authorReputation as "verified" | "community" | "unknown") ?? "community",
                dependencyRiskScore: typeof o.dependencyRiskScore === "number" ? o.dependencyRiskScore : 50,
                usageCount: typeof o.usageCount === "number" ? o.usageCount : undefined,
                timeToRollback: typeof o.timeToRollback === "string" ? o.timeToRollback : undefined,
                hasDryRun: Boolean(o.hasDryRun),
                status,
                source: typeof o.source === "string" ? o.source : undefined,
              })
            );
          }
        }
        return { ok: true, skills };
      } catch {
        // fall through to table
      }
    }
  }

  const result = await runCli(
    WHITELIST.skills.args,
    false,
    false,
    WHITELIST.skills.customTimeout
  );
  if (!result.ok) return result;

  const raw = result.stdout.trim();
  const skills: SkillCard[] = [];
  const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const headerLike = /^\|?\s*Status\s*\|/i;
  const summaryLike = /^Skills\s*\(\d+\s*\/\s*\d+\s*ready\)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (summaryLike.test(line) || headerLike.test(line) || isSeparatorLine(line)) continue;

    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      const first = cells[0];
      const firstLower = first.toLowerCase();
      const isHeaderRow =
        first === "Status" ||
        first === "Skill" ||
        /^(Status|Skill|Description|Source)$/i.test(first);
      if (isHeaderRow && cells.some((c) => /^(Status|Skill|Description|Source)$/i.test(c))) continue;

      let status: "ready" | "missing" | "disabled" | undefined;
      let name: string;
      let description = "";
      let source: string | undefined;

      // 4-column table: Status | Skill | Description | Source
      const looksLikeFourColumn =
        cells.length >= 4 &&
        (firstLower === "ready" || firstLower === "missing" || firstLower === "disabled" ||
          firstLower.includes("ready") || firstLower.includes("missing") || firstLower.includes("disabled") ||
          first === "✓" || /^\s*x\s+/i.test(first));
      if (looksLikeFourColumn && cells.length >= 4) {
        status =
          firstLower.includes("missing") || /^\s*x\s+/i.test(first)
            ? "missing"
            : firstLower.includes("ready") || first === "✓"
              ? "ready"
              : firstLower.includes("disabled")
                ? "disabled"
                : undefined;
        name = cells[1] ?? first;
        description = cells[2] ?? "";
        source = cells[3];
      } else {
        // Combined first column: "X missing 🔒 1password" or "✓ ready foo"
        if (firstLower.includes("missing") || /^\s*x\s+/i.test(first)) {
          status = "missing";
          name = first.replace(/^[x✓]\s*missing\s*🔒?\s*/gi, "").trim();
          description = cells[1] ?? "";
          source = cells[2] ?? cells[3];
        } else if (firstLower.includes("ready") || first === "✓" || first === "ok") {
          status = "ready";
          name = first.replace(/^✓\s*ready\s*/gi, "").trim() || (cells[1] ?? first);
          description = cells[2] ?? cells[1] ?? "";
          source = cells[3] ?? cells[2];
        } else if (firstLower.includes("disabled")) {
          status = "disabled";
          name = first.replace(/^.*disabled\s*/gi, "").trim() || (cells[1] ?? first);
          description = cells[2] ?? cells[1] ?? "";
          source = cells[3] ?? cells[2];
        } else {
          name = first;
          description = cells[1] ?? "";
          source = cells[2] ?? cells[3];
        }
      }

      const cleanName = name.trim() || (cells[1] ?? cells[0] ?? "").trim();
      if (!isLikelySkillName(cleanName)) continue;

      skills.push(
        toSkillCard(cleanName, i, {
          description,
          status,
          source,
        })
      );
      continue;
    }

    const name = line.replace(/^\|?\s*|\s*\|?$/g, "").trim();
    if (!isLikelySkillName(name)) continue;

    skills.push(toSkillCard(name, i, {}));
  }

  return { ok: true, skills };
}

/** Resolve OpenClaw skills directory. Uses env or default ~/.openclaw/skills */
function getOpenClawSkillsDir(): string {
  const workdir = process.env.OPENCLAW_WORKSPACE || process.env.CLAWHUB_WORKDIR || join(homedir(), ".openclaw");
  return join(workdir, "skills");
}

/** Scan skills directory for folders with SKILL.md. Returns SkillCard[] for installed-but-unlisted skills. */
export function getSkillsFromFilesystem(): SkillCard[] {
  const skillsDir = getOpenClawSkillsDir();
  if (!existsSync(skillsDir)) return [];
  const skills: SkillCard[] = [];
  try {
    const entries = readdirSync(skillsDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const skillPath = join(skillsDir, e.name);
      const skillMd = join(skillPath, "SKILL.md");
      if (existsSync(skillMd)) {
        const name = e.name;
        if (!isLikelySkillName(name)) continue;
        skills.push(
          toSkillCard(name, skills.length, {
            status: "ready",
            source: "filesystem",
            description: "Installed via Maltbot",
          })
        );
      }
    }
  } catch {
    // ignore read errors
  }
  return skills;
}

/**
 * Install a skill via ClawHub (npx clawhub install).
 * OpenClaw CLI has no "skills install" — use ClawHub instead.
 */
export async function installSkillViaClawHub(
  slug: string
): Promise<{ ok: true; stdout: string } | { ok: false; error: ApiError }> {
  if (!isSafeSkillName(slug)) {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, "Invalid skill name") };
  }
  const workdir = process.env.OPENCLAW_WORKSPACE || process.env.CLAWHUB_WORKDIR || join(homedir(), ".openclaw");
  const useShell = process.platform === "win32";
  try {
    const { stdout, stderr } = await execFileAsync(
      "npx",
      ["clawhub@latest", "install", slug, "--no-input", "--workdir", workdir],
      {
        timeout: SKILL_INSTALL_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        encoding: "utf8",
        shell: useShell,
      }
    );
    return { ok: true, stdout: (stdout ?? "") + (stderr ?? "") };
  } catch (err: unknown) {
    const e = err as { message?: string; killed?: boolean; signal?: string };
    if (e.killed && (e.signal === "SIGTERM" || e.signal === "SIGKILL")) {
      return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.TIMEOUT, "ClawHub install timed out") };
    }
    const message = (e.message ?? String(err)).slice(0, 500);
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, message) };
  }
}

/**
 * Install Moltbook skill from URL (not on ClawHub).
 * Fetches SKILL.md, HEARTBEAT.md, MESSAGING.md, skill.json from www.moltbook.com
 */
export async function installMoltbookSkill(): Promise<{ ok: true } | { ok: false; error: ApiError }> {
  const BASE = "https://www.moltbook.com";
  const skillsDir = getOpenClawSkillsDir();
  const targetDir = join(skillsDir, "moltbook");

  const files = ["skill.md", "heartbeat.md", "messaging.md"];
  const jsonUrl = `${BASE}/skill.json`;

  try {
    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, { recursive: true });
    }
    mkdirSync(targetDir, { recursive: true });

    const fileMap: Record<string, string> = {
      "skill.md": "SKILL.md",
      "heartbeat.md": "HEARTBEAT.md",
      "messaging.md": "MESSAGING.md",
    };
    for (const f of files) {
      const url = `${BASE}/${f}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
      const text = await res.text();
      const outName = fileMap[f] ?? f;
      writeFileSync(join(targetDir, outName), text, "utf8");
    }

    try {
      const jsonRes = await fetch(jsonUrl);
      if (jsonRes.ok) {
        const json = await jsonRes.text();
        writeFileSync(join(targetDir, "package.json"), json, "utf8");
      }
    } catch {
      // package.json optional
    }

    // Append Maltbot wiring: agent proposes → human approves in Decide Inbox
    const maltbotSection = `

---
## Maltbot Integration (Human-in-the-Loop)

When using Maltbot, **do not** call Moltbook API directly. Instead, propose actions to Maltbot's Decide Inbox:

**Propose endpoint:** \`POST {{MALTBOT_URL}}/api/moltbook/actions/propose\`

Set \`MALTBOT_URL\` (e.g. http://localhost:3000) where your Maltbot runs.

**Example — propose a post:**
\`\`\`json
{
  "actionType": "post",
  "title": "Share discovery",
  "description": "Post about X",
  "reasoning": "Relevant to community",
  "submolt": "general",
  "content": "..."
}
\`\`\`

A human approves in Decide Inbox; only approved actions run on Moltbook.
`;
    const skillPath = join(targetDir, "SKILL.md");
    const existing = readFileSync(skillPath, "utf8");
    const baseUrl = getMaltbotBaseUrl();
    const withMaltbot = maltbotSection.replace("{{MALTBOT_URL}}", baseUrl);
    if (!existing.includes("Maltbot Integration")) {
      writeFileSync(skillPath, existing.trimEnd() + withMaltbot, "utf8");
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, message.slice(0, 500)) };
  }
}

/**
 * Install a skill by name. Uses ClawHub for most skills; URL-based for moltbook.
 */
export async function installSkill(
  skillName: string
): Promise<{ ok: true; stdout: string } | { ok: false; error: ApiError }> {
  if (!isSafeSkillName(skillName)) {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, "Invalid skill name") };
  }

  const nameLower = skillName.toLowerCase();
  if (nameLower === "moltbook") {
    const result = await installMoltbookSkill();
    if (!result.ok) return result;
    return { ok: true, stdout: "Moltbook skill installed from www.moltbook.com" };
  }

  return installSkillViaClawHub(skillName);
}

function rmDirRecursive(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
}

/**
 * Uninstall a skill by removing its folder from the skills directory.
 * OpenClaw CLI has no "skills uninstall" — we delete the skill folder directly.
 */
export async function uninstallSkill(
  skillName: string
): Promise<{ ok: true; stdout: string } | { ok: false; error: ApiError }> {
  if (!isSafeSkillName(skillName)) {
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, "Invalid skill name") };
  }
  const skillsDir = getOpenClawSkillsDir();
  const slug = skillName.toLowerCase().replace(/\s+/g, "-");
  const targetDir = join(skillsDir, slug);
  try {
    rmDirRecursive(targetDir);
    return { ok: true, stdout: `Removed ${targetDir}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: apiError(OPENCLAW_ERROR_CODES.CLI_ERROR, message.slice(0, 500)) };
  }
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
