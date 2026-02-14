"use client";

import { useState, useEffect } from "react";
import { Flame, ExternalLink, MessageSquare, ArrowUp, Trophy } from "lucide-react";
import type { HNWidgetData } from "@/types/integration";

interface Props {
  pairId: string;
  accentColor: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 1) return `${Math.max(1, Math.floor(ms / 60000))}m`;
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function HackerNewsWidget({ pairId, accentColor }: Props) {
  const [data, setData] = useState<HNWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/integrations/data?pairId=${encodeURIComponent(pairId)}&providerId=hackernews`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.widgetData) {
          setData(res.data.widgetData as HNWidgetData);
        } else {
          setError(res.error ?? "Not connected");
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [pairId]);

  if (loading) {
    return <div className="text-xs text-zinc-600 animate-pulse">Loading HN data...</div>;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        <Flame className="w-4 h-4 mr-2 text-zinc-700" />
        {error || "No HN data"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Profile header */}
      <div className="flex items-center justify-between">
        <a
          href={`https://news.ycombinator.com/user?id=${data.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 group"
        >
          <Flame className="w-4 h-4" style={{ color: "#ff6600" }} />
          <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition">
            {data.username}
          </span>
          <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition" />
        </a>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-orange-400" />
            <span className="font-bold text-orange-400">{data.karma.toLocaleString()}</span>
          </div>
          <span className="text-zinc-600">{data.accountAge}</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
        <span>{data.totalSubmissions.toLocaleString()} submissions</span>
        {data.topStoryScore > 0 && (
          <>
            <span className="text-zinc-700">&middot;</span>
            <span className="flex items-center gap-0.5">
              <Trophy className="w-2.5 h-2.5 text-amber-500" />
              Top: {data.topStoryScore} pts
            </span>
          </>
        )}
      </div>

      {/* Recent stories */}
      {data.recentStories.length > 0 && (
        <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
          {data.recentStories.slice(0, 5).map(story => (
            <a
              key={story.id}
              href={story.url ?? `https://news.ycombinator.com/item?id=${story.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition group"
            >
              <div className="flex items-center gap-0.5 mt-0.5 flex-shrink-0 min-w-[32px]">
                <ArrowUp className="w-2.5 h-2.5 text-orange-500/60" />
                <span className="text-[10px] font-medium text-orange-400/80">{story.score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 leading-tight truncate group-hover:text-white transition">
                  {story.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
                    <MessageSquare className="w-2.5 h-2.5" />
                    {story.comments}
                  </span>
                  <span className="text-[10px] text-zinc-700">&middot;</span>
                  <span className="text-[10px] text-zinc-600">{timeAgo(story.postedAt)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Recent comments preview */}
      {data.recentComments.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/50">
          <div className="text-[10px] text-zinc-600 uppercase font-semibold mb-1">Recent Comments</div>
          {data.recentComments.slice(0, 2).map(comment => (
            <a
              key={comment.id}
              href={`https://news.ycombinator.com/item?id=${comment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-2 py-1 rounded hover:bg-white/5 transition"
            >
              {comment.parentTitle && (
                <p className="text-[10px] text-zinc-500 truncate mb-0.5">
                  on: {comment.parentTitle}
                </p>
              )}
              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                {comment.text}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
