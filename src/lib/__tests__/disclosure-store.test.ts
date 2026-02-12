import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DisclosureState, DisclosureFeatures } from '@/types/disclosure';
import { STAGE_TRANSITIONS, DEFAULT_FEATURES } from '@/types/disclosure';

// ─── Mock fs before importing the store ──────────────────

const mockStore: Record<string, DisclosureState> = {};

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockImplementation(() => {
      return Promise.resolve(JSON.stringify(mockStore));
    }),
    writeFile: vi.fn().mockImplementation((_path: string, data: string) => {
      const parsed = JSON.parse(data);
      // Sync mockStore so subsequent reads see the writes
      for (const key of Object.keys(parsed)) {
        mockStore[key] = parsed[key];
      }
      // Remove keys not in new data
      for (const key of Object.keys(mockStore)) {
        if (!(key in parsed)) delete mockStore[key];
      }
      return Promise.resolve();
    }),
  },
}));

import {
  getDisclosureState,
  completeOnboarding,
  recordDecision,
  recordWorkerIngest,
  checkTransitions,
  dismissCooldownBanner,
  clearCelebration,
  markFeatureVisited,
} from '@/lib/disclosure-store';

// ─── Reset store between tests ───────────────────────────

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  vi.clearAllMocks();
});

// ─── getDisclosureState ──────────────────────────────────

describe('getDisclosureState', () => {
  it('returns default state for unknown pairId', async () => {
    const state = await getDisclosureState('pair_new');
    expect(state.pairId).toBe('pair_new');
    expect(state.stage).toBe('onboarding');
    expect(state.totalDecisions).toBe(0);
    expect(state.features.inbox).toBe(false);
  });

  it('returns existing state if already stored', async () => {
    await getDisclosureState('pair_a'); // creates default
    const second = await getDisclosureState('pair_a');
    expect(second.pairId).toBe('pair_a');
    expect(second.stage).toBe('onboarding');
  });
});

// ─── completeOnboarding ──────────────────────────────────

describe('completeOnboarding', () => {
  it('advances from onboarding → activation and unlocks inbox + workers', async () => {
    await getDisclosureState('pair_1');
    const state = await completeOnboarding('pair_1');
    expect(state.stage).toBe('activation');
    expect(state.features.inbox).toBe(true);
    expect(state.features.workers).toBe(true);
  });

  it('is idempotent — calling twice does not double-advance', async () => {
    await getDisclosureState('pair_2');
    await completeOnboarding('pair_2');
    const state = await completeOnboarding('pair_2');
    expect(state.stage).toBe('activation');
    expect(state.transitions.length).toBe(1);
  });
});

// ─── recordDecision ──────────────────────────────────────

describe('recordDecision', () => {
  it('increments totalDecisions', async () => {
    await getDisclosureState('pair_3');
    await completeOnboarding('pair_3');
    const { state } = await recordDecision('pair_3');
    expect(state.totalDecisions).toBe(1);
  });

  it('tracks active days', async () => {
    await getDisclosureState('pair_4');
    await completeOnboarding('pair_4');
    const { state } = await recordDecision('pair_4');
    expect(state.daysActive).toBe(1);
    expect(state.activeDays.length).toBe(1);
  });

  it('triggers activation → daily_driver after 3 decisions', async () => {
    await getDisclosureState('pair_5');
    await completeOnboarding('pair_5');
    await recordDecision('pair_5');
    await recordDecision('pair_5');
    const { state, newlyUnlocked } = await recordDecision('pair_5');
    expect(state.stage).toBe('daily_driver');
    expect(newlyUnlocked).toContain('space');
    expect(newlyUnlocked).toContain('direct_to_agent');
  });
});

// ─── recordWorkerIngest ──────────────────────────────────

describe('recordWorkerIngest', () => {
  it('increments totalWorkerItems', async () => {
    await getDisclosureState('pair_6');
    const state = await recordWorkerIngest('pair_6', 5);
    expect(state.totalWorkerItems).toBe(5);
  });

  it('accumulates across calls', async () => {
    await getDisclosureState('pair_7');
    await recordWorkerIngest('pair_7', 3);
    const state = await recordWorkerIngest('pair_7', 7);
    expect(state.totalWorkerItems).toBe(10);
  });
});

// ─── dismissCooldownBanner ───────────────────────────────

describe('dismissCooldownBanner', () => {
  it('sets cooldownBannerDismissed to true', async () => {
    await getDisclosureState('pair_8');
    await dismissCooldownBanner('pair_8');
    const state = await getDisclosureState('pair_8');
    expect(state.cooldownBannerDismissed).toBe(true);
  });
});

