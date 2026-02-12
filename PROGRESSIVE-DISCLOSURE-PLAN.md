# The Nightly Build — Progressive Disclosure Implementation Plan

## Context for AI Assistant

This document is an implementation plan for The Nightly Build, a Next.js platform at `maltbot-skill-decide-inbox` (branch: `feature/readme-nightly-build-integrations`). The developer works in Cursor with Claude Code in terminal. Use this document as the source of truth for what to build and in what order.

**Do not build everything at once.** This plan is sequential. Each phase depends on the previous phase working. The developer will tell you which phase to implement.

---

## Current State

The codebase has 14 dashboard tabs, all visible simultaneously:
Dashboard, Direct to Agent, Network, Decide Inbox, Discover, Pulse, Groups, Signals, Activity, Workers, Moltbook Hub, Security, Command Center, Settings.

The social layer, network effects, worker fleet, auth/onboarding, and security are all implemented with file-based stores in `.data/`. The core loop (worker → ingest → Decide Inbox → social feed) has API routes but hasn't been used end-to-end by a real user yet.

**Goal:** Restructure to 5 primary tabs with progressive disclosure over 30 days. Features unlock based on user activity, not time alone. The platform feels simple on day 1 and deep on day 30.

---

## Phase 0: Progressive Disclosure State Machine

**What:** A per-pair state tracker that controls which features are visible.

**Why:** Everything else depends on knowing what stage a user is in.

### New type: `src/types/disclosure.ts`

```typescript
// The stages a user progresses through.
// Transitions are triggered by activity thresholds, not time alone.
export type DisclosureStage =
  | 'onboarding'     // completing the 4-step wizard
  | 'activation'     // first scan, first decisions
  | 'daily_driver'   // days 1-7, using Inbox regularly
  | 'networked'      // days 7-14, enough data for social matching
  | 'deep'           // days 14-21, groups/signals/pulse meaningful
  | 'full_citizen';  // day 21+, all features available

export interface DisclosureState {
  pairId: string;
  stage: DisclosureStage;
  createdAt: string;           // when pair was created (onboarding complete)

  // Activity counters (drive stage transitions)
  totalDecisions: number;      // approve + ignore + escalate in Decide Inbox
  totalWorkerItems: number;    // items ingested by workers
  daysActive: number;          // distinct days with at least 1 decision
  firstDecisionAt?: string;
  lastDecisionAt?: string;

  // Feature unlock flags (set true when stage transition grants access)
  features: {
    inbox: boolean;            // always true after onboarding
    workers: boolean;          // always true after onboarding
    space: boolean;            // unlocked at daily_driver (5+ decisions)
    network_feed: boolean;     // unlocked at networked (7+ days active OR 30+ decisions)
    network_discover: boolean; // unlocked at networked
    network_pulse: boolean;    // unlocked at deep (14+ days active OR 75+ decisions)
    network_groups: boolean;   // unlocked at deep
    network_signals: boolean;  // unlocked at deep
    command_center: boolean;   // unlocked at full_citizen + has API keys configured
    security_vault: boolean;   // unlocked at full_citizen + has VAULT_MASTER_PASSWORD
    moltbook: boolean;         // unlocked when MOLTBOOK_API_KEY is set
    direct_to_agent: boolean;  // unlocked at daily_driver
  };

  // Notification tracking (prevent spam)
  lastNotificationAt?: string;
  notificationsSent: string[];   // IDs of notifications already sent
  
  // Stage transition history
  transitions: {
    stage: DisclosureStage;
    at: string;
    trigger: string;           // what caused the transition
  }[];
}

// Transition rules
export const STAGE_TRANSITIONS: Record<DisclosureStage, {
  next: DisclosureStage;
  conditions: (state: DisclosureState) => boolean;
  trigger: string;
  unlocks: (keyof DisclosureState['features'])[];
}> = {
  onboarding: {
    next: 'activation',
    conditions: () => true, // transitions immediately when onboarding completes
    trigger: 'onboarding_complete',
    unlocks: ['inbox', 'workers'],
  },
  activation: {
    next: 'daily_driver',
    conditions: (s) => s.totalDecisions >= 3,
    trigger: 'first_3_decisions',
    unlocks: ['space', 'direct_to_agent'],
  },
  daily_driver: {
    next: 'networked',
    conditions: (s) => s.daysActive >= 7 || s.totalDecisions >= 30,
    trigger: 'sustained_usage',
    unlocks: ['network_feed', 'network_discover'],
  },
  networked: {
    next: 'deep',
    conditions: (s) => s.daysActive >= 14 || s.totalDecisions >= 75,
    trigger: 'deep_engagement',
    unlocks: ['network_pulse', 'network_groups', 'network_signals'],
  },
  deep: {
    next: 'full_citizen',
    conditions: (s) => s.daysActive >= 21 || s.totalDecisions >= 100,
    trigger: 'full_citizen',
    unlocks: ['command_center', 'security_vault'],
  },
  full_citizen: {
    next: 'full_citizen', // terminal
    conditions: () => false,
    trigger: '',
    unlocks: [],
  },
};
```

