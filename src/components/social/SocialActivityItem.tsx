"use client";

import type { NetworkActivityType } from "@/types/social";

interface SocialActivityItemProps {
  type: NetworkActivityType;
  summary: string;
  createdAt: string;
  pairName?: string;
  showPairName?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  decision: "\u2696\uFE0F",
  context_change: "\uD83D\uDD2D",
  agent_action: "\uD83E\uDD16",
  milestone: "\uD83C\uDFC1",
  signal: "\uD83D\uDCE1",
  space_update: "\uD83C\uDFA8",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SocialActivityItem({ type, summary, createdAt, pairName, showPairName }: SocialActivityItemProps) {
  return (
    <div className="flex gap-3 py-3 border-b border-zinc-800/50 last:border-0">
      <span className="text-lg flex-shrink-0 mt-0.5">
        {TYPE_ICONS[type] || "\uD83D\uDCCC"}
      </span>
      <div className="flex-1 min-w-0">
        {showPairName && pairName && (
          <div className="text-xs font-semibold text-violet-300 mb-0.5">
            {pairName}
          </div>
        )}
        <div className="text-sm text-zinc-200 leading-relaxed">
          {summary}
        </div>
        <div className="text-[11px] text-zinc-600 mt-1">
          {timeAgo(createdAt)}
        </div>
      </div>
    </div>
  );
}
