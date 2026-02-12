# Cursor Session Prompts

Copy-paste these into Cursor or Claude Code for each implementation session.
Each session builds on the previous. Don't skip ahead.

---

## Session 1: Disclosure State Machine

```
Read PROGRESSIVE-DISCLOSURE-PLAN.md for full context. Implement Phase 0: the progressive disclosure state machine.

Create:
- src/types/disclosure.ts — DisclosureStage type, DisclosureState interface, STAGE_TRANSITIONS config
- src/lib/disclosure-store.ts — file-based store following the same pattern as social-store.ts (readJson/writeJson to .data/disclosure.json)
- src/app/api/disclosure/route.ts — GET ?pairId= returns current disclosure state

Functions needed in the store:
- getDisclosureState(pairId) — returns state, creates default if missing
- recordDecision(pairId) — increments totalDecisions, updates daysActive, checks transitions
- recordWorkerIngest(pairId, count) — increments totalWorkerItems
- checkTransitions(pairId) — evaluates STAGE_TRANSITIONS conditions, advances stage, returns newly unlocked feature names

Then wire recordDecision() into the existing Decide API handlers (look in src/app/api/decide/). Wire recordWorkerIngest() into src/app/api/workers/ingest/route.ts after items are accepted.

Don't modify any UI yet — just the data layer.
```

## Session 2: Navigation Restructure

```
Read PROGRESSIVE-DISCLOSURE-PLAN.md Phase 1. Restructure the dashboard navigation.

The disclosure state machine from Session 1 is now working. Use it to control which tabs are visible.

Modify src/components/DashboardTabs.tsx:
- Fetch disclosure state for current pair
- Show 5 primary tabs: Home, Inbox, Network, Space, Workers
- Only show Network tab when features.network_feed is true
- Only show Space tab when features.space is true
- Workers and Home/Inbox are always visible after onboarding

Modify src/app/(dashboard)/network/page.tsx:
- Add internal sub-navigation (pills/tabs within the page): Feed, Discover, Pulse, Groups, Signals
- Only show sub-tabs that are unlocked in disclosure state
- The existing sub-pages at /network/discover, /network/pulse etc should still work

Absorb into Workers page (src/app/(dashboard)/workers/page.tsx):
- Add an "Activity" section that shows what's currently at /activity
- Add a "Direct to Agent" section (collapsible) for what's at /command

Don't delete any existing page routes — they should still work if navigated to directly. Just change what appears in the top navigation.

For testing: manually edit .data/disclosure.json to set different stages and verify the correct tabs appear/disappear.
```

## Session 3: First-Scan Activation

```
Read PROGRESSIVE-DISCLOSURE-PLAN.md Phase 2. Build the first-scan activation flow.

Create src/app/api/workers/first-scan/route.ts:
- POST with body { pairId }
- Read the pair's context sources from agent-pair store (the sources they set during onboarding)
- Fetch the 5 most recent items from each RSS feed (parse the XML directly, no external RSS library — look at nightly-build-worker/src/watchers/rss.ts for the parseFeed pattern)
- Fetch latest 3 releases per GitHub repo (public API, no auth)
- Score items by keyword overlap with the pair's focus areas / declared interests
- Take top 5 scoring items
- Write them to worker-decide-queue.json using the same format as the worker ingest endpoint
- Call recordWorkerIngest() from the disclosure store
- Return { itemsCreated: number }

Then wire it into onboarding completion:
- In the onboarding step 4 handler (where the pair is created), after pair creation, fire a fetch to /api/workers/first-scan in the background
- On the Home page, after onboarding redirect, show "Your agent is scanning your sources..." with a loading state
- Poll /api/workers/ingest?pairId=X&status=pending every 3 seconds until items appear
- When items arrive, show Decide Inbox preview cards with CTA to go to /decide

Test with real RSS feeds (use https://hnrss.org/newest?points=100 as a test source during onboarding).
```

## Session 4: Notifications