// ─── clearCelebration ────────────────────────────────────

describe('clearCelebration', () => {
  it('clears pendingCelebration', async () => {
    await getDisclosureState('pair_9');
    await completeOnboarding('pair_9');
    // After onboarding → activation, there may be a celebration
    // But completeOnboarding doesn't set pendingCelebration (only checkTransitions does)
    // Manually verify the clear path
    mockStore['pair_9'].pendingCelebration = 'activation';
    await clearCelebration('pair_9');
    const state = await getDisclosureState('pair_9');
    expect(state.pendingCelebration).toBeNull();
  });
});

// ─── markFeatureVisited ──────────────────────────────────

describe('markFeatureVisited', () => {
  it('adds feature to visitedFeatures', async () => {
    await getDisclosureState('pair_10');
    await markFeatureVisited('pair_10', 'network');
    const state = await getDisclosureState('pair_10');
    expect(state.visitedFeatures).toContain('network');
  });

  it('does not duplicate visited features', async () => {
    await getDisclosureState('pair_11');
    await markFeatureVisited('pair_11', 'workers');
    await markFeatureVisited('pair_11', 'workers');
    const state = await getDisclosureState('pair_11');
    expect(state.visitedFeatures.filter((f) => f === 'workers').length).toBe(1);
  });
});

// ─── STAGE_TRANSITIONS (pure, no mocking needed) ─────────

describe('STAGE_TRANSITIONS', () => {
  function makeState(overrides: Partial<DisclosureState> = {}): DisclosureState {
    return {
      pairId: 'test',
      stage: 'onboarding',
      createdAt: new Date().toISOString(),
      totalDecisions: 0,
      totalWorkerItems: 0,
      daysActive: 0,
      activeDays: [],
      features: { ...DEFAULT_FEATURES },
      notificationsSent: [],
      cooldownBannerDismissed: false,
      pendingCelebration: null,
      visitedFeatures: [],
      transitions: [],
      ...overrides,
    };
  }

  it('onboarding → activation is always true', () => {
    expect(STAGE_TRANSITIONS.onboarding.conditions(makeState())).toBe(true);
    expect(STAGE_TRANSITIONS.onboarding.next).toBe('activation');
    expect(STAGE_TRANSITIONS.onboarding.unlocks).toEqual(['inbox', 'workers']);
  });

  it('activation → daily_driver requires >= 3 decisions', () => {
    expect(STAGE_TRANSITIONS.activation.conditions(makeState({ totalDecisions: 2 }))).toBe(false);
    expect(STAGE_TRANSITIONS.activation.conditions(makeState({ totalDecisions: 3 }))).toBe(true);
  });

  it('daily_driver → networked requires 7 days OR 30 decisions', () => {
    expect(STAGE_TRANSITIONS.daily_driver.conditions(makeState({ daysActive: 6, totalDecisions: 29 }))).toBe(false);
    expect(STAGE_TRANSITIONS.daily_driver.conditions(makeState({ daysActive: 7 }))).toBe(true);
    expect(STAGE_TRANSITIONS.daily_driver.conditions(makeState({ totalDecisions: 30 }))).toBe(true);
  });

  it('networked → deep requires 14 days OR 75 decisions', () => {
    expect(STAGE_TRANSITIONS.networked.conditions(makeState({ daysActive: 13, totalDecisions: 74 }))).toBe(false);
    expect(STAGE_TRANSITIONS.networked.conditions(makeState({ daysActive: 14 }))).toBe(true);
    expect(STAGE_TRANSITIONS.networked.conditions(makeState({ totalDecisions: 75 }))).toBe(true);
  });

  it('deep → full_citizen requires 21 days OR 100 decisions', () => {
    expect(STAGE_TRANSITIONS.deep.conditions(makeState({ daysActive: 20, totalDecisions: 99 }))).toBe(false);
    expect(STAGE_TRANSITIONS.deep.conditions(makeState({ daysActive: 21 }))).toBe(true);
    expect(STAGE_TRANSITIONS.deep.conditions(makeState({ totalDecisions: 100 }))).toBe(true);
  });

  it('full_citizen never transitions further', () => {
    expect(STAGE_TRANSITIONS.full_citizen.conditions(makeState())).toBe(false);
    expect(STAGE_TRANSITIONS.full_citizen.next).toBe('full_citizen');
    expect(STAGE_TRANSITIONS.full_citizen.unlocks).toEqual([]);
  });
});
