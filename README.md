# Maltbot UI — Modular Dashboard

**A continuously running R&D system with a human decision choke-point.**

Reframe: not “a powerful daemon pretending to be a chatbot” — **a lab with a single Decide Inbox**.

---

## Dashboard tabs

All sections live under one dashboard with tab navigation:

| Tab | Purpose |
|-----|--------|
| **Context Hub** | Project-centric home. “Here’s my problem space.” Projects = problem space + linked repos, feeds, agents + decision log. |
| **Direct to Agent** | Send natural-language instructions to OpenClaw. Agent interprets, reasons, and executes (e.g. integrate high-signal feeds, deploy). Uses `/api/openclaw/agent/run`. |
| **Signal Feeds** | Feeds as first-class: signal strength, last delta, why it matters to this project, confidence. |
| **Decide Inbox** | Single human bottleneck. What changed · why it matters · options (A/B/C) · risk · recommendation. Ignore / Approve / Deeper analysis. |
| **Security** | Public exposure, port risk, API key inventory (last used), plugin trust. “What an attacker could see” (read-only, sanitized). |
| **Agent Timeline** | Cognition timeline: observed → hypothesis → cross-check → proposal → awaiting decision. |
| **CI/CR Radar** | CI failures, dependency churn, tooling changes, automation opportunities (e.g. “delete 412 lines”). |
| **Skills** | Marketplace with reputation: author, dependency risk, usage, time-to-rollback, dry-run. |
| **Moltbook Hub** | PowerCoreAi Moltbook integration: agent roster, signals, pending proposals, activity feed. Propose / Execute / Ignore via `/api/moltbook/*`. |
| **Settings** | API keys (MOLTBOOK_API_KEY, etc.), model preferences, and OpenClaw config. Persisted via UI; see ApiKeysPanel and ModelPanel. |

---

## Core insight (drives the UI)

> Right now Maltbot is: “A powerful daemon pretending to be a chatbot.”  
> The UI reframes it as: **A continuously running R&D system with a human decision choke-point.**

Everything in the dashboard aligns with that.

---

## Codebase layout

```
context-hub/
├── docs/                           # Design and troubleshooting
│   ├── CLAUDE-CODE-FIX-OAUTH-PROMPT.md
│   ├── GATEWAY-START-ISSUE-REPORT.md
│   └── OPENCLAW-FULL-SCOPE-SETTINGS.md
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   └── (dashboard)/
│   │       ├── layout.tsx           # Dashboard shell + tab nav
│   │       ├── page.tsx             # Context Hub (project list)
│   │       ├── command/page.tsx     # Direct to Agent (natural-language → OpenClaw)
│   │       ├── projects/[id]/page.tsx, projects/new/page.tsx
│   │       ├── feeds/page.tsx       # Signal Feeds
│   │       ├── decide/page.tsx      # Decide Inbox
│   │       ├── security/page.tsx    # Security Posture
│   │       ├── timeline/page.tsx    # Agent Timeline
│   │       ├── radar/page.tsx       # CI/CR Radar
│   │       ├── skills/page.tsx      # Skill Marketplace
│   │       ├── moltbook/page.tsx    # Moltbook Hub
│   │       └── settings/page.tsx    # API keys, model config
│   │   └── api/
│   │       ├── openclaw/            # OpenClaw: status, health, sessions, skills, approvals
│   │       │   ├── agent/run/       # Natural-language agent run (Direct to Agent)
│   │       │   ├── gateway/         # Gateway control: start, status, restart
│   │       │   ├── config/, env/    # Config and env inspection
│   │       │   └── ...
│   │       ├── moltbook/            # Moltbook: activity, feed, pending, profile, register
│   │       │   └── actions/         # propose, execute, ignore
│   │       └── projects/            # Projects CRUD
│   ├── components/
│   │   ├── DashboardTabs.tsx        # Tab navigation
│   │   ├── OpenClawStatusBlock.tsx # OpenClaw status (Security tab)
│   │   ├── AgentActivityBlock.tsx  # Agent activity (Timeline / Moltbook)
│   │   ├── moltbook/               # MoltbookHub, panels, SignalCard, AgentStatusBar, etc.
│   │   ├── settings/               # ApiKeysPanel, ModelPanel
│   │   ├── IdleBanner, SignalDriftBanner, WhatChangedBanner
│   │   └── ProblemSpace, LinkedResources, DecisionLog
│   ├── data/
│   │   ├── mock-projects.ts
│   │   ├── mock-dashboard.ts       # Feeds, Decide, Security, Timeline, Radar, Skills
│   │   └── mock-moltbook.ts
│   ├── hooks/
│   │   ├── useAgentActivity.ts
│   │   ├── useDecideInboxData.ts
│   │   ├── useMoltbookData.ts
│   │   └── useProjects.ts
│   ├── lib/
│   │   ├── idle.ts
│   │   ├── openclaw.ts             # CLI adapter (whitelist, timeouts, safe errors)
│   │   ├── openclaw-config.ts      # Gateway URL, token, CLI path
│   │   ├── moltbook.ts             # Moltbook API client
│   │   └── moltbook-pending.ts
│   └── types/
│       ├── api.ts                  # ApiError, apiError()
│       ├── project.ts
│       └── dashboard.ts            # SignalFeedCard, DecideInboxItem, SecurityPosture, etc.
├── package.json
└── README.md
```

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the tabs to switch between Context Hub, Direct to Agent, Signal Feeds, Decide Inbox, Security, Agent Timeline, CI/CR Radar, Skills, Moltbook Hub, and Settings. Maltbot/OpenClaw and Moltbook can sit in or entirely as the backend for each section.

