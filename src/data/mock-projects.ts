import type { Project } from "@/types/project";

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "API reliability & observability",
    problemSpaceMarkdown: `## Problem space

We need to **reduce P99 latency** and **detect regressions** before users do.

### Goals
- Define SLOs per service
- Automated runbooks when SLOs breach
- Single pane for "what changed" in the last 7 days

### Diagram (problem → solution)

\`\`\`mermaid
flowchart LR
  A[Raw metrics] --> B[SLO engine]
  B --> C[Alerts]
  C --> D[Runbooks]
  D --> E[On-call]
\`\`\`
`,
    linkedRepos: [
      { id: "r1", name: "backend-api", url: "https://github.com/org/backend-api", branch: "main", lastSyncedAt: "2025-01-28T12:00:00Z" },
      { id: "r2", name: "slo-definitions", url: "https://github.com/org/slo-definitions", lastSyncedAt: "2025-01-27T09:00:00Z" },
    ],
    linkedFeeds: [
      { id: "f1", name: "Incident RSS", urlOrSource: "https://status.example.com/feed", type: "rss", lastFetchedAt: "2025-01-29T08:00:00Z" },
    ],
    linkedAgents: [
      { id: "a1", name: "SLO Reviewer", role: "Research", lastActiveAt: "2025-01-28T14:00:00Z" },
      { id: "a2", name: "Runbook Generator", role: "Synthesis", lastActiveAt: "2025-01-27T11:00:00Z" },
    ],
    decisionLog: [
      { id: "d1", at: "2025-01-28T14:00:00Z", title: "Adopt error-budget policy", summary: "Allow 0.1% error budget per 30d window.", rationale: "Balances reliability vs. release velocity.", tags: ["slo", "policy"] },
      { id: "d2", at: "2025-01-26T10:00:00Z", title: "Add P99 to dashboard", summary: "Dashboard now shows P99 alongside P50.", rationale: "P50 hid tail latency.", tags: ["observability"] },
    ],
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-01-28T14:00:00Z",
    lastActivityAt: "2025-01-28T14:00:00Z",
  },
  {
    id: "proj-2",
    name: "Docs & onboarding",
    problemSpaceMarkdown: `## Problem space

New engineers take **weeks** to ship first PR. Docs are scattered and stale.

### Goals
- Single "start here" path
- Living docs tied to repo (not Confluence)
- Checklist that stays in sync with repo state
`,
    linkedRepos: [
      { id: "r3", name: "docs-site", url: "https://github.com/org/docs-site", lastSyncedAt: "2025-01-20T00:00:00Z" },
    ],
    linkedFeeds: [],
    linkedAgents: [{ id: "a3", name: "Doc Sync", role: "Synthesis", lastActiveAt: "2025-01-20T00:00:00Z" }],
    decisionLog: [
      { id: "d3", at: "2025-01-20T00:00:00Z", title: "Docs live in repo", summary: "Move from Confluence to repo + MD.", tags: ["docs"] },
    ],
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-01-20T00:00:00Z",
    lastActivityAt: "2025-01-20T00:00:00Z",
  },
];
