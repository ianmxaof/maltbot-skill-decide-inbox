"use client";

import { Github, Rss, MessageSquare, Link as LinkIcon } from "lucide-react";
import type { MutualSignalsSummary } from "@/types/social";

interface Props {
  data: MutualSignalsSummary;
  accentColor?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  github_repo: Github,
  github_user: Github,
  rss_feed: Rss,
  moltbook_topic: MessageSquare,
};

const TYPE_COLORS: Record<string, string> = {
  github_repo: "#f0f6fc",
  github_user: "#f0f6fc",
  rss_feed: "#fb923c",
  moltbook_topic: "#a78bfa",
};

export function MutualSignalBadges({ data, accentColor }: Props) {
  if (data.totalShared === 0) return null;

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <LinkIcon className="w-3 h-3 text-violet-400" />
        <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
          {data.totalShared} Mutual {data.totalShared === 1 ? "Signal" : "Signals"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.signals.slice(0, 12).map((signal, i) => {
          const Icon = TYPE_ICONS[signal.type] ?? Rss;
          const color = TYPE_COLORS[signal.type] ?? (accentColor || "#a78bfa");

          return (
            <div
              key={`${signal.type}_${signal.name}_${i}`}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border"
              style={{
                borderColor: color + "30",
                backgroundColor: color + "10",
                color: color + "cc",
              }}
            >
              <Icon className="w-2.5 h-2.5" />
              <span className="font-medium">{signal.displayLabel}</span>
            </div>
          );
        })}
        {data.signals.length > 12 && (
          <span className="text-[10px] text-zinc-600 self-center">
            +{data.signals.length - 12} more
          </span>
        )}
      </div>
    </div>
  );
}
