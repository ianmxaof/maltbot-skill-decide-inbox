// src/types/disclosure.ts
// Progressive disclosure — stages a user progresses through.
// Transitions triggered by activity thresholds, not time alone.

export type DisclosureStage =
  | 'onboarding'     // completing the 4-step wizard
  | 'activation'     // first scan, first decisions
  | 'daily_driver'   // days 1-7, using Inbox regularly
  | 'networked'      // days 7-14, enough data for social matching
  | 'deep'           // days 14-21, groups/signals/pulse meaningful
  | 'full_citizen';  // day 21+, all features available

export interface DisclosureFeatures {
  inbox: boolean;
  workers: boolean;
  space: boolean;
  network_feed: boolean;
  network_discover: boolean;
  network_pulse: boolean;
  network_groups: boolean;
  network_signals: boolean;
  command_center: boolean;
  security_vault: boolean;
  moltbook: boolean;
  direct_to_agent: boolean;
}

export interface DisclosureState {
  pairId: string;
  stage: DisclosureStage;
  createdAt: string;

  // Activity counters (drive stage transitions)
  totalDecisions: number;
  totalWorkerItems: number;
  daysActive: number;
  activeDays: string[];           // ISO date strings of distinct active days
  firstDecisionAt?: string;
  lastDecisionAt?: string;

  // Feature unlock flags
  features: DisclosureFeatures;

  // Notification tracking
  lastNotificationAt?: string;
  notificationsSent: string[];

  // Cooling period
  cooldownBannerDismissed: boolean;

  // Celebration tracking
  pendingCelebration: DisclosureStage | null;
  visitedFeatures: string[];

  // Stage transition history
  transitions: {
    stage: DisclosureStage;
    at: string;
    trigger: string;
  }[];
}

export const DEFAULT_FEATURES: DisclosureFeatures = {
  inbox: false,
  workers: false,
  space: false,
  network_feed: false,
  network_discover: false,
  network_pulse: false,
  network_groups: false,
  network_signals: false,
  command_center: false,
  security_vault: false,
  moltbook: false,
  direct_to_agent: false,
};

export interface StageTransition {
  next: DisclosureStage;
  conditions: (state: DisclosureState) => boolean;
  trigger: string;
  unlocks: (keyof DisclosureFeatures)[];
}

export const STAGE_TRANSITIONS: Record<DisclosureStage, StageTransition> = {
  onboarding: {
    next: 'activation',
    conditions: () => true,
    trigger: 'onboarding_complete',
    unlocks: ['inbox', 'workers'],
  },
  activation: {
    next: 'daily_driver',
    conditions: (s) => s.totalDecisions >= 3,
    trigger: 'first_3_decisions',
    unlocks: ['space', 'direct_to_agent'],
  },
  daily_driver: {
    next: 'networked',
    conditions: (s) => s.daysActive >= 7 || s.totalDecisions >= 30,
    trigger: 'sustained_usage',
    unlocks: ['network_feed', 'network_discover'],
  },
  networked: {
    next: 'deep',
    conditions: (s) => s.daysActive >= 14 || s.totalDecisions >= 75,
    trigger: 'deep_engagement',
    unlocks: ['network_pulse', 'network_groups', 'network_signals'],
  },
  deep: {
    next: 'full_citizen',
    conditions: (s) => s.daysActive >= 21 || s.totalDecisions >= 100,
    trigger: 'full_citizen',
    unlocks: ['command_center', 'security_vault'],
  },
  full_citizen: {
    next: 'full_citizen',
    conditions: () => false,
    trigger: '',
    unlocks: [],
  },
};

// ─── Notification types ──────────────────────────────────

export type NotificationType =
  | 'agent_discovery'
  | 'network_convergence'
  | 'feature_unlock'
  | 'milestone'
  | 'weekly_digest';

export interface PlatformNotification {
  id: string;
  pairId: string;
  type: NotificationType;
  title: string;
  body: string;
  route?: string;
  read: boolean;
  createdAt: string;
}
