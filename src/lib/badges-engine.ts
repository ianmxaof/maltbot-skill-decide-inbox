/**
 * Badges & Achievements Engine — The Nightly Build
 *
 * Computes badges, streaks, and milestones from pair activity data.
 * Badges are earned through behavior patterns, not purchased or assigned.
 */

import { kv } from "@/lib/db";
import type { AgentHumanPair } from "@/types/agent-pair";
import type { Badge, BadgeRarity, ProfileBadges, Milestone } from "@/types/social";
import { getFollowersOf, getFollowingBy, getNetworkActivity } from "@/lib/social-store";

// ─── Badge Definitions ─────────────────────────────────────

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: Badge["category"];
  check: (ctx: BadgeContext) => boolean;
}

interface BadgeContext {
  pair: AgentHumanPair;
  followerCount: number;
  followingCount: number;
  activityCount: number;
  currentStreak: number;
  longestStreak: number;
  totalDecisions: number;
  daysSinceCreation: number;
  contextSourceCount: number;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Milestone badges ──
  {
    id: "first-blood",
    name: "First Blood",
    description: "Made your first decision",
    icon: "Zap",
    rarity: "common",
    category: "milestone",
    check: (ctx) => ctx.totalDecisions >= 1,
  },
  {
    id: "double-digits",
    name: "Double Digits",
    description: "Reached 10 decisions",
    icon: "Hash",
    rarity: "common",
    category: "volume",
    check: (ctx) => ctx.totalDecisions >= 10,
  },
  {
    id: "half-century",
    name: "Half Century",
    description: "50 decisions and counting",
    icon: "Target",
    rarity: "uncommon",
    category: "volume",
    check: (ctx) => ctx.totalDecisions >= 50,
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "100 decisions — a true operator",
    icon: "Shield",
    rarity: "rare",
    category: "volume",
    check: (ctx) => ctx.totalDecisions >= 100,
  },
  {
    id: "five-hundred-club",
    name: "500 Club",
    description: "500 decisions. Legendary commitment.",
    icon: "Crown",
    rarity: "legendary",
    category: "volume",
    check: (ctx) => ctx.totalDecisions >= 500,
  },

  // ── Streak badges ──
  {
    id: "streak-week",
    name: "Week Warrior",
    description: "7-day decision streak",
    icon: "Flame",
    rarity: "common",
    category: "streak",
    check: (ctx) => ctx.longestStreak >= 7,
  },
  {
    id: "streak-month",
    name: "Monthly Machine",
    description: "30-day decision streak",
    icon: "Flame",
    rarity: "uncommon",
    category: "streak",
    check: (ctx) => ctx.longestStreak >= 30,
  },
  {
    id: "streak-hundred",
    name: "Hundred Days",
    description: "100-day streak. Unstoppable.",
    icon: "Flame",
    rarity: "legendary",
    category: "streak",
    check: (ctx) => ctx.longestStreak >= 100,
  },

  // ── Social badges ──
  {
    id: "first-friend",
    name: "First Friend",
    description: "Made your first connection",
    icon: "UserPlus",
    rarity: "common",
    category: "social",
    check: (ctx) => ctx.followingCount >= 1,
  },
  {
    id: "popular",
    name: "Popular Pair",
    description: "Earned 10 followers",
    icon: "Users",
    rarity: "uncommon",
    category: "social",
    check: (ctx) => ctx.followerCount >= 10,
  },
  {
    id: "influencer",
    name: "Influencer",
    description: "50 followers — your governance inspires",
    icon: "Star",
    rarity: "rare",
    category: "social",
    check: (ctx) => ctx.followerCount >= 50,
  },

  // ── Governance badges ──
  {
    id: "ship-fast",
    name: "Ship Fast",
    description: "Philosophy: Ship While You Sleep",
    icon: "Rocket",
    rarity: "common",
    category: "governance",
    check: (ctx) => ctx.pair.operatingPhilosophy === "ship-while-sleep",
  },
  {
    id: "careful-operator",
    name: "Careful Operator",
    description: "Philosophy: Review Before Deploy",
    icon: "Eye",
    rarity: "common",
    category: "governance",
    check: (ctx) => ctx.pair.operatingPhilosophy === "review-before-deploy",
  },
  {
    id: "collaborator",
    name: "Collaborator",
    description: "Philosophy: Collaborative",
    icon: "Handshake",
    rarity: "common",
    category: "governance",
    check: (ctx) => ctx.pair.operatingPhilosophy === "collaborative",
  },
  {
    id: "researcher",
    name: "Researcher",
    description: "Philosophy: Research Only",
    icon: "BookOpen",
    rarity: "common",
    category: "governance",
    check: (ctx) => ctx.pair.operatingPhilosophy === "research-only",
  },
  {
    id: "high-trust",
    name: "High Trust",
    description: "Ship/revert ratio above 0.9",
    icon: "ShieldCheck",
    rarity: "rare",
    category: "governance",
    check: (ctx) => ctx.pair.trustMetrics.shipRevertRatio >= 0.9 && ctx.totalDecisions >= 10,
  },

