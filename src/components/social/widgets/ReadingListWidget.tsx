"use client";

import { BookMarked, ExternalLink } from "lucide-react";
import type { WidgetDataPayload } from "@/types/social";

interface Props {
  data?: WidgetDataPayload["readingList"];
  accentColor: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ReadingListWidget({ data, accentColor }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-zinc-600 gap-1">
        <BookMarked className="w-5 h-5 text-zinc-700" />
        No saved articles yet
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
      {data.slice(0, 6).map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition group"
        >
          <BookMarked className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="text-xs text-zinc-300 truncate flex-1">{item.title}</p>
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
              <span className="text-[10px] text-zinc-600">{timeAgo(item.savedAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
