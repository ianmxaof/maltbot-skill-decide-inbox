"use client";

import {
  Zap, Hash, Target, Shield, Crown, Flame, UserPlus, Users, Star,
  Rocket, Eye, Handshake, BookOpen, ShieldCheck, Sparkles, Radar,
  SatelliteDish, Medal, Moon,
} from "lucide-react";
import type { ProfileBadges, Badge, BadgeRarity } from "@/types/social";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Hash, Target, Shield, Crown, Flame, UserPlus, Users, Star,
  Rocket, Eye, Handshake, BookOpen, ShieldCheck, Sparkles, Radar,
  SatelliteDish, Medal, Moon,
};

const RARITY_STYLES: Record<BadgeRarity, { border: string; bg: string; text: string; glow: string }> = {
  common: {
    border: "border-zinc-600",
    bg: "bg-zinc-800/50",
    text: "text-zinc-300",
    glow: "",
  },
  uncommon: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    glow: "",
  },
  rare: {
    border: "border-violet-500/40",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.2)]",
  },
  legendary: {
    border: "border-amber-400/50",
    bg: "bg-amber-400/10",
    text: "text-amber-400",
    glow: "shadow-[0_0_16px_rgba(251,191,36,0.25)]",
  },
};

function BadgeChip({ badge }: { badge: Badge }) {
  const Icon = ICON_MAP[badge.icon] ?? Sparkles;
  const style = RARITY_STYLES[badge.rarity];

  return (
    <div
      className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all hover:scale-105 ${style.border} ${style.bg} ${style.glow}`}
      title={badge.description}
    >
      <Icon className={`w-3.5 h-3.5 ${style.text}`} />
      <span className={`text-xs font-medium ${style.text}`}>{badge.name}</span>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
        <p className="text-xs font-semibold text-white">{badge.name}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">{badge.description}</p>
        <p className={`text-[10px] mt-1 font-medium capitalize ${style.text}`}>{badge.rarity}</p>
      </div>
    </div>
  );
}

interface BadgeDisplayProps {
  badges: ProfileBadges;
  compact?: boolean;
}

export function BadgeDisplay({ badges, compact = false }: BadgeDisplayProps) {
  if (!badges.badges.length && !badges.currentStreak) return null;

  // Sort: legendary first, then rare, uncommon, common
  const sorted = [...badges.badges].sort((a, b) => {
    const order: Record<BadgeRarity, number> = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
    return order[a.rarity] - order[b.rarity];
  });

  const displayed = compact ? sorted.slice(0, 6) : sorted;
  const hasMore = compact && sorted.length > 6;

  return (
    <div className="space-y-3">
      {/* Streak counter */}
      {badges.currentStreak > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{badges.currentStreak}</span>
            <span className="text-xs text-orange-400/70">day streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700">
            <Target className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-400">{badges.totalDecisions} decisions</span>
          </div>
        </div>
      )}

      {/* Badge grid */}
      {displayed.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayed.map(badge => (
            <BadgeChip key={badge.id} badge={badge} />
          ))}
          {hasMore && (
            <div className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/30">
              <span className="text-xs text-zinc-500">+{sorted.length - 6} more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