### New store: `src/lib/disclosure-store.ts`

Follow the same pattern as `social-store.ts` and `worker-store.ts`:
- Read/write from `.data/disclosure.json`
- `getDisclosureState(pairId)` — returns current state, creates default if missing
- `recordDecision(pairId)` — increments counter, checks stage transitions
- `recordWorkerIngest(pairId, count)` — increments counter
- `checkTransitions(pairId)` — evaluates all transition conditions, advances stage if met, returns list of newly unlocked features
- `getVisibleTabs(pairId)` — returns the tab configuration for the current stage

### Integration point: call `recordDecision()` from the existing Decide API handlers

In `src/app/api/decide/*/route.ts` (and `src/app/api/workers/ingest/route.ts`), after a decision is made or item ingested, call the disclosure store to update counters and check transitions.

---

## Phase 1: Navigation Restructure

**What:** Collapse 14 tabs into 5 primary tabs. Existing pages remain at their URLs; only the navigation chrome changes.

**Why:** This is the single highest-impact UX change. No new features, just better organization.

### New primary navigation (5 tabs):

| Tab | Icon | Route | Contains |
|-----|------|-------|----------|
| **Home** | 🏠 | `/home` | Dashboard overview, Decide Inbox preview, recent activity, worker status summary |
| **Inbox** | 📥 | `/decide` | Full Decide Inbox (existing page) |
| **Network** | 🌐 | `/network` | Sub-nav: Feed, Discover, Pulse, Groups, Signals |
| **Space** | ✨ | `/space/[myPairId]` | My profile, Settings integrated as "Edit Space" |
| **Workers** | 🤖 | `/workers` | Worker fleet, Activity feed, Direct to Agent |

### Modify: `src/components/DashboardTabs.tsx`

This is the main file to change. Replace the flat tab list with:

```typescript
// Pseudocode for the new navigation structure
function getVisibleTabs(disclosureState: DisclosureState): Tab[] {
  const tabs: Tab[] = [
    { label: 'Home', href: '/home', icon: 'home', always: true },
    { label: 'Inbox', href: '/decide', icon: 'inbox', always: true },
  ];

  // Network appears as single tab; sub-items are within the page
  if (disclosureState.features.network_feed) {
    tabs.push({ label: 'Network', href: '/network', icon: 'globe' });
  }

  // Space appears after daily_driver
  if (disclosureState.features.space) {
    tabs.push({ label: 'Space', href: `/space/${pairId}`, icon: 'sparkles' });
  }

  // Workers always visible after onboarding
  if (disclosureState.features.workers) {
    tabs.push({ label: 'Workers', href: '/workers', icon: 'bot' });
  }

  return tabs;
}
```

### Modify: Network page sub-navigation

`src/app/(dashboard)/network/page.tsx` should have internal tabs/pills:
- Feed (the social feed from followed pairs)
- Discover (alignment-based discovery)
- Pulse (network heartbeat) — only visible when `features.network_pulse`
- Groups — only visible when `features.network_groups`
- Signals — only visible when `features.network_signals`

Each sub-view page already exists at `/network/discover`, `/network/pulse`, etc. The change is making the parent `/network` page a layout with sub-navigation instead of a standalone page.

### Modify: Workers page absorption

`/workers` page should include:
- Worker fleet status (existing)
- Activity feed (move from `/activity`, or embed as a section)
- Direct to Agent (move from `/command`, or embed as a collapsible section)

### Move to Settings/Space:

- Security → accessible from Space (under "Security" section) or from Settings
- Command Center → accessible from Workers (as "Advanced" section) or from a "more" menu
- Moltbook Hub → accessible from Workers (as an integration panel) when MOLTBOOK_API_KEY is set

