/**
 * Moltbook API client — server-side only.
 * Uses MOLTBOOK_API_KEY. All requests go through this app; browser never calls Moltbook directly.
 *
 * API docs: https://www.moltbook.com/skill.md
 * Base: https://www.moltbook.com/api/v1
 */

const BASE = "https://www.moltbook.com/api/v1";

function getDefaultApiKey(): string | undefined {
  return process.env.MOLTBOOK_API_KEY;
}

/** Resolve API key: use provided one, else env. */
export function resolveApiKey(override?: string | null): string | undefined {
  return (override && override.trim()) || getDefaultApiKey();
}

export function isConfigured(apiKey?: string | null): boolean {
  return !!resolveApiKey(apiKey);
}

async function moltbookFetch<T>(
  path: string,
  options: RequestInit & { apiKey?: string | null } = {}
): Promise<{ success: boolean; data?: T; error?: string; hint?: string }> {
  const { apiKey: override, ...fetchOpts } = options;
  const key = resolveApiKey(override);
  if (!key) {
    return { success: false, error: "No API key", hint: "Add agent to roster or set MOLTBOOK_API_KEY in .env.local" };
  }

  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...fetchOpts,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(fetchOpts.headers as Record<string, string>),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      error: (json as { error?: string }).error || `HTTP ${res.status}`,
      hint: (json as { hint?: string }).hint,
    };
  }
  return { success: true, data: json as T };
}

// --- Raw Moltbook response shapes (partial) ---
export type MoltbookProfileAgent = {
  name: string;
  description?: string;
  karma: number;
  follower_count: number;
  following_count: number;
  is_claimed?: boolean;
  is_active?: boolean;
  created_at?: string;
  last_active?: string;
  recentPosts?: MoltbookRawPost[];
};

export type MoltbookRawPost = {
  id: string;
  title?: string;
  content?: string;
  url?: string;
  upvotes?: number;
  downvotes?: number;
  created_at?: string;
  author?: { name: string };
  submolt?: string | { name: string; display_name?: string };
};

export type MoltbookMeResponse = {
  agent?: MoltbookProfileAgent;
  success?: boolean;
};

export type MoltbookProfileResponse = {
  success: boolean;
  agent?: MoltbookProfileAgent;
};

export type MoltbookFeedResponse = {
  success?: boolean;
  posts?: MoltbookRawPost[];
};

/** Get authenticated agent's profile. Pass apiKey for roster agent. */
export async function getMe(apiKey?: string | null): Promise<{ success: boolean; agent?: MoltbookProfileAgent; error?: string }> {
  const out = await moltbookFetch<MoltbookMeResponse | MoltbookProfileAgent>("/agents/me", { apiKey });
  if (!out.success) return { success: false, error: out.error };
  const agent =
    (out.data as MoltbookMeResponse)?.agent ??
    (typeof (out.data as MoltbookProfileAgent)?.name === "string" ? (out.data as MoltbookProfileAgent) : undefined);
  return { success: true, agent };
}

/** Get another agent's public profile by name. */
export async function getProfile(
  name: string,
  apiKey?: string | null
): Promise<{ success: boolean; agent?: MoltbookProfileAgent; error?: string }> {
  const out = await moltbookFetch<MoltbookProfileResponse>(`/agents/profile?name=${encodeURIComponent(name)}`, { apiKey });
  if (!out.success) return { success: false, error: out.error };
  return { success: true, agent: out.data?.agent };
}

/** Get personalized feed (subscribed submolts + followed agents). */
export async function getFeed(opts?: {
  sort?: "hot" | "new" | "top";
  limit?: number;
  apiKey?: string | null;
}): Promise<{ success: boolean; posts?: MoltbookRawPost[]; error?: string }> {
  const params = new URLSearchParams();
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const feedPath = `/feed${qs ? `?${qs}` : ""}`;
  const out = await moltbookFetch<MoltbookFeedResponse>(feedPath, { apiKey: opts?.apiKey });
  if (!out.success) return { success: false, error: out.error };
  return { success: true, posts: out.data?.posts ?? (out.data as { posts?: MoltbookRawPost[] })?.posts };
}

/** Get latest posts globally. */
export async function getPosts(opts?: {
  submolt?: string;
  sort?: "hot" | "new" | "top" | "rising";
  limit?: number;
  apiKey?: string | null;
}): Promise<{ success: boolean; posts?: MoltbookRawPost[]; error?: string }> {
  const params = new URLSearchParams();
  if (opts?.submolt) params.set("submolt", opts.submolt);
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.limit) params.set("limit", String(opts.limit ?? 25));
  const qs = params.toString();
  const postsPath = `/posts${qs ? `?${qs}` : ""}`;
  const out = await moltbookFetch<{ posts?: MoltbookRawPost[] }>(postsPath, { apiKey: opts?.apiKey });
  if (!out.success) return { success: false, error: out.error };
  const posts = out.data?.posts ?? (out.data as { posts?: MoltbookRawPost[] })?.posts;
  return { success: true, posts };
}

/** Execute a post (create post on Moltbook). */
export async function createPost(
  params: { submolt: string; title: string; content?: string; url?: string },
  apiKey?: string | null
): Promise<{ success: boolean; error?: string }> {
  const out = await moltbookFetch<{ success?: boolean }>("/posts", {
    method: "POST",
    body: JSON.stringify(params),
    apiKey,
  });
  return { success: !!out.success, error: out.error };
}

/** Execute a comment. */
export async function createComment(
  postId: string,
  params: { content: string; parent_id?: string },
  apiKey?: string | null
): Promise<{ success: boolean; error?: string }> {
  const out = await moltbookFetch<{ success?: boolean }>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(params),
    apiKey,
  });
  return { success: !!out.success, error: out.error };
}

/** Execute a follow. */
export async function followAgent(agentName: string, apiKey?: string | null): Promise<{ success: boolean; error?: string }> {
  const out = await moltbookFetch<{ success?: boolean }>(`/agents/${encodeURIComponent(agentName)}/follow`, {
    method: "POST",
    apiKey,
  });
  return { success: !!out.success, error: out.error };
}

/** Execute create submolt. */
export async function createSubmolt(
  params: { name: string; display_name: string; description: string },
  apiKey?: string | null
): Promise<{ success: boolean; error?: string }> {
  const out = await moltbookFetch<{ success?: boolean }>("/submolts", {
    method: "POST",
    body: JSON.stringify(params),
    apiKey,
  });
  return { success: !!out.success, error: out.error };
}
