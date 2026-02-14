/**
 * Bookmark Store — Saved signals / reading list
 *
 * Users can bookmark signals from the decide inbox, feeds, or manually.
 * Bookmarks feed into the Reading List widget on the profile.
 */

import { kv } from "@/lib/db";
import type { Bookmark } from "@/types/social";

const BOOKMARK_FILE = "social-bookmarks.json";

async function readBookmarks(): Promise<Bookmark[]> {
  return (await kv.get<Bookmark[]>(BOOKMARK_FILE.replace(".json", ""))) ?? [];
}

async function writeBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await kv.set(BOOKMARK_FILE.replace(".json", ""), bookmarks);
}

/**
 * Add a bookmark. Deduplicates by URL or title+source.
 */
export async function addBookmark(
  pairId: string,
  title: string,
  source: string,
  sourceType: Bookmark["sourceType"],
  url?: string
): Promise<Bookmark> {
  const bookmarks = await readBookmarks();

  // Deduplicate
  const existing = bookmarks.find(
    b =>
      b.pairId === pairId &&
      ((url && b.url === url) || (b.title === title && b.source === source))
  );
  if (existing) return existing;

  const bookmark: Bookmark = {
    id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    pairId,
    title,
    source,
    url,
    sourceType,
    savedAt: new Date().toISOString(),
  };

  bookmarks.push(bookmark);

  // Keep last 500 per user (trim oldest)
  const userBookmarks = bookmarks.filter(b => b.pairId === pairId);
  if (userBookmarks.length > 500) {
    const toRemove = new Set(
      userBookmarks
        .sort((a, b) => a.savedAt.localeCompare(b.savedAt))
        .slice(0, userBookmarks.length - 500)
        .map(b => b.id)
    );
    const trimmed = bookmarks.filter(b => !toRemove.has(b.id));
    await writeBookmarks(trimmed);
  } else {
    await writeBookmarks(bookmarks);
  }

  return bookmark;
}

/**
 * Get bookmarks for a pair, newest first.
 */
export async function getBookmarks(
  pairId: string,
  limit = 20
): Promise<Bookmark[]> {
  const bookmarks = await readBookmarks();
  return bookmarks
    .filter(b => b.pairId === pairId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, limit);
}

/**
 * Remove a bookmark.
 */
export async function removeBookmark(
  bookmarkId: string,
  pairId: string
): Promise<boolean> {
  const bookmarks = await readBookmarks();
  const filtered = bookmarks.filter(
    b => !(b.id === bookmarkId && b.pairId === pairId)
  );
  if (filtered.length === bookmarks.length) return false;
  await writeBookmarks(filtered);
  return true;
}