### Important: Don't delete any existing pages or routes.

All existing routes (`/network/discover`, `/network/pulse`, `/activity`, `/security`, etc.) must continue to work. Only the top-level navigation changes. Users who have bookmarked deep URLs should not break.

---

## Phase 2: First-Scan Activation Flow

**What:** When a user completes onboarding, immediately scan their declared sources and populate the Decide Inbox with real items. The user should see items within 60 seconds of finishing onboarding.

**Why:** This is the "aha moment." Without this, the user finishes onboarding, sees an empty dashboard, and closes the tab.

### New API route: `src/app/api/workers/first-scan/route.ts`

This runs server-side (no local Ollama needed). It:

1. Reads the pair's context sources from the agent-pair store (RSS feeds, GitHub repos added during onboarding)
2. Fetches the most recent 5 items from each source (RSS parse, GitHub API)
3. Does keyword-based relevance scoring against the pair's declared interests (no LLM needed — simple keyword matching for speed)
4. Creates 3-5 items in the Decide Inbox queue (via the same `worker-decide-queue.json` store the worker uses)
5. Projects items to the activity feed

```typescript
// POST /api/workers/first-scan
// Body: { pairId: string }
// Called once, immediately after onboarding step 4 completes.
//
// This uses the SAME ingestion pipeline as the worker daemon,
// but runs server-side without Ollama. It uses keyword matching
// instead of LLM evaluation for speed.
//
// The items it creates are real — from the user's actual sources.
// They are NOT mock data.
```

### Implementation notes:

- Reuse the RSS parsing logic from `nightly-build-worker/src/watchers/rss.ts` — extract the core `parseFeed()` and `stripHtml()` functions into a shared utility, or duplicate them in a server-side lib file.
- For GitHub, use the public API (no auth needed for public repos). Fetch latest 3 releases + 3 issues per repo.
- Keyword scoring: tokenize the pair's `focusAreas` and `contextSources` labels, score each item by keyword overlap. Take top 5.
- Write results to `worker-decide-queue.json` using the same format the worker ingest endpoint uses.
- Increment the disclosure state: `recordWorkerIngest(pairId, count)`.

### Integration point: call first-scan from onboarding completion

In the onboarding step 4 completion handler (wherever the pair is created and saved), after creating the pair:

```typescript
// Fire and don't await — let it run in background
fetch('/api/workers/first-scan', {
  method: 'POST',
  body: JSON.stringify({ pairId: newPair.id }),
});
```

Then redirect the user to `/home`. The Home page should poll or use a simple interval to check for new Decide Inbox items and show them as they arrive.

### UX on the Home page post-onboarding:

Show a brief loading state: "Your agent is scanning your sources..." with a subtle animation. When items arrive (poll `/api/workers/ingest?pairId=X&status=pending` every 3 seconds), transition to showing the Decide Inbox preview cards. Include a CTA: "3 items need your attention" → links to `/decide`.

---

## Phase 3: Notification System

**What:** Notifications that bring users back to the platform. Three types: agent discoveries, network activity, feature unlocks.

**Why:** The cooling period only works if there's a mechanism to pull users back with value.

### New type additions to `src/types/disclosure.ts`:

```typescript
export type NotificationType =
  | 'agent_discovery'      // "Your agent found 3 items for [Project]"
  | 'network_convergence'  // "2 people in your network flagged the same thing"
  | 'feature_unlock'       // "Your activity unlocked Network features"
  | 'milestone'            // "You've made 50 decisions this month"
  | 'weekly_digest';       // "Here's what your agent found this week"

export interface PlatformNotification {
  id: string;
  pairId: string;
  type: NotificationType;
  title: string;
  body: string;
  route?: string;          // where to navigate when clicked
  read: boolean;
  createdAt: string;
}
```

### New store: `src/lib/notification-store.ts`

Same file-based pattern. `.data/notifications.json`.
- `createNotification(pairId, type, title, body, route?)`
- `getUnreadNotifications(pairId)`
- `markRead(notificationId)`
- `getNotificationCount(pairId)` — for the badge in the UI

### In-app notifications (Phase 3a — build this first):

Add a notification bell icon in the dashboard header (`DashboardHeaderAuth.tsx`). Shows unread count badge. Clicking opens a dropdown with recent notifications. Each notification links to the relevant page.

