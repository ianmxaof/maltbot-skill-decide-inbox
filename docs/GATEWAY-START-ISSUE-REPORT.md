# OpenClaw Gateway Start Issue — Debug Report for Claude Code

**Date:** January 2026  
**Project:** Maltbot Dashboard (Context Hub) — Next.js app that integrates with OpenClaw CLI  
**Platform:** Windows 10 (win32)

---

## Summary

When the user clicks **"Start Gateway"** in the dashboard UI, the OpenClaw Gateway process is spawned, but:

1. A **terminal/console window still opens** despite attempts to hide it (`windowsHide`, `Start-Process -WindowStyle Hidden`).
2. **Verification often fails** — after spawning, the app pings the Gateway for up to 12 seconds but cannot confirm it is running.
3. When the user then sends a message via "Direct to Agent", they get: `Gateway agent failed; falling back to embedded: Error: gateway closed (1006 abnormal closure)`.

The Gateway works when started manually in a terminal (`openclaw gateway --port 18789`). The problem is specifically the **programmatic spawn from Node.js** on Windows.

---

## Application Architecture

- **Framework:** Next.js 14.2.35 (App Router)
- **Backend:** API routes call into `src/lib/openclaw.ts`, which spawns the OpenClaw CLI via Node.js `child_process.spawn`.
- **Flow:**
  1. User clicks "Start Gateway" → `POST /api/openclaw/gateway/start`
  2. API calls `startGateway()` from `src/lib/openclaw.ts`
  3. `startGateway()` spawns `openclaw gateway --port 18789` as a detached process
  4. API polls `pingGateway()` (HTTP GET to `http://127.0.0.1:18789/__openclaw__/canvas/`) for up to 12 seconds
  5. If ping succeeds → "Gateway started and verified"
  6. If ping never succeeds → "Gateway spawn attempted, but could not verify"

---

## OpenClaw CLI Details

- **CLI path:** `C:\Users\ianmp\AppData\Roaming\npm\openclaw.cmd` (from error output; configurable via `OPENCLAW_CLI_PATH` in `.env.local`)
- **Command to start Gateway manually:** `openclaw gateway --port 18789`
- **Gateway listens on:** `ws://127.0.0.1:18789` and HTTP at `http://127.0.0.1:18789/__openclaw__/canvas/`
- **Port:** 18789 (configurable via `OPENCLAW_GATEWAY_PORT`)

---

## Current `startGateway()` Implementation

**File:** `src/lib/openclaw.ts` (lines ~162–205)

Full function:

```typescript
export function startGateway(): { ok: true } | { ok: false; error: ApiError } {
  const bin = getCliPath();  // process.env.OPENCLAW_CLI_PATH ?? "openclaw"
  const port = getGatewayPort();  // OPENCLAW_GATEWAY_PORT ?? "18789"
  const gatewayArgs = ["gateway", "--port", port];
  const isWin = process.platform === "win32";

  try {
    if (isWin) {
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
    } else {
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
  } catch (err: unknown) { /* ... */ }
}
```

- `bin` = `process.env.OPENCLAW_CLI_PATH ?? "openclaw"` (resolves to `openclaw.cmd` on Windows when using npm-installed CLI)
- On Windows, when `bin` is `openclaw`, it may resolve to `openclaw.cmd` via PATH
- `.cmd` files are batch wrappers; `Start-Process -FilePath openclaw.cmd` might open a console because the child inherits a console

**On Unix:** Uses `spawn(bin, gatewayArgs, { detached: true, stdio: "ignore", ... })` directly.

---

## Attempts Already Made

1. **`windowsHide: true`** on the Node.js `spawn` options — did not prevent console window.
2. **PowerShell `Start-Process -WindowStyle Hidden`** — intended to launch the Gateway with no visible window; user reports the terminal still opens.
3. **Detached process** with `child.unref()` — process is detached so the Next.js server is not blocked.
4. **Extended verification** — increased from 5 to 12 seconds of polling; verification still often fails.

---

## Hypotheses

1. **`.cmd` launcher behavior:** `openclaw.cmd` may spawn `node` or another process that creates a console. `Start-Process -WindowStyle Hidden` might only affect the PowerShell window, not the eventual OpenClaw process.
2. **Working directory / PATH:** The spawn runs with `process.cwd()` (project root). OpenClaw may need a different CWD or env (e.g. `USERPROFILE`, `HOME`) to find its config.
3. **Process tree:** OpenClaw might be a launcher that starts a child; the child could be the one creating the console.
4. **Verification timing:** The Gateway may take longer than 12 seconds to bind to the port on first run (e.g. loading config, starting hooks).
5. **Port / firewall:** Unlikely if manual start works, but worth ruling out if the spawned process binds differently.

---

## Key Files to Inspect

| File | Purpose |
|------|---------|
| `src/lib/openclaw.ts` | `startGateway()`, `pingGateway()`, `getGatewayPort()` |
| `src/app/api/openclaw/gateway/start/route.ts` | API route that calls `startGateway()` and verifies via `pingGateway()` |
| `src/app/api/openclaw/gateway/status/route.ts` | GET endpoint that pings the Gateway (for "Check Gateway" button) |
| `src/app/(dashboard)/command/page.tsx` | Direct to Agent UI; shows error and Start Gateway / Check Gateway / Retry buttons |
| `.env.local` | Contains `OPENCLAW_CLI_PATH` (and possibly `OPENCLAW_GATEWAY_PORT`) |

---

## What We Need

1. **Hide the console window** when starting the Gateway from the Node.js process on Windows, so no terminal appears.
2. **Reliable verification** that the Gateway is running after spawn (or clearer feedback if it is not).
3. **Alternative approaches** if direct spawn cannot be made invisible — e.g. a Windows Service, a scheduled task, or a helper executable that creates a truly hidden process.

---

## Environment Snippets

**`.env.example`** (relevant vars):

```
OPENCLAW_CLI_PATH=openclaw
OPENCLAW_GATEWAY_PORT=18789
```

**`pingGateway()`** — pings `http://127.0.0.1:${port}/__openclaw__/canvas/` with a 3s timeout. Returns `true` if response is `ok` or `404`.

---

## Manual Workaround (Confirmed Working)

Run in a terminal:

```bash
openclaw gateway --port 18789
```

Keep the terminal open. The dashboard’s "Direct to Agent" and "Check Gateway" then work correctly. The goal is to replicate this behavior from the UI without showing a terminal.
