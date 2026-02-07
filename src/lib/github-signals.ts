/**
 * Fetch GitHub user and repo events and normalize to FeedItem[] for the Signals panel.
 * Uses GITHUB_TOKEN for higher rate limits (optional).
 */

import type { FeedItem } from "@/types/signals";

const GITHUB_API = "https://api.github.com";
const HEADERS: HeadersInit = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

type GhEvent = {
  id: string;
  type: string;
  actor?: { login?: string };
  repo?: { name?: string; url?: string };
  payload?: Record<string, unknown>;
  created_at?: string;
};

function repoUrl(name: string): string {
  return `https://github.com/${name}`;
}

function eventToFeedItem(event: GhEvent): FeedItem | null {
  const repoName = event.repo?.name ?? "";
  const actor = event.actor?.login ?? "someone";
  const createdAt = event.created_at ? new Date(event.created_at).toISOString() : new Date().toISOString();
  const id = `github-${event.id}`;
  const meta: Record<string, unknown> = {
    actor,
    repo: repoName,
    eventType: event.type,
  };

  switch (event.type) {
    case "PushEvent": {
      const ref = (event.payload?.ref as string)?.replace("refs/heads/", "") ?? "branch";
      const size = (event.payload?.size as number) ?? 0;
      const title = `Push to ${repoName}`;
      const summary = size > 0
        ? `${actor} pushed ${size} commit(s) to ${ref}`
        : `${actor} pushed to ${ref}`;
      const url = repoName ? `${repoUrl(repoName)}/commits/${ref}` : undefined;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    case "IssuesEvent": {
      const action = (event.payload?.action as string) ?? "updated";
      const issue = event.payload?.issue as { title?: string; html_url?: string } | undefined;
      const title = issue?.title ?? `Issue ${action} in ${repoName}`;
      const url = issue?.html_url ?? (repoName ? `${repoUrl(repoName)}/issues` : undefined);
      const summary = `${actor} ${action} an issue: ${title}`;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    case "IssueCommentEvent": {
      const issue = event.payload?.issue as { title?: string; html_url?: string } | undefined;
      const title = issue?.title ?? `Comment on issue in ${repoName}`;
      const url = (event.payload?.comment as { html_url?: string })?.html_url ?? issue?.html_url ?? (repoName ? repoUrl(repoName) : undefined);
      const summary = `${actor} commented on an issue`;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    case "PullRequestEvent": {
      const action = (event.payload?.action as string) ?? "updated";
      const pr = event.payload?.pull_request as { title?: string; html_url?: string } | undefined;
      const title = pr?.title ?? `PR ${action} in ${repoName}`;
      const url = pr?.html_url ?? (repoName ? `${repoUrl(repoName)}/pulls` : undefined);
      const summary = `${actor} ${action} a pull request: ${title}`;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    case "CreateEvent": {
      const refType = (event.payload?.ref_type as string) ?? "resource";
      const ref = (event.payload?.ref as string) ?? "";
      const title = `Created ${refType} in ${repoName}`;
      const summary = ref ? `${actor} created ${refType} ${ref}` : `${actor} created ${refType}`;
      const url = repoName ? repoUrl(repoName) : undefined;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    case "WatchEvent": {
      const title = `Starred ${repoName}`;
      const summary = `${actor} starred ${repoName}`;
      const url = repoName ? repoUrl(repoName) : undefined;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    case "ForkEvent": {
      const fork = event.payload?.forkee as { full_name?: string } | undefined;
      const forkName = fork?.full_name ?? "a fork";
      const title = `Forked ${repoName}`;
      const summary = `${actor} forked to ${forkName}`;
      const url = repoName ? repoUrl(repoName) : undefined;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    case "ReleaseEvent": {
      const release = event.payload?.release as { name?: string; html_url?: string } | undefined;
      const title = release?.name ?? `Release in ${repoName}`;
      const url = release?.html_url ?? (repoName ? `${repoUrl(repoName)}/releases` : undefined);
      const summary = `${actor} published a release`;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
    default: {
      const title = `${event.type} in ${repoName}`;
      const summary = `${actor} — ${event.type}`;
      const url = repoName ? repoUrl(repoName) : undefined;
      return { id, title, url, summary, source: "github", sourceId: String(event.id), createdAt, meta };
    }
  }
}

async function fetchUserEvents(username: string): Promise<FeedItem[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = { ...HEADERS };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `${GITHUB_API}/users/${encodeURIComponent(username)}/events/public?per_page=30`,
      { headers, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as GhEvent[];
    const items: FeedItem[] = [];
    for (const ev of Array.isArray(data) ? data : []) {
      const item = eventToFeedItem(ev);
      if (item) items.push(item);
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchRepoEvents(owner: string, repo: string): Promise<FeedItem[]> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = { ...HEADERS };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/events?per_page=30`,
      { headers, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as GhEvent[];
    const items: FeedItem[] = [];
    for (const ev of Array.isArray(data) ? data : []) {
      const item = eventToFeedItem(ev);
      if (item) items.push(item);
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Fetch GitHub events for configured users and repos and return normalized FeedItem[].
 * Deduplicates by item id and sorts by createdAt desc.
 */
export async function getGithubSignals(
  users: string[],
  repos: string[]
): Promise<FeedItem[]> {
  const limitUsers = users.slice(0, 5);
  const limitRepos = repos.slice(0, 10);

  const userPromises = limitUsers.map((u) => fetchUserEvents(u.trim()).catch(() => []));
  const repoPromises = limitRepos.map((r) => {
    const [owner, repo] = r.trim().split("/");
    if (!owner || !repo) return Promise.resolve([]);
    return fetchRepoEvents(owner, repo).catch(() => []);
  });

  const userArrays = await Promise.all(userPromises);
  const repoArrays = await Promise.all(repoPromises);

  const byId = new Map<string, FeedItem>();
  for (const arr of [...userArrays, ...repoArrays]) {
    for (const item of arr) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
  }

  const items = Array.from(byId.values());
  items.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  });

  return items.slice(0, 50);
}
