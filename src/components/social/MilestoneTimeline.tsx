"use client";

import {
  Zap, Target, Flame, UserPlus, Heart, Sparkles, Radar, SatelliteDish,
} from "lucide-react";
import type { Milestone } from "@/types/social";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Target, Flame, UserPlus, Heart, Sparkles, Radar, SatelliteDish,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  maxItems?: number;
}

export function MilestoneTimeline({ milestones, maxItems = 8 }: MilestoneTimelineProps) {
  if (!milestones.length) return null;

  // Show most recent first for the timeline display
  const displayed = [...milestones].reverse().slice(0, maxItems);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Milestones
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

        <div className="space-y-4">
          {displayed.map((milestone, i) => {
            const Icon = ICON_MAP[milestone.icon] ?? Sparkles;
            const isFirst = i === 0;

            return (
              <div key={milestone.id} className="flex gap-3 relative">
                {/* Dot / Icon */}
                <div
                  className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isFirst
                      ? "bg-amber-500/20 border border-amber-500/40"
                      : "bg-zinc-800 border border-zinc-700"
                  }`}
                >
                  <Icon
                    className={`w-3 h-3 ${isFirst ? "text-amber-400" : "text-zinc-500"}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm font-medium ${isFirst ? "text-white" : "text-zinc-300"}`}>
                      {milestone.title}
                    </p>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0">
                      {formatDate(milestone.achievedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    {milestone.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {milestones.length > maxItems && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50">
          <p className="text-[10px] text-zinc-600 text-center">
            {milestones.length - maxItems} earlier milestones
          </p>
        </div>
      )}
    </div>
  );
}
