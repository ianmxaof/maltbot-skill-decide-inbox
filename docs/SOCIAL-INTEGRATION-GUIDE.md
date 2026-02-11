# Social Layer Integration Guide

## File Map

```
src/
├── types/
│   └── social.ts                          — Social type definitions
│
├── lib/
│   ├── social-store.ts                    — File-based persistence for social data
│   └── alignment-engine.ts                — Governance similarity computation
│
├── app/
│   ├── api/social/
│   │   ├── follow/route.ts                — Follow/unfollow API
│   │   ├── feed/route.ts                  — Social feed API
│   │   ├── visibility/route.ts            — Visibility settings API
│   │   ├── theme/route.ts                 — Space theme API
│   │   ├── alignment/route.ts             — Alignment scores API
│   │   └── space/[pairId]/route.ts        — Public space data API
│   │
│   └── (dashboard)/
│       ├── space/[pairId]/page.tsx         — Public profile page (MySpace-style)
│       ├── network/
│       │   ├── page.tsx                    — Social feed from followed pairs
│       │   └── discover/page.tsx           — Alignment-based discovery
│       └── ...existing pages...
│
├── components/social/
│   ├── AlignmentBadge.tsx                 — Alignment score display
│   ├── SocialActivityItem.tsx             — Activity feed item
│   ├── FollowButton.tsx                   — Follow/unfollow toggle
│   ├── SourceTag.tsx                      — Context source tag
│   ├── FingerprintCard.tsx                — Governance fingerprint card
│   ├── VisibilityControls.tsx             — Per-section privacy toggles
│   ├── SpaceThemeEditor.tsx               — Space customization panel
│   └── index.ts                           — Barrel exports
│
└── ...existing files unchanged...
```

## Data Files (auto-generated in .data/)

```
.data/
├── social-visibility.json    — per-pair visibility settings
├── social-themes.json        — per-pair space themes
├── social-follows.json       — follow relationships
├── social-activity.json      — network activity feed
├── social-alignment.json     — alignment scores
└── social-fingerprints.json  — enhanced governance fingerprints
```

## Integration Points (changes to existing code)

### 1. DashboardTabs.tsx — Social navigation added
Network and Discover tabs added to the existing tab array.

### 2. Decide Inbox handlers — Social feed projection
Both execute and ignore handlers now call `projectDecisionToFeed()` to surface
decisions in the social feed (respects visibility settings).

### 3. Settings page — Visibility and Theme panels
Two new panels added at the top of the settings page (only shown when a pair exists).

### 4. Landing page — Real data
`MOCK_FEATURED` replaced with a fetch to `/api/discover` for real public pairs.
"See Public Profiles" now links to `/network/discover`.

### 5. Discover page — Redirect
Old `/discover` page now redirects to `/network/discover`.

## What This Does NOT Change

- No existing routes modified (only additive imports)
- No existing components replaced
- No existing data stores touched
- No existing types altered
- All social data in separate JSON files
- Social features degrade gracefully if no social data exists