Notifications are created by:
- `disclosure-store.ts` when a stage transition occurs → feature_unlock notification
- `worker ingest route` when new items arrive → agent_discovery notification (throttled: max 1 per hour)
- `convergence-engine.ts` when convergence detected → network_convergence notification
- A cron job (weekly) → weekly_digest notification

### Toast notifications (Phase 3b):

When the user is on the platform and a new notification arrives, show a toast. Use the existing `ToastProvider.tsx`. Poll `/api/notifications?pairId=X&since={lastCheck}` every 30 seconds while the tab is active.

### Email/push notifications (Phase 3c — future, not now):

Don't build this yet. In-app + toast is sufficient for MVP. Email can come when there are enough users to justify the infrastructure (Resend, SendGrid, etc.).

---

## Phase 4: Home Page Redesign

**What:** The `/home` page becomes the primary landing pad that reflects the user's current disclosure stage.

**Why:** The home page is where every session starts. It should answer "what happened while I was away?" in 5 seconds.

### Home page sections (progressive):

**Always visible:**
- Decide Inbox preview: "X items need your attention" with the top 3 cards
- Worker status: green/yellow/red dots for connected workers
- Quick stats: decisions today, items surfaced today, streak (days active)

**Visible at `daily_driver` stage:**
- Governance fingerprint mini-card: approval rate, top domains, decision velocity
- "Your agent found X items this week" summary

**Visible at `networked` stage:**
- Network activity preview: "X people in your network made decisions today"
- Alignment highlight: "You and [pair] have 87% alignment on AI governance signals"

**Visible at `deep` stage:**
- Convergence alerts: "3 pairs flagged [signal] in the last 24h"
- Group activity: "[Group name] has 2 new proposals"

### Implementation:

Modify `src/app/(dashboard)/home/page.tsx`. Fetch the disclosure state via API. Conditionally render sections based on `features` flags. Each section is a component that fetches its own data.

---

## Phase 5: Cooling Period UX

**What:** After the first session, the platform explicitly tells the user to leave and come back later.

**Why:** Prevents overwhelm. Sets the expectation that value comes over time, not all at once.

### Post-first-session state:

After the user completes onboarding AND makes their first 1-3 decisions in the Decide Inbox, show a "cooling" overlay or banner on the Home page:

```
┌─────────────────────────────────────────────────┐
│  🌙 Your agent is running.                      │
│                                                   │
│  You've made your first decisions. Your agent     │
│  will keep scanning your sources and surface      │
│  new items as they appear.                       │
│                                                   │
│  We'll notify you when something needs your      │
│  attention. Come back tomorrow for your next      │
│  batch.                                          │
│                                                   │
│  [Got it]                [Set up notifications]  │
└─────────────────────────────────────────────────┘
```

This is a one-time dismissible banner stored in the disclosure state (`cooldownBannerDismissed: boolean`). The "Set up notifications" button goes to notification preferences (browser notification permission prompt or email setup).

---

## Phase 6: Stage Transition Celebrations

**What:** When the user hits a new disclosure stage, celebrate it and introduce the newly unlocked features.

**Why:** Creates a sense of progression. Gamification without being gamey.

### Transition moments:

**activation → daily_driver (after 3 decisions):**
Toast: "Nice. Your Space is now live — see how your decisions look as a profile."
Unlock: Space tab appears in navigation with a subtle "new" badge.

**daily_driver → networked (after 7 days or 30 decisions):**
Full-screen moment (modal or interstitial):
"You've been governing your agent for a week. Your governance fingerprint is now rich enough to find people who think like you."
CTA: "See your network" → Network tab appears.

**networked → deep (after 14 days or 75 decisions):**
Toast: "Your network has depth now. Pulse, Groups, and Signals are live."
Sub-tabs light up within Network.

**deep → full_citizen (after 21 days or 100 decisions):**
Toast: "You're a full citizen of The Nightly Build. All features unlocked."
Any remaining hidden features become visible.

### Implementation:

In the disclosure store, when `checkTransitions()` returns newly unlocked features:
1. Create a `feature_unlock` notification
2. Set a `pendingCelebration` field in the disclosure state
3. The Home page checks for `pendingCelebration` on load and shows the appropriate celebration UI
4. After the user acknowledges, clear `pendingCelebration`

---

## Build Order (for Cursor sessions)

This is the order to implement. Each step should be a working increment.

