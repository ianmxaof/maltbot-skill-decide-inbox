/**
 * Hacker News Integration Provider — The Nightly Build
 *
 * Fetches user profile, submitted stories, and comments
 * from the HN Firebase API (public, no auth required).
 * Returns data for both the profile widget and signal feed.
 */

import type {
  HNUserProfile,
  HNItem,
  HNWidgetData,
  IntegrationProfileData,
  IntegrationSignalItem,
} from "@/types/integration";

const HN_API = "https://hacker-news.firebaseio.com/v0";

// ─── Raw API Fetchers ──────────────────────────────────────

async function fetchUser(username: string): Promise<HNUserProfile | null> {
  try {
    const res = await fetch(`${HN_API}/user/${encodeURIComponent(username)}.json`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Data Transformers ─────────────────────────────────────

function formatAge(unixTimestamp: number): string {
  const ms = Date.now() - unixTimestamp * 1000;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0 ? `${years}y ${remainingMonths}mo` : `${years} years`;
}

function formatTime(unixTimestamp?: number): string {
  if (!unixTimestamp) return new Date().toISOString();
  return new Date(unixTimestamp * 1000).toISOString();
}

function truncateHtml(html: string, maxLen = 200): string {
  // Strip HTML tags and truncate
  const text = html.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ");
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

// ─── Main Fetch Function ───────────────────────────────────

/**
 * Fetch Hacker News profile data and recent activity.
 * Returns widget data + signal items for the agent pipeline.
 */
export async function fetchHNProfileData(
  username: string
): Promise<IntegrationProfileData | null> {
  const user = await fetchUser(username);
  if (!user) return null;

  // Fetch recent submissions (stories + comments)
  const recentIds = (user.submitted ?? []).slice(0, 30);

  // Fetch items in parallel (batch of 30 max)
  const items = await Promise.all(
    recentIds.map(id => fetchItem(id))
  );
  const validItems = items.filter((i): i is HNItem => i !== null);

  // Separate stories and comments
  const stories = validItems
    .filter(i => i.type === "story" && i.title)
    .slice(0, 10);
  const comments = validItems
    .filter(i => i.type === "comment" && i.text)
    .slice(0, 5);

  // Build widget data
  const widgetData: HNWidgetData = {
    username: user.id,
    karma: user.karma,
    accountAge: formatAge(user.created),
    recentStories: stories.map(s => ({
      id: s.id,
      title: s.title!,
      url: s.url,
      score: s.score ?? 0,
      comments: s.descendants ?? 0,
      postedAt: formatTime(s.time),
    })),
    recentComments: await Promise.all(
      comments.slice(0, 3).map(async c => {
        // Try to get the parent story title
        let parentTitle: string | undefined;
        if (c.parent) {
          const parent = await fetchItem(c.parent);
          parentTitle = parent?.title ?? undefined;
        }
        return {
          id: c.id,
          parentTitle,
          text: truncateHtml(c.text ?? "", 150),
          postedAt: formatTime(c.time),
        };
      })
    ),
    topStoryScore: Math.max(0, ...stories.map(s => s.score ?? 0)),
    totalSubmissions: user.submitted?.length ?? 0,
  };

  // Build signal items (stories that could be interesting to the agent)
  const signalItems: IntegrationSignalItem[] = stories.map(s => ({
    id: `hn_${s.id}`,
    title: s.title!,
    summary: `${s.score ?? 0} points, ${s.descendants ?? 0} comments on HN`,
    url: s.url ?? `https://news.ycombinator.com/item?id=${s.id}`,
    source: "Hacker News",
    publishedAt: formatTime(s.time),
    relevanceHint: `Posted by connected user ${username}`,
  }));

  return {
    providerId: "hackernews",
    widgetData: widgetData as unknown as Record<string, unknown>,
    signalItems,
    fetchedAt: new Date().toISOString(),
  };
}
