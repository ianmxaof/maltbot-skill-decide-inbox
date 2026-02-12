// GET  /api/notifications?pairId=...&since=...  — list notifications
// POST /api/notifications                       — mark read / mark all read

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/validate';
import {
  getAllNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from '@/lib/notification-store';

// ── Zod schemas ────────────────────────────────────────────
const MarkAllReadSchema = z.object({
  action: z.literal('markAllRead'),
  pairId: z.string().min(1, 'pairId is required'),
  notificationId: z.string().optional(),
});

const MarkReadSchema = z.object({
  action: z.literal('markRead').optional(),
  notificationId: z.string().min(1, 'notificationId is required'),
  pairId: z.string().optional(),
});

const NotificationPostSchema = z.discriminatedUnion('action', [
  MarkAllReadSchema,
  z.object({
    action: z.literal('markRead'),
    notificationId: z.string().min(1, 'notificationId is required'),
    pairId: z.string().optional(),
  }),
]);
// For the case where action is omitted (defaults to markRead behaviour),
// we use a union that also accepts a body without an action field.
const NotificationBodySchema = z.union([
  NotificationPostSchema,
  MarkReadSchema,
]);

export async function GET(req: NextRequest) {
  try {
    const pairId = req.nextUrl.searchParams.get('pairId');
    if (!pairId) {
      return NextResponse.json({ error: 'Missing pairId' }, { status: 400 });
    }

    const since = req.nextUrl.searchParams.get('since') ?? undefined;
    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';

    const notifications = unreadOnly
      ? await getUnreadNotifications(pairId, 20)
      : await getAllNotifications(pairId, { since, limit: 50 });

    const unreadCount = await getUnreadCount(pairId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(NotificationBodySchema, body);
    if (!parsed.ok) return parsed.response;
    const { action, notificationId, pairId } = parsed.data;

    if (action === 'markAllRead') {
      const count = await markAllRead(pairId!);
      return NextResponse.json({ success: true, markedRead: count });
    }

    if (action === 'markRead' || !action) {
      const ok = await markRead(notificationId!);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