#### Moltbook API key (optional)

To see live Moltbook data (Moltbook Hub) and run the `moltbook:whoami` script:

1. **PowerShell (current session):**
   ```powershell
   # Replace <MOLTBOOK_API_KEY> with your moltbook_sk_... value
   $env:MOLTBOOK_API_KEY = "<MOLTBOOK_API_KEY>"
   ```

2. **PowerShell (persistent, user-level):**
   ```powershell
   # Replace <MOLTBOOK_API_KEY> with your moltbook_sk_... value
   [Environment]::SetEnvironmentVariable("MOLTBOOK_API_KEY", "<MOLTBOOK_API_KEY>", "User")
   ```
   Then restart your terminal (and dev server if running).

3. **For the Next.js app:** Create `.env.local` in the project root and add:
   ```
   MOLTBOOK_API_KEY=<MOLTBOOK_API_KEY>
   ```
   (`.env.local` is in `.gitignore` and is not committed.)

4. **Verify the key** with the Moltbook client script:
   ```bash
   npm run moltbook:whoami
   ```
   This fetches and prints your agent info from Moltbook. If the key is wrong or missing, you'll get a clear error.

### `TypeError: Cannot read properties of undefined (reading 'call')` or `Cannot find module './682.js'`

These errors come from a corrupted or mismatched `.next` build cache. Webpack expects chunks in one location but they're in another (e.g. `./chunks/682.js` vs `./682.js`).

**Fix:**

1. **Stop the dev server** (Ctrl+C).
2. **Delete the `.next` folder** completely.
3. **Restart dev:** Run `npm run dev` again.

Or use the convenience script:

```bash
npm run dev:clean
```

This deletes `.next` and starts dev in one step. Do not run `npm run build` before `npm run dev` — let dev create its own output.

4. **Hard refresh** in an external browser (Ctrl+Shift+R / Cmd+Shift+R).
5. **Production:** If dev is unreliable, use `npm run build` then `npm run start` — production mode is more stable.

### External browser (Cursor vs Chrome/Edge/etc.)

If the app works in Cursor’s built-in browser but shows errors or unstyled content in an external browser:

1. **Use the same URL** in the external browser as in Cursor (e.g. `http://localhost:3000` or `http://127.0.0.1:3000`). The dev server is started with `-H 0.0.0.0` so both hosts work.
2. **Hard refresh** (Ctrl+Shift+R / Cmd+Shift+R) or clear cache for that origin so the browser doesn’t use old HTML that points to outdated asset URLs (which cause 404s for CSS/JS).
3. **CSP**: The dev server sends a Content-Security-Policy that allows `unsafe-eval` so Next.js’s client runtime isn’t blocked. If your environment adds a stricter CSP (e.g. corporate proxy or extension), you may still see CSP errors; use the same origin and a normal profile if possible.
4. **Production**: Run `npm run build` then `npm run start` and open the same URL in the external browser. Avoid serving the built output with a plain static file server (e.g. opening `file://` or dropping `.next` into nginx without the Node server); that will 404 for `_next` assets.

---

## OpenClaw backend

The dashboard talks to OpenClaw only via Next.js API routes. The browser never calls OpenClaw or the Gateway directly.

**Integration model:** CLI is primary; HTTP (Gateway) is optional. Each adapter call uses either CLI or HTTP, never both in a single request.

### Environment variables

