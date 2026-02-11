# Network Effects Layer — Integration Guide

## Where Each File Goes

```
src/
├── types/
│   └── network.ts                              — All network-effect types
│
├── lib/
│   ├── network-store.ts                        — Persistence for groups, convergences, pulse, pools
│   ├── convergence-engine.ts                   — Cross-pair signal convergence detection
│   ├── pulse-engine.ts                         — Collective heartbeat computation
│   └── group-engine.ts                         — Emergent group detection and management
│
├── app/
│   ├── api/network/
│   │   ├── groups/route.ts                     — Groups API (list, claim)
│   │   ├── signals/route.ts                    — Convergence API
│   │   ├── pulse/route.ts                      — Pulse API
│   │   ├── pools/route.ts                      — Decision pools API (create, vote, close)
│   │   └── cron/route.ts                       — Scheduled computation endpoint
│   │
│   └── (dashboard)/network/
│       ├── page.tsx                             (existing — social feed)
│       ├── discover/page.tsx                    (existing — pair discovery)
│       ├── pulse/page.tsx                       — Network heartbeat dashboard
│       ├── groups/
│       │   ├── page.tsx                         — Emergent groups listing
│       │   └── [slug]/page.tsx                  — Group detail + decision pools
│       └── signals/page.tsx                     — Signal convergences view
│
├── components/network/
│   └── ConvergenceBadge.tsx                    — Inline "3 others also acted" badge
│
└── ...existing files unchanged...
```

## Data Files (auto-created in .data/)

```
.data/
├── network-groups.json           — emergent groups
├── network-memberships.json      — group membership records
├── network-convergences.json     — detected signal convergences
├── network-pulse.json            — latest pulse snapshot
├── network-pulse-history.json    — pulse history (7 days, hourly)
├── network-decision-pools.json   — collaborative decision pools
└── ...existing social-*.json files...
```

## Cron Schedule (vercel.json)

- **Every 15 minutes** (`/api/network/cron?scope=fast`): Convergence detection + pulse computation
- **Every hour** (`/api/network/cron?scope=heavy`): Group detection + alignment recomputation

Optional: Set `CRON_SECRET` env var to protect the cron endpoint.

## Feature Summary

### Emergent Groups
- Auto-detection via BFS clustering on fingerprint similarity (>55% threshold)
- Claiming: members can rename, describe, and take ownership
- Shared sources: repos/feeds tracked by 50%+ of members
- Collective fingerprint: natural language governance summary
- Decision pools: group members create shared decisions, vote with quorum/consensus

### Signal Convergence
- Detection: regex-based signal extraction from activity summaries
- Types: escalation clusters, tracking waves, decision alignment, anomaly consensus, context convergence
- Relevance scoring: viewer-specific based on follows + alignment
- Velocity tracking: pairs per hour
- Inline badge: ConvergenceBadge component for feed embedding

### Network Pulse
- Activity volume: decisions, approvals, escalations, ignores
- Velocity with trend detection (accelerating/steady/slowing)
- Collective posture: conservative/moderate/aggressive
- Consensus strength: how aligned the network is overall
- Trending signals: repos, CVEs, topics getting the most attention
- Anomalies: velocity spikes, escalation surges, silence periods
- 7-day hourly history for trend charts

### Decision Pools
- Group-scoped: only group members can vote
- 2-5 options per decision
- Configurable quorum and consensus threshold (default 60%)
- Auto-resolution when quorum + consensus met
- All votes visible with optional reasoning