  // ── Explorer badges ──
  {
    id: "early-adopter",
    name: "Early Adopter",
    description: "Joined in the first wave",
    icon: "Sparkles",
    rarity: "rare",
    category: "explorer",
    check: () => true, // Assigned manually or by date check
  },
  {
    id: "context-collector",
    name: "Context Collector",
    description: "Tracking 5+ context sources",
    icon: "Radar",
    rarity: "common",
    category: "explorer",
    check: (ctx) => ctx.contextSourceCount >= 5,
  },
  {
    id: "signal-hound",
    name: "Signal Hound",
    description: "Tracking 10+ context sources",
    icon: "SatelliteDish",
    rarity: "uncommon",
    category: "explorer",
    check: (ctx) => ctx.contextSourceCount >= 10,
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "Active for 30+ days",
    icon: "Medal",
    rarity: "uncommon",
    category: "milestone",
    check: (ctx) => ctx.daysSinceCreation >= 30,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Most activity happens after midnight",
    icon: "Moon",
    rarity: "uncommon",
    category: "speed",
    check: (ctx) => {
      const hours = ctx.pair.activityPattern?.nightlyBuildSchedule;
      // Heuristic: if they have a nightly schedule, they're a night owl
      return !!hours;
    },
  },
];

// ─── Streak Computation ────────────────────────────────────

interface StreakResult {
  current: number;
  longest: number;
  totalDecisions: number;
}

async function computeStreak(pairId: string): Promise<StreakResult> {
  const activities = await getNetworkActivity({
    pairId,
    types: ["decision"],
    limit: 1000,
  });

  if (activities.length === 0) {
    return { current: 0, longest: 0, totalDecisions: 0 };
  }

  // Get unique decision days
  const days = new Set<string>();
  for (const a of activities) {
    days.add(a.createdAt.slice(0, 10)); // YYYY-MM-DD
  }

  const sortedDays = Array.from(days).sort().reverse(); // newest first
  const today = new Date().toISOString().slice(0, 10);

  // Compute current streak
  let current = 0;
  let checkDate = new Date(today);
  for (let i = 0; i < 400; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (days.has(dateStr)) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Today might not have a decision yet — check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    } else {
      break;
    }
  }

  // Compute longest streak
  let longest = 0;
  let streakCount = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streakCount++;
    } else {
      longest = Math.max(longest, streakCount);
      streakCount = 1;
    }
  }
  longest = Math.max(longest, streakCount, current);

  return { current, longest, totalDecisions: activities.length };
}

// ─── Badge Computation ─────────────────────────────────────

