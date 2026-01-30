# Maltbot UI — Modular Dashboard

**A continuously running R&D system with a human decision choke-point.**

Reframe: not “a powerful daemon pretending to be a chatbot” — **a lab with a single Decide Inbox**.

---

## Dashboard tabs

All sections live under one dashboard with tab navigation:

| Tab | Purpose |
|-----|--------|
| **Context Hub** | Project-centric home. “Here’s my problem space.” Projects = problem space + linked repos, feeds, agents + decision log. |
| **Signal Feeds** | Feeds as first-class: signal strength, last delta, why it matters to this project, confidence. |
| **Decide Inbox** | Single human bottleneck. What changed · why it matters · options (A/B/C) · risk · recommendation. Ignore / Approve / Deeper analysis. |
| **Security** | Public exposure, port risk, API key inventory (last used), plugin trust. “What an attacker could see” (read-only, sanitized). |
| **Agent Timeline** | Cognition timeline: observed → hypothesis → cross-check → proposal → awaiting decision. |
| **CI/CR Radar** | CI failures, dependency churn, tooling changes, automation opportunities (e.g. “delete 412 lines”). |
| **Skills** | Marketplace with reputation: author, dependency risk, usage, time-to-rollback, dry-run. |

---

## Core insight (drives the UI)

> Right now Maltbot is: “A powerful daemon pretending to be a chatbot.”  
> The UI reframes it as: **A continuously running R&D system with a human decision choke-point.**

Everything in the dashboard aligns with that.

---

## Codebase layout

```
context-hub/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   └── (dashboard)/
│   │       ├── layout.tsx           # Dashboard shell + tab nav
│   │       ├── page.tsx             # Context Hub (project list)
│   │       ├── projects/[id]/page.tsx
│   │       ├── feeds/page.tsx       # Signal Feeds
│   │       ├── decide/page.tsx      # Decide Inbox
│   │       ├── security/page.tsx    # Security Posture
│   │       ├── timeline/page.tsx    # Agent Timeline
│   │       ├── radar/page.tsx       # CI/CR Radar
│   │       └── skills/page.tsx      # Skill Marketplace
│   │   └── api/openclaw/           # OpenClaw API (status, health, sessions, skills, approvals)
│   ├── components/
│   │   ├── DashboardTabs.tsx       # Tab navigation
│   │   ├── OpenClawStatusBlock.tsx # OpenClaw status (Security tab)
│   │   ├── IdleBanner, SignalDriftBanner, WhatChangedBanner
│   │   ├── ProblemSpace, LinkedResources, DecisionLog
│   ├── data/
│   │   ├── mock-projects.ts
│   │   └── mock-dashboard.ts       # Feeds, Decide, Security, Timeline, Radar, Skills
│   ├── lib/
│   │   ├── idle.ts
│   │   └── openclaw.ts            # CLI adapter (whitelist, timeouts, safe errors)
│   └── types/
│       ├── api.ts                 # ApiError, apiError()
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

Open [http://localhost:3000](http://localhost:3000). Use the tabs to switch between Context Hub, Signal Feeds, Decide Inbox, Security, Agent Timeline, CI/CR Radar, and Skills. Maltbot can sit in or entirely as the backend for each section.

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
| `OPENCLAW_CLI_PATH` | Optional. CLI executable (default: `openclaw` on PATH). |
| `OPENCLAW_GATEWAY_URL` | Optional. e.g. `http://127.0.0.1:18789`. When set with token, adapter may use HTTP for health/tools. |
| `OPENCLAW_GATEWAY_TOKEN` | Required when using HTTP. |
| `OPENCLAW_CLI_TIMEOUT_MS` | Optional. Default 15000 ms for most ops; status uses 5 s so the UI does not hang when the Gateway is down. |

### What is live vs mocked

- **Status / Health / Sessions / Skills / Approvals:** Served by the OpenClaw adapter (CLI or HTTP when configured). Skills are mapped to `SkillCard` with explicit defaults when OpenClaw does not provide fields (see code/README).
- **Context Hub (projects) and Decide Inbox:** Remain fully mocked. OpenClaw has no "projects" API; sessions do not provide problemSpaceMarkdown, linkedRepos, decisionLog, etc. Projects can be mapped from sessions or a future OpenClaw skill later (TODOs in code).

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
