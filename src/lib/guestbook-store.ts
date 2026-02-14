/**
 * Guestbook Store — Profile visitor messages
 *
 * Classic MySpace guestbook. Short messages from visitors,
 * displayed on the profile. Owner can hide entries.
 */

import { kv } from "@/lib/db";
import type { GuestbookEntry } from "@/types/social";

const GUESTBOOK_FILE = "social-guestbook.json";

async function readGuestbook(): Promise<GuestbookEntry[]> {
  return (await kv.get<GuestbookEntry[]>(GUESTBOOK_FILE.replace(".json", ""))) ?? [];
}

async function writeGuestbook(entries: GuestbookEntry[]): Promise<void> {
  await kv.set(GUESTBOOK_FILE.replace(".json", ""), entries);
}

/**
 * Add a guestbook entry. Max 280 characters.
 * Rate limit: one entry per author per target per hour.
 */
export async function addGuestbookEntry(
  targetPairId: string,
  authorPairId: string,
  authorName: string,
  message: string
): Promise<GuestbookEntry> {
  if (message.length > 280) {
    throw new Error("Message too long (max 280 characters)");
  }
  if (!message.trim()) {
    throw new Error("Message cannot be empty");
  }

  const entries = await readGuestbook();

  // Rate limit: one per author per target per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentFromAuthor = entries.find(
    e =>
      e.targetPairId === targetPairId &&
      e.authorPairId === authorPairId &&
      e.createdAt > oneHourAgo
  );
  if (recentFromAuthor) {
    throw new Error("You can only leave one message per hour");
  }

  const entry: GuestbookEntry = {
    id: `gb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    targetPairId,
    authorPairId,
    authorName,
    message: message.trim(),
    hidden: false,
    createdAt: new Date().toISOString(),
  };

  entries.push(entry);

  // Keep last 2000 entries to prevent unbounded growth
  const trimmed = entries.slice(-2000);
  await writeGuestbook(trimmed);
  return entry;
}

/**
 * Get visible guestbook entries for a pair's profile.
 * Hidden entries are excluded unless the viewer is the profile owner.
 */
export async function getGuestbookEntries(
  targetPairId: string,
  options?: { includeHidden?: boolean; limit?: number }
): Promise<GuestbookEntry[]> {
  const entries = await readGuestbook();
  let filtered = entries.filter(e => e.targetPairId === targetPairId);

  if (!options?.includeHidden) {
    filtered = filtered.filter(e => !e.hidden);
  }

  // Newest first
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return filtered.slice(0, options?.limit ?? 20);
}

/**
 * Toggle hidden state for a guestbook entry.
 * Only the profile owner should call this.
 */
export async function toggleGuestbookEntryVisibility(
  entryId: string,
  targetPairId: string
): Promise<boolean> {
  const entries = await readGuestbook();
  const entry = entries.find(e => e.id === entryId && e.targetPairId === targetPairId);
  if (!entry) return false;

  entry.hidden = !entry.hidden;
  await writeGuestbook(entries);
  return true;
}

/**
 * Delete a guestbook entry. Only the profile owner should call this.
 */
export async function deleteGuestbookEntry(
  entryId: string,
  targetPairId: string
): Promise<boolean> {
  const entries = await readGuestbook();
  const filtered = entries.filter(
    e => !(e.id === entryId && e.targetPairId === targetPairId)
  );
  if (filtered.length === entries.length) return false;

  await writeGuestbook(filtered);
  return true;
}
