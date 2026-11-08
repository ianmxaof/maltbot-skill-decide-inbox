/**
 * GitHub OAuth — repo listing and profile access.
 * Used for "Import Your Project" (list user repos) and optional profile widget.
 */

const GITHUB_AUTH = "https://github.com/login/oauth";
const GITHUB_API = "https://api.github.com";

export function getGitHubClientId(): string {
  return process.env.GITHUB_CLIENT_ID ?? "";
}

export function getGitHubClientSecret(): string {
  return process.env.GITHUB_CLIENT_SECRET ?? "";
}

export function isGitHubConfigured(): boolean {
  return !!(getGitHubClientId() && getGitHubClientSecret());
}

/** Scopes: repo for private repo access, read:user for login/avatar. */
const SCOPES = ["read:user", "user:email", "repo"].join(" ");

/**
 * Build the GitHub authorization URL.
 */
export function buildGitHubAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getGitHubClientId(),
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${GITHUB_AUTH}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token.
 */
export async function exchangeGitHubCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string }> {
  const res = await fetch(`${GITHUB_AUTH}/access_token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: getGitHubClientId(),
      client_secret: getGitHubClientSecret(),
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub token exchange failed: ${err}`);
  }

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error) {
    throw new Error(data.error);
  }
  if (!data.access_token) {
    throw new Error("No access_token in GitHub response");
  }
  return { accessToken: data.access_token };
}

/**
 * Fetch the authenticated user's login and name.
 */
export async function fetchGitHubUser(accessToken: string): Promise<{ login: string; name?: string }> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch GitHub user");
  }
  const data = (await res.json()) as { login?: string; name?: string };
  return { login: data.login ?? "", name: data.name };
}

/**
 * List repos the authenticated user has access to (owner/repo format).
 */
export async function fetchUserRepos(accessToken: string): Promise<
  Array<{ full_name: string; html_url: string; private: boolean }>
> {
  const res = await fetch(
    `${GITHUB_API}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch GitHub repos");
  }
  const data = (await res.json()) as Array<{ full_name?: string; html_url?: string; private?: boolean }>;
  return data.map((r) => ({
    full_name: r.full_name ?? "",
    html_url: r.html_url ?? "",
    private: !!r.private,
  })).filter((r) => r.full_name);
}
