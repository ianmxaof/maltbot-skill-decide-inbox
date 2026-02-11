# The Nightly Build — Social Layer Architecture

## The Core Idea

**Your dashboard IS your profile.** The social layer isn't a separate product bolted onto an agent dashboard — it's a visibility dial on what already exists. Every section of the dashboard already generates the data that populates a social identity. The "social network" is the decision to let other users see selectively into each other's operating spaces.

## Mental Model: MySpace, Not Facebook

Facebook flattened identity into a standardized feed. MySpace let people build **spaces** that reflected them. The Nightly Build's version is even more authentic — the "space" isn't manually curated aesthetic choices, it's a living reflection of what your agent is doing, what context you're feeding it, what decisions you're making. Your dashboard **is** your profile, and it can't be faked because it's generated from real behavior.

Key differences from traditional social:
- **No algorithmic feed.** Activity from your network, chronological.
- **No engagement metrics as social currency.** No likes, no follower counts on profiles.
- **Alignment, not popularity.** Discovery is powered by governance similarity, not virality.
- **Agents as social actors through humans.** Agents don't talk to agents. Humans arbitrate.

---

## Three Visibility Rings

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  PRIVATE (default)                                      │
│  Your full dashboard. Everything your agent does.       │
│  All context, all decisions, all security data.         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  SEMI-PUBLIC (you choose)                       │   │
│  │  Which feeds you track. Which repos.            │   │
│  │  Your agent's focus areas. Decision patterns.   │   │
│  │  Your governance fingerprint summary.           │   │
│  │  Custom theming and space layout.               │   │
│  │                                                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │                                         │   │   │
│  │  │  NETWORK-EMERGENT                       │   │   │
│  │  │  Platform surfaces alignment.           │   │   │
│  │  │  "You and X govern similarly."          │   │   │
│  │  │  Group formation by monitoring +        │   │   │
│  │  │  escalation + approval patterns.        │   │   │
│  │  │                                         │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## What Already Exists (Mapped to Social)

| Existing Feature | Social Function |
|---|---|
| Pair profiles (pair management) | = User identity on the network |
| Governance fingerprint | = The behavioral signal that powers alignment matching |
| Decision provenance (audit trail) | = Activity history visible to followers |
| Context Hub (sources, repos) | = "What I'm watching" on your public space |
| Decide Inbox patterns | = Revealed preferences (approve/ignore ratios, escalation patterns) |
| Onboarding wizard (4 steps) | = Profile builder |
| Discover page | = Network browse (currently mock data) |
| Signal feeds | = Shared context between aligned users |
| Agent roster | = "Meet my agents" section of profile |

**The gap is not data. The gap is surfaces.**

---

## Implementation Status

### Phase 1: Foundation (implemented)
- Types and data models (`src/types/social.ts`)
- Visibility settings store + API (`/api/social/visibility`)
- Space theme store + API (`/api/social/theme`)
- Public space page (`/(dashboard)/space/[pairId]`)
- Follow system (`/api/social/follow`)
- Network feed (`/(dashboard)/network`)
- Discover with alignment (`/(dashboard)/network/discover`)
- Alignment engine (`src/lib/alignment-engine.ts`)
- Social feed projection from Decide Inbox
- Settings panels for Visibility and Theme

### Phase 2: Intelligence (next)
- Governance fingerprint enhancement
- Alignment score computation on schedule
- "People you might align with" suggestions
- Emergent group detection

### Phase 3: Expression
- Custom sections on spaces
- Rich theming (gradients, header images, layouts)
- Pinned contexts and featured decisions
- Profile as embeddable widget

### Phase 4: Network Effects
- Cross-pair signal sharing ("3 people in your network escalated this")
- Collaborative decision pools
- Network-wide anomaly detection
- Group governance patterns
