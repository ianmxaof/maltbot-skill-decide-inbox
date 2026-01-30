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
│   ├── components/
│   │   ├── DashboardTabs.tsx       # Tab navigation
│   │   ├── IdleBanner, SignalDriftBanner, WhatChangedBanner
│   │   ├── ProblemSpace, LinkedResources, DecisionLog
│   ├── data/
│   │   ├── mock-projects.ts
│   │   └── mock-dashboard.ts       # Feeds, Decide, Security, Timeline, Radar, Skills
│   ├── lib/idle.ts
│   └── types/
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