export async function computeBadges(pair: AgentHumanPair): Promise<ProfileBadges> {
  const [followers, following, streak] = await Promise.all([
    getFollowersOf(pair.id),
    getFollowingBy(pair.id),
    computeStreak(pair.id),
  ]);

  const contextSourceCount =
    (pair.contextSources.githubRepos?.length ?? 0) +
    (pair.contextSources.githubUsers?.length ?? 0) +
    (pair.contextSources.rssUrls?.length ?? 0) +
    (pair.contextSources.moltbookTopics?.length ?? 0);

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(pair.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const ctx: BadgeContext = {
    pair,
    followerCount: followers.length,
    followingCount: following.length,
    activityCount: streak.totalDecisions,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    totalDecisions: streak.totalDecisions,
    daysSinceCreation,
    contextSourceCount,
  };

  const earnedBadges: Badge[] = [];
  const now = new Date().toISOString();

  for (const def of BADGE_DEFINITIONS) {
    if (def.check(ctx)) {
      earnedBadges.push({
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
        category: def.category,
        earnedAt: now, // Could be improved with first-earned tracking
      });
    }
  }

  return {
    pairId: pair.id,
    badges: earnedBadges,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    totalDecisions: streak.totalDecisions,
    computedAt: now,
  };
}

// ─── Milestones ────────────────────────────────────────────

export async function computeMilestones(pair: AgentHumanPair): Promise<Milestone[]> {
  const [followers, following, streak] = await Promise.all([
    getFollowersOf(pair.id),
    getFollowingBy(pair.id),
    computeStreak(pair.id),
  ]);

  const milestones: Milestone[] = [];
  const now = pair.createdAt;

  // Profile created is always the first milestone
  milestones.push({
    id: `ms_${pair.id}_created`,
    pairId: pair.id,
    type: "profile_created",
    title: "Profile Created",
    description: `${pair.humanName} × ${pair.agentName} entered the network`,
    icon: "Sparkles",
    achievedAt: pair.createdAt,
  });

  if (streak.totalDecisions >= 1) {
    milestones.push({
      id: `ms_${pair.id}_first_decision`,
      pairId: pair.id,
      type: "first_decision",
      title: "First Decision",
      description: "Made the first call in the Decide Inbox",
      icon: "Zap",
      achievedAt: now,
    });
  }

  if (following.length >= 1) {
    milestones.push({
      id: `ms_${pair.id}_first_follow`,
      pairId: pair.id,
      type: "first_follow",
      title: "First Connection",
      description: "Followed another pair",
      icon: "UserPlus",
      achievedAt: now,
    });
  }

  if (followers.length >= 1) {
    milestones.push({
      id: `ms_${pair.id}_first_follower`,
      pairId: pair.id,
      type: "first_follower",
      title: "First Follower",
      description: "Someone found your governance interesting",
      icon: "Heart",
      achievedAt: now,
    });
  }

  const decisionMilestones: Array<{ threshold: number; type: Milestone["type"]; title: string }> = [
    { threshold: 10, type: "decisions_10", title: "10 Decisions" },
    { threshold: 50, type: "decisions_50", title: "50 Decisions" },
    { threshold: 100, type: "decisions_100", title: "100 Decisions" },
    { threshold: 500, type: "decisions_500", title: "500 Decisions" },
  ];

  for (const dm of decisionMilestones) {
    if (streak.totalDecisions >= dm.threshold) {
      milestones.push({
        id: `ms_${pair.id}_${dm.type}`,
        pairId: pair.id,
        type: dm.type,
        title: dm.title,
        description: `Reached ${dm.threshold} decisions in the Decide Inbox`,
        icon: "Target",
        achievedAt: now,
      });
    }
  }

  const streakMilestones: Array<{ threshold: number; type: Milestone["type"]; title: string }> = [
    { threshold: 7, type: "streak_7", title: "7-Day Streak" },
    { threshold: 30, type: "streak_30", title: "30-Day Streak" },
    { threshold: 100, type: "streak_100", title: "100-Day Streak" },
  ];

  for (const sm of streakMilestones) {
    if (streak.longest >= sm.threshold) {
      milestones.push({
        id: `ms_${pair.id}_${sm.type}`,
        pairId: pair.id,
        type: sm.type,
        title: sm.title,
        description: `Maintained a ${sm.threshold}-day decision streak`,
        icon: "Flame",
        achievedAt: now,
      });
    }
  }

  const contextSourceCount =
    (pair.contextSources.githubRepos?.length ?? 0) +
    (pair.contextSources.githubUsers?.length ?? 0) +
    (pair.contextSources.rssUrls?.length ?? 0) +
    (pair.contextSources.moltbookTopics?.length ?? 0);

  if (contextSourceCount >= 5) {
    milestones.push({
      id: `ms_${pair.id}_ctx5`,
      pairId: pair.id,
      type: "context_source_5",
      title: "5 Context Sources",
      description: "Monitoring 5+ signals from the world",
      icon: "Radar",
      achievedAt: now,
    });
  }

  if (contextSourceCount >= 10) {
    milestones.push({
      id: `ms_${pair.id}_ctx10`,
      pairId: pair.id,
      type: "context_source_10",
      title: "10 Context Sources",
      description: "A well-connected signal network",
      icon: "SatelliteDish",
      achievedAt: now,
    });
  }

  // Sort by achievedAt ascending (timeline order)
  milestones.sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));

  return milestones;
}

// ─── First Pair ("Tom") ───────────────────────────────────

const FIRST_PAIR_ID = "nightly-build-team";

export const FIRST_PAIR_CONFIG = {
  id: FIRST_PAIR_ID,
  humanName: "Nightly Build",
  agentName: "NB-1",
  operatingPhilosophy: "collaborative" as const,
  tagline: "The team behind the platform. Welcome to The Nightly Build.",
  bio: "We're the original pair. Every new operator gets us as their first connection. Think of us as your guide to the network.\n\nWe ship while you sleep — literally. This platform was built by a human-agent pair, for human-agent pairs.",
};

/**
 * Returns the "Tom" pair ID that every new user should auto-follow.
 */
export function getFirstPairId(): string {
  return FIRST_PAIR_ID;
}
