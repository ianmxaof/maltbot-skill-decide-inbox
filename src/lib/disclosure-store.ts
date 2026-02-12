// src/lib/disclosure-store.ts
// Per-pair progressive disclosure state — controls which features are visible.
// File-based store following the same pattern as social-store.ts.

import { kv } from "@/lib/db";
import type {
  DisclosureState,
  DisclosureStage,
  DisclosureFeatures,
} from '@/types/disclosure';
import { DEFAULT_FEATURES, STAGE_TRANSITIONS } from '@/types/disclosure';

const DISCLOSURE_FILE = 'disclosure.json';

// ─── Helpers ─────────────────────────────────────────────

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const key = filename.replace(/\.json$/, "");
  return await kv.get<T>(key) ?? fallback;
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const key = filename.replace(/\.json$/, "");
  await kv.set(key, data);
}

type DisclosureStore = Record<string, DisclosureState>;

// ─── Public API ──────────────────────────────────────────

function createDefaultState(pairId: string): DisclosureState {
  return {
    pairId,
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
  };
}

export async function getDisclosureState(pairId: string): Promise<DisclosureState> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  if (!store[pairId]) {
    const state = createDefaultState(pairId);
    store[pairId] = state;
    await writeJson(DISCLOSURE_FILE, store);
    return state;
  }
  return store[pairId];
}

/**
 * Mark onboarding complete — transition from onboarding → activation.
 * Called when the pair is first created.
 */
export async function completeOnboarding(pairId: string): Promise<DisclosureState> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  let state = store[pairId] ?? createDefaultState(pairId);

  if (state.stage === 'onboarding') {
    const transition = STAGE_TRANSITIONS.onboarding;
    state.stage = transition.next;
    for (const key of transition.unlocks) {
      state.features[key] = true;
    }
    state.transitions.push({
      stage: transition.next,
      at: new Date().toISOString(),
      trigger: transition.trigger,
    });
  }

  store[pairId] = state;
  await writeJson(DISCLOSURE_FILE, store);
  return state;
}

/**
 * Record a decision (approve/ignore/escalate) — increments counters,
 * updates active days, checks for stage transitions.
 * Returns the updated state and any newly unlocked feature names.
 */
export async function recordDecision(
  pairId: string
): Promise<{ state: DisclosureState; newlyUnlocked: (keyof DisclosureFeatures)[] }> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  let state = store[pairId] ?? createDefaultState(pairId);

  const now = new Date();
  state.totalDecisions += 1;
  state.lastDecisionAt = now.toISOString();
  if (!state.firstDecisionAt) {
    state.firstDecisionAt = now.toISOString();
  }

  // Track distinct active days
  const today = now.toISOString().slice(0, 10);
  if (!state.activeDays.includes(today)) {
    state.activeDays.push(today);
    state.daysActive = state.activeDays.length;
  }

  store[pairId] = state;
  await writeJson(DISCLOSURE_FILE, store);

  return checkTransitions(pairId);
}

/**
 * Record worker item ingestion.
 */
export async function recordWorkerIngest(
  pairId: string,
  count: number
): Promise<DisclosureState> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  let state = store[pairId] ?? createDefaultState(pairId);

  state.totalWorkerItems += count;

  store[pairId] = state;
  await writeJson(DISCLOSURE_FILE, store);
  return state;
}

/**
 * Evaluate all transition conditions and advance stage if met.
 * Also checks env-gated features (moltbook, command_center, security_vault).
 * Returns updated state and list of newly unlocked features.
 */
export async function checkTransitions(
  pairId: string
): Promise<{ state: DisclosureState; newlyUnlocked: (keyof DisclosureFeatures)[] }> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  let state = store[pairId] ?? createDefaultState(pairId);
  const unlocked: (keyof DisclosureFeatures)[] = [];

  // Check stage transition
  const transition = STAGE_TRANSITIONS[state.stage];
  if (transition && transition.conditions(state) && transition.next !== state.stage) {
    state.stage = transition.next;
    for (const key of transition.unlocks) {
      if (!state.features[key]) {
        state.features[key] = true;
        unlocked.push(key);
      }
    }
    state.transitions.push({
      stage: transition.next,
      at: new Date().toISOString(),
      trigger: transition.trigger,
    });
    // Set pending celebration for the new stage
    state.pendingCelebration = transition.next;
  }

  // Env-gated features (unlock anytime the env is set, regardless of stage)
  if (process.env.MOLTBOOK_API_KEY && !state.features.moltbook) {
    state.features.moltbook = true;
    unlocked.push('moltbook');
  }

  store[pairId] = state;
  await writeJson(DISCLOSURE_FILE, store);
  return { state, newlyUnlocked: unlocked };
}

/**
 * Dismiss the cooling period banner.
 */
export async function dismissCooldownBanner(pairId: string): Promise<void> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  const state = store[pairId];
  if (state) {
    state.cooldownBannerDismissed = true;
    await writeJson(DISCLOSURE_FILE, store);
  }
}

/**
 * Clear pending celebration after user acknowledges it.
 */
export async function clearCelebration(pairId: string): Promise<void> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  const state = store[pairId];
  if (state) {
    state.pendingCelebration = null;
    await writeJson(DISCLOSURE_FILE, store);
  }
}

/**
 * Record that the user visited a feature (clears the "new" badge).
 */
export async function markFeatureVisited(pairId: string, feature: string): Promise<void> {
  const store = await readJson<DisclosureStore>(DISCLOSURE_FILE, {});
  const state = store[pairId];
  if (state && !state.visitedFeatures.includes(feature)) {
    state.visitedFeatures.push(feature);
    await writeJson(DISCLOSURE_FILE, store);
  }
}

/**
 * Get visible tabs for the current disclosure stage.
 */
export function getVisibleTabs(state: DisclosureState, pairId: string): {
  label: string;
  href: string;
  icon: string;
  isNew?: boolean;
}[] {
  const tabs: { label: string; href: string; icon: string; isNew?: boolean }[] = [
    { label: 'Home', href: '/home', icon: 'home' },
    { label: 'Inbox', href: '/decide', icon: 'inbox' },
  ];

  if (state.features.network_feed) {
    tabs.push({
      label: 'Network',
      href: '/network',
      icon: 'globe',
      isNew: !state.visitedFeatures.includes('network'),
    });
  }

  if (state.features.space) {
    tabs.push({
      label: 'Space',
      href: `/space/${pairId}`,
      icon: 'sparkles',
      isNew: !state.visitedFeatures.includes('space'),
    });
  }

  if (state.features.workers) {
    tabs.push({
      label: 'Workers',
      href: '/workers',
      icon: 'bot',
      isNew: !state.visitedFeatures.includes('workers'),
    });
  }

  return tabs;
}
