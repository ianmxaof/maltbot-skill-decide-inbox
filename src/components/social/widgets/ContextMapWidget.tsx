"use client";

import { Radar, Github, Rss, BookOpen, Globe } from "lucide-react";
import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["contextMap"];
  accentColor: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  github_repo: Github,
  rss_feed: Rss,
  moltbook_topic: BookOpen,
  news: Globe,
  custom: Radar,
};

const TYPE_COLORS: Record<string, string> = {
  github_repo: "text-zinc-300 bg-zinc-800",
  rss_feed: "text-orange-400 bg-orange-500/10",
  moltbook_topic: "text-violet-400 bg-violet-500/10",
  news: "text-blue-400 bg-blue-500/10",
  custom: "text-emerald-400 bg-emerald-500/10",
};

export function ContextMapWidget({ data, accentColor }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-zinc-600 gap-1">
        <Radar className="w-5 h-5 text-zinc-700" />
        No context sources configured
      </div>
    );
  }

  // Group by type
  const grouped = new Map<string, typeof data>();
  for (const src of data) {
    const list = grouped.get(src.type) ?? [];
    list.push(src);
    grouped.set(src.type, list);
  }

  return (
    <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin">
      {Array.from(grouped.entries()).map(([type, sources]) => {
        const Icon = TYPE_ICONS[type] ?? Globe;
        const colorClass = TYPE_COLORS[type] ?? "text-zinc-400 bg-zinc-800";

        return (
          <div key={type}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className={`w-3 h-3 ${colorClass.split(" ")[0]}`} />
              <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">
                {type.replace(/_/g, " ")} ({sources.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {sources.map((src) => (
                <div
                  key={`${src.type}-${src.name}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium ${colorClass}`}
                  title={`${src.signalCount} signals`}
                >
                  <span className="truncate max-w-[120px]">{src.name}</span>
                  {src.signalCount > 0 && (
                    <span className="text-[9px] opacity-60">{src.signalCount}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