### Session 1: Disclosure state machine
- Create `src/types/disclosure.ts`
- Create `src/lib/disclosure-store.ts`
- Create `src/app/api/disclosure/route.ts` (GET current state for a pairId)
- Wire `recordDecision()` into existing Decide API handlers
- Wire `recordWorkerIngest()` into worker ingest route
- Test: make decisions via API, verify state transitions

### Session 2: Navigation restructure
- Modify `DashboardTabs.tsx` to consume disclosure state
- Show only unlocked tabs
- Add sub-navigation within Network page
- Absorb Activity and Direct to Agent into Workers page
- Move Security and Command Center to settings/advanced
- Test: manually set disclosure stages, verify correct tabs appear

### Session 3: First-scan activation
- Create `src/app/api/workers/first-scan/route.ts`
- Extract RSS/GitHub fetching into shared server-side utils
- Implement keyword-based scoring (no Ollama)
- Fire first-scan on onboarding completion
- Add polling/loading state to Home page
- Test: complete onboarding with real RSS feeds, verify items appear in Decide Inbox

### Session 4: Notification system
- Create `src/types/notification.ts` (or add to disclosure.ts)
- Create `src/lib/notification-store.ts`
- Create `src/app/api/notifications/route.ts`
- Add notification bell to dashboard header
- Create notifications on: stage transitions, worker ingestion (throttled), convergence
- Add toast rendering for new notifications
- Test: trigger various notification types, verify they appear

### Session 5: Home page redesign
- Redesign `/home` to show progressive sections based on disclosure state
- Decide Inbox preview (always)
- Worker status (always)
- Governance fingerprint (daily_driver+)
- Network preview (networked+)
- Convergence alerts (deep+)
- Test: set different stages, verify correct sections render

### Session 6: Cooling period + celebrations
- Add cooling banner after first decisions
- Add celebration modals/toasts for stage transitions
- Add "new" badges on newly unlocked tabs
- Test: walk through the full onboarding → first decisions → cooling → return flow

---

## Files to create (new):

```
src/types/disclosure.ts
src/lib/disclosure-store.ts
src/lib/notification-store.ts
src/app/api/disclosure/route.ts
src/app/api/notifications/route.ts
src/app/api/workers/first-scan/route.ts
```

## Files to modify (existing):

```
src/components/DashboardTabs.tsx           — navigation restructure
src/components/DashboardHeaderAuth.tsx     — notification bell
src/app/(dashboard)/home/page.tsx          — progressive home sections
src/app/(dashboard)/network/page.tsx       — sub-navigation layout
src/app/(dashboard)/workers/page.tsx       — absorb activity + direct-to-agent
src/app/api/decide/*/route.ts              — call recordDecision()
src/app/api/workers/ingest/route.ts        — call recordWorkerIngest()
src/app/(onboard)/onboard/4/page.tsx       — trigger first-scan on completion
```

## Files to NOT delete:

All existing page routes remain. `/activity`, `/security`, `/command-center`, `/moltbook`, etc. still work if navigated to directly. They're just not in the primary navigation for early-stage users.

---

## Vercel Deployment Notes

The platform deploys to Vercel as a standard Next.js app. The file-based stores (`.data/*.json`) work in development but need a database for production (Vercel's filesystem is ephemeral). Options ranked by effort:

1. **Vercel KV (Redis)** — drop-in for key-value JSON stores. Minimal migration: replace `readJson/writeJson` with KV get/set. ~2 hours of work.
2. **Vercel Postgres** — proper relational DB. More work but better for queries. ~1 day.
3. **Turso (SQLite at the edge)** — good middle ground. ~4 hours.

For MVP launch on Vercel: use Vercel KV. Migrate the `readJson/writeJson` helpers in each store to use `@vercel/kv`. The store interfaces don't change — only the persistence layer underneath.

Domain: `thenightlybuild.com` (available on Namecheap). Point it to the Vercel deployment. Vercel handles SSL automatically.

---

## What This Plan Does NOT Cover (future work):

- Email notifications (use in-app only for now)
- Browser push notifications (requires service worker setup)
- Real-time updates via WebSocket/SSE (polling is fine for MVP)
- Mobile app (responsive web is sufficient)
- Payment/subscription (free tier first, monetize later)
- Agent creation within the platform (connect existing agents first)
- Feedly API integration (use RSS export URLs for now)
- Multi-user database migration (Vercel KV when deploying)