```
Read PROGRESSIVE-DISCLOSURE-PLAN.md Phase 3. Build the in-app notification system.

Create:
- src/lib/notification-store.ts — file-based store for notifications (.data/notifications.json)
  - createNotification(pairId, type, title, body, route?)
  - getUnreadNotifications(pairId, limit?)
  - markRead(notificationId)
  - getUnreadCount(pairId)
- src/app/api/notifications/route.ts
  - GET ?pairId= — returns unread notifications
  - POST — mark notification as read (body: { notificationId })

Add notification bell to src/components/DashboardHeaderAuth.tsx:
- Show unread count badge (red circle with number)
- Click opens dropdown panel with recent notifications
- Each notification has: icon (by type), title, body, time ago, link

Create notifications at these trigger points:
- disclosure-store.ts checkTransitions() — when stage advances, create feature_unlock notification
- workers/ingest route — when items are ingested, create agent_discovery notification (throttle: max 1 per hour per pair)
- convergence-engine.ts — when convergence detected, create network_convergence notification

Add toast rendering: when user is on the platform, poll /api/notifications every 30 seconds. If new notifications since last check, show a toast using the existing ToastProvider.
```

## Session 5: Home Redesign

```
Read PROGRESSIVE-DISCLOSURE-PLAN.md Phase 4. Redesign the Home page with progressive sections.

Modify src/app/(dashboard)/home/page.tsx:

Fetch disclosure state on load. Render sections based on current stage:

Always visible:
- Decide Inbox preview (fetch pending items from /api/workers/ingest?status=pending, show top 3 as cards, link to /decide)
- Worker fleet status (fetch from /api/workers/register, show status dots)
- Quick stats row: decisions today, items surfaced today, streak (consecutive days active)

Visible at daily_driver+:
- Governance fingerprint mini-card (approval rate, escalation rate, top domains, decision velocity)
- Weekly summary: "Your agent surfaced X items this week. You approved Y."

Visible at networked+:
- Network activity preview (fetch from /api/social/feed, show latest 3 items)
- Alignment highlight if available (fetch from /api/social/alignment)

Visible at deep+:
- Convergence alerts (fetch from /api/network/signals, show top active convergences)
- Group proposals preview (fetch from /api/network/pools?status=open)

Design: dark theme consistent with existing dashboard. Each section is a card with rounded corners and subtle borders. Use the existing Tailwind classes from other dashboard pages for consistency.
```

## Session 6: Cooling + Celebrations

```
Read PROGRESSIVE-DISCLOSURE-PLAN.md Phase 5 and 6. Build cooling period UX and stage transition celebrations.

Cooling banner:
- After user makes their first 1-3 decisions (check disclosure state: stage is 'activation' and totalDecisions >= 1)
- Show a banner on Home page: "Your agent is running. We'll notify you when something needs your attention. Come back tomorrow."
- Dismissible (store cooldownBannerDismissed in disclosure state)
- "Set up notifications" button → browser notification permission prompt

Stage celebrations:
- Add pendingCelebration field to DisclosureState (string | null, set to the stage name when transition occurs)
- On Home page load, check for pendingCelebration
- activation → daily_driver: Toast with "Your Space is now live" + link
- daily_driver → networked: Modal with "Your governance fingerprint can now find similar people" + CTA to Network
- networked → deep: Toast with "Pulse, Groups, and Signals are now available"
- deep → full_citizen: Toast with "All features unlocked. Welcome."
- After showing, clear pendingCelebration via API call

"New" badges:
- When new tabs appear in navigation (from disclosure state change), show a small "new" pill badge
- Track which tabs have been visited post-unlock in disclosure state (visitedFeatures: string[])
- Badge disappears after first visit to that tab
```

---

## Deployment Session (when ready)

```
I want to deploy The Nightly Build to Vercel with the domain thenightlybuild.com.

Current state: file-based JSON stores in .data/ directory. This won't persist on Vercel's ephemeral filesystem.

Migration plan:
1. Install @vercel/kv
2. Create a shared KV helper that replaces readJson/writeJson across all stores
3. Each store keeps its current interface — just swap the persistence layer
4. Stores to migrate: disclosure-store, notification-store, social-store, network-store, worker-store, agent-pair-store, activity-feed-store

Then:
- Set up Vercel project
- Configure environment variables (AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN)
- Configure domain: thenightlybuild.com
- Set up Vercel Cron for /api/network/cron
- Deploy
```
