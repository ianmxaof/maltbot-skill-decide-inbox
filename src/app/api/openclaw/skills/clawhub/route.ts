import { NextResponse } from "next/server";
import type { SkillCard } from "@/types/dashboard";

export const dynamic = "force-dynamic";

const CLAWHUB_API = "https://clawdhub.com/api/v1/skills";
const PAGE_TIMEOUT_MS = 8000;
const MAX_PAGES = 50; // safety limit

type ClawHubItem = {
  slug: string;
  displayName: string;
  summary: string | null;
  tags?: Record<string, string>;
  stats?: {
    downloads?: number;
    installsAllTime?: number;
    installsCurrent?: number;
    stars?: number;
    versions?: number;
  };
  latestVersion?: { version: string };
};

function toSkillCard(item: ClawHubItem, index: number): SkillCard {
  const stats = item.stats ?? {};
  const downloads = stats.downloads ?? 0;
  const installs = stats.installsAllTime ?? stats.installsCurrent ?? 0;
  const usageCount = Math.max(downloads, installs) || undefined;
  const version = item.latestVersion?.version;
  return {
    id: `clawhub-${item.slug}-${index}`,
    name: item.displayName || item.slug,
    description: (item.summary ?? "").trim() || `${item.displayName || item.slug} — install via ClawHub.`,
    authorId: "clawhub",
    authorName: "ClawHub Community",
    authorReputation: (stats.stars ?? 0) >= 2 ? "verified" : "community",
    dependencyRiskScore: 50,
    usageCount,
    timeToRollback: "~1min",
    hasDryRun: false,
    status: undefined,
    source: "community",
    installSlug: item.slug,
  };
}

/**
 * GET /api/openclaw/skills/clawhub
 * Fetch every community skill from ClawHub (clawdhub.com) — used for the Available tab.
 * Uses pagination to load the full catalog.
 */
export async function GET() {
  // Moltbook: URL-based install (not on ClawHub). Wire to Maltbot propose API.
  const moltbookSkill: SkillCard = {
    id: "maltbot-moltbook",
    name: "moltbook",
    description: "The social network for AI agents. Post, comment, upvote, follow. Wire to Maltbot: agent proposes → you approve in Decide Inbox.",
    authorId: "moltbook",
    authorName: "Moltbook",
    authorReputation: "verified",
    dependencyRiskScore: 15,
    usageCount: 1200,
    timeToRollback: "~30sec",
    hasDryRun: false,
    status: undefined,
    source: "maltbot-wired",
    installUrl: "https://www.moltbook.com/skill.md",
  };

  const allItems: ClawHubItem[] = [];
  let cursor: string | null = null;
  let pageCount = 0;

  try {
    do {
      const url = cursor ? `${CLAWHUB_API}?cursor=${encodeURIComponent(cursor)}` : CLAWHUB_API;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`[ClawHub] API returned ${res.status} for page ${pageCount + 1}`);
        break;
      }

      const data = (await res.json()) as { items?: ClawHubItem[]; nextCursor?: string | null };
      const items = Array.isArray(data.items) ? data.items : [];
      allItems.push(...items);
      cursor = data.nextCursor ?? null;
      pageCount++;

      if (items.length === 0 || !cursor) break;
      if (pageCount >= MAX_PAGES) {
        console.warn("[ClawHub] Reached max page limit");
        break;
      }
    } while (cursor);

    const skills = allItems.map((item, i) => toSkillCard(item, i));
    return NextResponse.json(
      {
        ok: true,
        skills: [moltbookSkill, ...skills],
        source: "clawhub",
        note: `Loaded ${skills.length} community skills from clawdhub.com`,
        totalCommunity: skills.length,
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[ClawHub] Fetch error:", err);
    return NextResponse.json(
      {
        ok: true,
        skills: [moltbookSkill],
        source: "clawhub",
        note: "ClawHub API unavailable. Using Moltbook only. Try again later.",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