| Variable | Purpose |
|----------|--------|
| `MOLTBOOK_API_KEY` | PowerCoreAi Moltbook API key (moltbook_sk_...). For Moltbook Hub and `npm run moltbook:whoami`. |
| `OPENCLAW_CLI_PATH` | Optional. CLI executable (default: `openclaw` on PATH). |
| `OPENCLAW_GATEWAY_URL` | Optional. e.g. `http://127.0.0.1:18789`. When set with token, adapter may use HTTP for health/tools. |
| `OPENCLAW_GATEWAY_TOKEN` | Required when using HTTP. |
| `OPENCLAW_CLI_TIMEOUT_MS` | Optional. Default 15000 ms for most ops; status uses 5 s so the UI does not hang when the Gateway is down. |

### Gateway control (start / status / restart)

The UI can start, query, and restart the OpenClaw Gateway via Next.js API routes (browser never talks to the Gateway directly):

| Route | Method | Purpose |
|-------|--------|--------|
| `/api/openclaw/gateway/status` | GET | Gateway reachability and basic info. |
| `/api/openclaw/gateway/start` | POST | Start the Gateway process (uses `OPENCLAW_GATEWAY_URL`, token, CLI path from config). |
| `/api/openclaw/gateway/restart` | POST | Restart the Gateway (stop then start). |

See `docs/GATEWAY-START-ISSUE-REPORT.md` and `docs/OPENCLAW-FULL-SCOPE-SETTINGS.md` for troubleshooting and full env/config scope.

### Moltbook API (PowerCoreAi)

Moltbook Hub and Decide-style flows use these API routes (all go through the Next.js app; keys stay server-side):

| Route | Purpose |
|-------|--------|
| `/api/moltbook/activity` | Agent activity feed. |
| `/api/moltbook/feed` | Signal feed. |
| `/api/moltbook/pending` | Pending proposals. |
| `/api/moltbook/profile` | Agent profile (e.g. `npm run moltbook:whoami`). |
| `/api/moltbook/register` | Register agent. |
| `/api/moltbook/actions/propose` | Propose an action. |
| `/api/moltbook/actions/execute` | Execute an approved action. |
| `/api/moltbook/actions/ignore` | Ignore a proposal. |

Requires `MOLTBOOK_API_KEY` (see Moltbook API key section above). See also `MOLTBOOK_INTEGRATION.md` and `MOLTBOOK_POWERCOREAi_SETUP.md`.

### What is live vs mocked

- **OpenClaw:** Status, health, sessions, skills, approvals, agent run, and gateway (start/status/restart) are served by the OpenClaw adapter (CLI or HTTP when configured). Skills are mapped to `SkillCard` with explicit defaults when OpenClaw does not provide fields.
- **Moltbook:** Activity, feed, pending, profile, register, and actions (propose/execute/ignore) call the Moltbook API when `MOLTBOOK_API_KEY` is set; otherwise mocked.
- **Context Hub (projects) and Decide Inbox:** Projects and Decide items remain mocked in the UI. OpenClaw has no "projects" API; sessions do not provide problemSpaceMarkdown, linkedRepos, decisionLog, etc. Projects can be mapped from sessions or a future OpenClaw skill later (TODOs in code).

### Documentation (docs/)

| File | Purpose |
|------|--------|
| `docs/CLAUDE-CODE-FIX-OAUTH-PROMPT.md` | OAuth/code-fix guidance for Claude/Cursor. |
| `docs/GATEWAY-START-ISSUE-REPORT.md` | Gateway start failures and troubleshooting. |
| `docs/OPENCLAW-FULL-SCOPE-SETTINGS.md` | Full OpenClaw env/config scope and Settings UI. |

### Optional follow-ups

- **Version:** Status/health can include an optional `openclaw --version` check.
- **Resilience:** Cache "last known good" status or a circuit breaker after N failures; document in README.

---

## Next steps (to build on)

- **Backend**: Wire each tab to Maltbot/Clawdbot APIs (feeds, decide items, security scan, timeline events, radar, skills).
- **Decide Inbox**: Swipe gestures (left = ignore, right = approve, long-press = deeper); persist status.
- **Signal Feeds**: Real signal strength and confidence from feed analysis.
- **Security**: Live “what an attacker could see” from actual exposure scan.
- **Skills**: Dry-run execution and install flow.
- **“Why this matters”**: Ensure every recommendation answers why now, why you, why this project (pattern across Decide, Feeds, Radar).

---

## Viral hook (from spec)

> “I stopped reading Reddit, Twitter, and GitHub. My agent tells me when it matters.”

The UI’s job: make that believable — **slow the future down, make it legible, put humans in the decision seat.**
