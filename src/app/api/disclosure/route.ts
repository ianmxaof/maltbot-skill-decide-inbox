// GET /api/disclosure?pairId=...  — current disclosure state
// POST /api/disclosure           — actions: dismissCooldown, clearCelebration, markVisited

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/validate';
import {
  getDisclosureState,
  dismissCooldownBanner,
  clearCelebration,
  markFeatureVisited,
  checkTransitions,
} from '@/lib/disclosure-store';

const DisclosureActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('dismissCooldown'), pairId: z.string().min(1) }),
  z.object({ action: z.literal('clearCelebration'), pairId: z.string().min(1) }),
  z.object({ action: z.literal('markVisited'), pairId: z.string().min(1), feature: z.string().min(1) }),
]);

export async function GET(req: NextRequest) {
  try {
    const pairId = req.nextUrl.searchParams.get('pairId');
    if (!pairId) {
      return NextResponse.json({ error: 'Missing pairId' }, { status: 400 });
    }
    const state = await getDisclosureState(pairId);
    // Also check for env-gated transitions
    const { state: updated } = await checkTransitions(pairId);
    return NextResponse.json({ success: true, state: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(DisclosureActionSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    switch (data.action) {
      case 'dismissCooldown':
        await dismissCooldownBanner(data.pairId);
        break;
      case 'clearCelebration':
        await clearCelebration(data.pairId);
        break;
      case 'markVisited':
        await markFeatureVisited(data.pairId, data.feature);
        break;
    }

    const state = await getDisclosureState(data.pairId);
    return NextResponse.json({ success: true, state });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
