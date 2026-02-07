/**
 * Moltbook web URLs for linking activity, anomalies, and feed items to the actual interaction on Moltbook.
 * Profile: https://www.moltbook.com/u/{name}
 * Post: https://www.moltbook.com/post/{id}
 * Submolt (community): https://www.moltbook.com/m/{name}
 */

export const MOLTBOOK_URLS = {
  profile: (name: string) => `https://www.moltbook.com/u/${encodeURIComponent(name)}`,
  post: (id: string) => `https://www.moltbook.com/post/${encodeURIComponent(id)}`,
  submolt: (name: string) => `https://www.moltbook.com/m/${encodeURIComponent(name)}`,
} as const;
