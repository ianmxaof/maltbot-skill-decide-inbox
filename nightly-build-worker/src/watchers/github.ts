// Watches GitHub repos for new releases and issues.
// Uses the public GitHub API (no auth required for public repos, optional token for rate limits).

import { createHash } from "crypto";

export interface GithubItem {
  title: string;
  link: string;
  content: string;
  repo: string;
  type: "release" | "issue" | "pr" | "event";
  pubDate: string;
  source: string;
  contentHash: string;
}

const seenHashes = new Set<string>();

function hash(title: string, link: string): string {
  return createHash("sha256")
    .update(`${title}|${link}`)
    .digest("hex")
    .slice(0, 16);
}

async function githubFetch(url: string, token?: string): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "NightlyBuildWorker/0.1",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    if (res.status === 403) {
      console.warn(`[github] Rate limited on ${url}`);
      return null;
    }
    return null;
  }
  return res.json();
}

export async function checkRepoReleases(
  repo: string,
  token?: string
): Promise<GithubItem[]> {
  const data = (await githubFetch(
    `https://api.github.com/repos/${repo}/releases?per_page=5`,
    token
  )) as { tag_name: string; html_url: string; name?: string; body?: string; published_at: string }[] | null;
  if (!data || !Array.isArray(data)) return [];

  const items: GithubItem[] = [];
  for (const release of data) {
    const h = hash(release.tag_name, release.html_url);
    if (seenHashes.has(h)) continue;
    seenHashes.add(h);

    items.push({
      title: `${repo} ${release.tag_name}: ${release.name || "New release"}`,
      link: release.html_url,
      content: (release.body || "").slice(0, 1500),
      repo,
      type: "release",
      pubDate: release.published_at,
      source: `github:${repo}`,
      contentHash: h,
    });
  }
  return items;
}

export async function checkRepoIssues(
  repo: string,
  token?: string
): Promise<GithubItem[]> {
  const data = (await githubFetch(
    `https://api.github.com/repos/${repo}/issues?state=open&sort=created&direction=desc&per_page=5`,
    token
  )) as { title: string; html_url: string; body?: string; pull_request?: unknown; created_at: string }[] | null;
  if (!data || !Array.isArray(data)) return [];

  const items: GithubItem[] = [];
  for (const issue of data) {
    if (issue.pull_request) continue;
    const h = hash(issue.title, issue.html_url);
    if (seenHashes.has(h)) continue;
    seenHashes.add(h);

    items.push({
      title: `[${repo}] ${issue.title}`,
      link: issue.html_url,
      content: (issue.body || "").slice(0, 1500),
      repo,
      type: "issue",
      pubDate: issue.created_at,
      source: `github:${repo}`,
      contentHash: h,
    });
  }
  return items;
}

export async function checkRepos(
  repos: string[],
  options?: { token?: string; includeIssues?: boolean }
): Promise<GithubItem[]> {
  const results: GithubItem[] = [];

  for (const repo of repos) {
    const releases = await checkRepoReleases(repo, options?.token);
    results.push(...releases);

    if (options?.includeIssues) {
      const issues = await checkRepoIssues(repo, options?.token);
      results.push(...issues);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  if (seenHashes.size > 1000) {
    const arr = [...seenHashes];
    seenHashes.clear();
    arr.slice(-500).forEach((h) => seenHashes.add(h));
  }

  return results;
}
