"use client";

import { Rss, ExternalLink } from "lucide-react";
import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["rssTicker"];
  accentColor: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function RssTickerWidget({ data, accentColor }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        <Rss className="w-4 h-4 mr-2 text-zinc-700" />
        No signals yet
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
      {data.slice(0, 8).map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition group"
        >
          <div
            className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="text-xs text-zinc-300 truncate flex-1 leading-tight">
                {item.title}
              </p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-zinc-600">{item.source}</span>
              <span className="text-[10px] text-zinc-700">&middot;</span>
              <span className="text-[10px] text-zinc-600">{timeAgo(item.publishedAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
