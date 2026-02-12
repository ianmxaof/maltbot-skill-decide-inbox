// src/lib/notification-store.ts
// In-app notification store — file-based persistence.

import { kv } from "@/lib/db";
import type { PlatformNotification, NotificationType } from '@/types/disclosure';

const NOTIFICATION_FILE = 'notifications.json';

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const key = filename.replace(/\.json$/, "");
  return await kv.get<T>(key) ?? fallback;
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const key = filename.replace(/\.json$/, "");
  await kv.set(key, data);
}

function genId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Public API ──────────────────────────────────────────

export async function createNotification(
  pairId: string,
  type: NotificationType,
  title: string,
  body: string,
  route?: string
): Promise<PlatformNotification> {
  const notifications = await readJson<PlatformNotification[]>(NOTIFICATION_FILE, []);

  const notification: PlatformNotification = {
    id: genId(),
    pairId,
    type,
    title,
    body,
    route,
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.push(notification);

  // Keep last 500 notifications total
  const trimmed = notifications.slice(-500);
  await writeJson(NOTIFICATION_FILE, trimmed);

  return notification;
}

export async function getUnreadNotifications(
  pairId: string,
  limit: number = 20
): Promise<PlatformNotification[]> {
  const notifications = await readJson<PlatformNotification[]>(NOTIFICATION_FILE, []);
  return notifications
    .filter(n => n.pairId === pairId && !n.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getAllNotifications(
  pairId: string,
  options?: { limit?: number; since?: string }
): Promise<PlatformNotification[]> {
  let notifications = await readJson<PlatformNotification[]>(NOTIFICATION_FILE, []);
  notifications = notifications.filter(n => n.pairId === pairId);

  if (options?.since) {
    notifications = notifications.filter(n => n.createdAt > options.since!);
  }

  return notifications
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, options?.limit ?? 50);
}

export async function markRead(notificationId: string): Promise<boolean> {
  const notifications = await readJson<PlatformNotification[]>(NOTIFICATION_FILE, []);
  const notif = notifications.find(n => n.id === notificationId);
  if (!notif) return false;
  notif.read = true;
  await writeJson(NOTIFICATION_FILE, notifications);
  return true;
}

export async function markAllRead(pairId: string): Promise<number> {
  const notifications = await readJson<PlatformNotification[]>(NOTIFICATION_FILE, []);
  let count = 0;
  for (const n of notifications) {
    if (n.pairId === pairId && !n.read) {
      n.read = true;
      count++;
    }
  }
  if (count > 0) await writeJson(NOTIFICATION_FILE, notifications);
  return count;
}

export async function getUnreadCount(pairId: string): Promise<number> {
  const notifications = await readJson<PlatformNotification[]>(NOTIFICATION_FILE, []);
  return notifications.filter(n => n.pairId === pairId && !n.read).length;
}

// ─── Throttled notification helpers ──────────────────────

/**
 * Create an agent_discovery notification, throttled to max 1 per hour per pair.
 */
export async function createAgentDiscoveryThrottled(
  pairId: string,
  itemCount: number
): Promise<PlatformNotification | null> {
  const notifications = await readJson<PlatformNotification[]>(NOTIFICATION_FILE, []);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const recent = notifications.find(
    n => n.pairId === pairId && n.type === 'agent_discovery' && n.createdAt > oneHourAgo
  );
  if (recent) return null; // throttled

  return createNotification(
    pairId,
    'agent_discovery',
    `Your agent found ${itemCount} item${itemCount === 1 ? '' : 's'}`,
    `${itemCount} new item${itemCount === 1 ? '' : 's'} surfaced for your review.`,
    '/decide'
  );
}
