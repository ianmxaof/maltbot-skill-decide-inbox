import { describe, it, expect } from 'vitest';
import {
  shouldRouteToDecideInbox,
  mapIngestTypeToActivityType,
  buildActivitySummary,
} from '@/lib/ingest-utils';
import type { IngestItem, IngestItemType } from '@/types/worker';

// ─── Helpers ──────────────────────────────────────────────

function makeItem(overrides: Partial<IngestItem> = {}): IngestItem {
  return {
    workerId: 'w1',
    pairId: 'pair_001',
    type: 'trend',
    urgency: 'low',
    confidence: 0.3,
    title: 'Test Item',
    summary: 'A test item',
    sourceName: 'hnrss',
    sourceType: 'rss',
    signalKeys: [],
    tags: [],
    contentHash: 'abc123',
    discoveredAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── shouldRouteToDecideInbox ─────────────────────────────

describe('shouldRouteToDecideInbox', () => {
  it('routes critical urgency to inbox', () => {
    expect(shouldRouteToDecideInbox(makeItem({ urgency: 'critical' }))).toBe(true);
  });

  it('routes high urgency to inbox', () => {
    expect(shouldRouteToDecideInbox(makeItem({ urgency: 'high' }))).toBe(true);
  });

  it('routes high confidence (>= 0.7) to inbox', () => {
    expect(shouldRouteToDecideInbox(makeItem({ confidence: 0.7 }))).toBe(true);
  });

  it('does NOT route confidence 0.69 alone', () => {
    expect(shouldRouteToDecideInbox(makeItem({ confidence: 0.69 }))).toBe(false);
  });

  it('routes medium urgency + confidence >= 0.5', () => {
    expect(
      shouldRouteToDecideInbox(makeItem({ urgency: 'medium', confidence: 0.5 }))
    ).toBe(true);
  });

  it('does NOT route medium urgency + confidence 0.49', () => {
    expect(
      shouldRouteToDecideInbox(makeItem({ urgency: 'medium', confidence: 0.49 }))
    ).toBe(false);
  });

  it('routes escalate suggested action', () => {
    expect(
      shouldRouteToDecideInbox(makeItem({ suggestedAction: 'escalate' }))
    ).toBe(true);
  });

  it('routes threat type', () => {
    expect(shouldRouteToDecideInbox(makeItem({ type: 'threat' }))).toBe(true);
  });

  it('routes bug type', () => {
    expect(shouldRouteToDecideInbox(makeItem({ type: 'bug' }))).toBe(true);
  });

  it('does NOT route low urgency + low confidence + normal type', () => {
    expect(
      shouldRouteToDecideInbox(
        makeItem({ urgency: 'low', confidence: 0.3, type: 'trend' })
      )
    ).toBe(false);
  });
});

// ─── mapIngestTypeToActivityType ──────────────────────────

describe('mapIngestTypeToActivityType', () => {
  const cases: [IngestItemType, string][] = [
    ['opportunity', 'signal'],
    ['collaboration', 'signal'],
    ['threat', 'agent_action'],
    ['bug', 'agent_action'],
    ['release', 'context_change'],
    ['trend', 'context_change'],
    ['discussion', 'signal'],
    ['content_idea', 'signal'],
    ['competitor', 'signal'],
  ];

  it.each(cases)('maps "%s" → "%s"', (input, expected) => {
    expect(mapIngestTypeToActivityType(input)).toBe(expected);
  });
});

// ─── buildActivitySummary ────────────────────────────────

describe('buildActivitySummary', () => {
  it('uses correct verb for opportunity', () => {
    const summary = buildActivitySummary(makeItem({ type: 'opportunity', title: 'New API' }));
    expect(summary).toBe('Discovered opportunity: New API');
  });

  it('uses correct verb for threat', () => {
    const summary = buildActivitySummary(makeItem({ type: 'threat', title: 'CVE-2025-001' }));
    expect(summary).toBe('Flagged threat: CVE-2025-001');
  });

  it('uses correct verb for bug', () => {
    const summary = buildActivitySummary(makeItem({ type: 'bug', title: 'Memory leak' }));
    expect(summary).toBe('Detected vulnerability: Memory leak');
  });

  it('uses correct verb for release', () => {
    const summary = buildActivitySummary(makeItem({ type: 'release', title: 'v2.0' }));
    expect(summary).toBe('Noticed release: v2.0');
  });

  it('falls back to "Surfaced item" for unknown type', () => {
    const item = makeItem({ title: 'Unknown' });
    (item as any).type = 'unknown_type';
    const summary = buildActivitySummary(item);
    expect(summary).toBe('Surfaced item: Unknown');
  });
});
