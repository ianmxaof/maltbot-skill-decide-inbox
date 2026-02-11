"use client";

import { useState, useMemo } from "react";
import { mockSignalFeeds } from "@/data/mock-dashboard";
import { formatDistanceToNow } from "date-fns";
import { useSignalsItems } from "@/hooks/useSignalsItems";
import { MOLTBOOK_URLS } from "@/lib/moltbook-urls";
import type { SignalFeedCard } from "@/types/dashboard";
import type { FeedItem } from "@/types/signals";
import { Zap, RefreshCw, ExternalLink, Layers, Pause, Play, Inbox } from "lucide-react";
import Link from "next/link";
import { showToast } from "@/lib/toast";

type SourceFilter = "all" | "moltbook" | "rss" | "github";
type LayerFilter = "all" | 1 | 2 | 3;

function filterByLayer(feeds: SignalFeedCard[], layer: LayerFilter): SignalFeedCard[] {
  if (layer === "all") return feeds;
  return feeds.filter((f) => (f.layer ?? 1) === layer);
}

function filterBySource(items: FeedItem[], source: SourceFilter): FeedItem[] {
  if (source === "all") return items;
  return items.filter((i) => i.source === source);
}

/** Signals panel: unified FeedItem list (Moltbook + RSS) with source filter and Send to inbox. */
export function FeedPanel() {
  const [frozen, setFrozen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { items: feedItems, rosterCount, loading, lastRefresh, refetch } = useSignalsItems({ pausePolling: frozen });
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [layerFilter, setLayerFilter] = useState<LayerFilter>("all");
  const filteredDemoSignals = filterByLayer(mockSignalFeeds, layerFilter);

  const handleSendToInbox = async (item: FeedItem) => {
    setSendingId(item.id);
    try {
      const res = await fetch("/api/decide/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "signal",
          title: item.title,
          url: item.url,
          summary: item.summary,
          source: item.source,
          sourceId: item.sourceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Added to Decide Inbox");
      } else {
        console.error("Send to inbox failed:", data.error);
      }
    } catch (e) {
      console.error("Send to inbox failed:", e);
    } finally {
      setSendingId(null);
    }
  };

  const filteredItems = useMemo(
    () => filterBySource(feedItems, sourceFilter),
    [feedItems, sourceFilter]
  );

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-2">
          Signals
        </h3>
        <p className="text-sm text-zinc-400 mb-4">
          Things worth paying attention to. Auto-refresh controlled in Settings.
          {lastRefresh && (
            <span className="ml-2 text-zinc-500">Last: {lastRefresh}</span>
          )}
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Signal list
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500">Source:</span>
            {(["all", "moltbook", "rss", "github"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={`rounded border px-2 py-1 text-xs capitalize ${
                  sourceFilter === s
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFrozen((f) => !f)}
              className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                frozen
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                  : "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
              }`}
              title={frozen ? "Resume auto-refresh" : "Freeze auto-refresh"}
              aria-label={frozen ? "Resume" : "Freeze"}
            >
              {frozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {frozen ? "Resume" : "Freeze"}
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        {filteredItems.length > 0 ? (
          <ul className="space-y-4">
            {filteredItems.slice(0, 20).map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border bg-zinc-900/50 p-5 ${
                  item.source === "moltbook" && (item.meta as { isOwnAgent?: boolean })?.isOwnAgent
                    ? "border-emerald-500/40 bg-emerald-900/10"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-white hover:text-amber-400 hover:underline line-clamp-1"
                        >
                          {item.title}
                        </a>
                      ) : (
                        <span className="font-medium text-white line-clamp-1">{item.title}</span>
                      )}
                      {item.source === "moltbook" && (
                        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                          Moltbook
                        </span>
                      )}
                      {item.source === "rss" && (
                        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                          RSS
                        </span>
                      )}
                      {item.source === "github" && (
                        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                          GitHub
                        </span>
                      )}
                      {item.source === "moltbook" && (item.meta as { isOwnAgent?: boolean })?.isOwnAgent && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                          your agent
                        </span>
                      )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendToInbox(item)}
                        disabled={sendingId === item.id}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                        title="Send to Decide Inbox"
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        Send to inbox
                      </button>
                    </div>
                    {item.summary && (
                      <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{item.summary}</p>
                    )}
                    {item.source === "moltbook" && item.meta && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {"submolt" in item.meta && typeof item.meta.submolt === "string" && (
                          <>
                            <a
                              href={MOLTBOOK_URLS.submolt(item.meta.submolt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-zinc-300 hover:underline"
                            >
                              m/{item.meta.submolt}
                            </a>
                            {" · "}
                          </>
                        )}
                        {"author" in item.meta && typeof item.meta.author === "string" && (
                          <a
                            href={MOLTBOOK_URLS.profile(item.meta.author)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-300 hover:underline"
                          >
                            @{item.meta.author}
                          </a>
                        )}
                        {"upvotes" in item.meta && typeof item.meta.upvotes === "number" && (
                          <> · ↑{item.meta.upvotes}</>
                        )}
                        {" · "}
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    )}
                    {item.source === "github" && item.meta && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {"actor" in item.meta && typeof item.meta.actor === "string" && (
                          <a
                            href={`https://github.com/${item.meta.actor}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-zinc-300 hover:underline"
                          >
                            @{item.meta.actor}
                          </a>
                        )}
                        {"repo" in item.meta && typeof item.meta.repo === "string" && (
                          <>
                            {" · "}
                            <a
                              href={`https://github.com/${item.meta.repo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:text-zinc-300 hover:underline"
                            >
                              {item.meta.repo}
                            </a>
                          </>
                        )}
                        {" · "}
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View original
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : rosterCount > 0 && sourceFilter !== "rss" && sourceFilter !== "github" ? (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-500">
              No Moltbook posts yet. When your agents post, they will appear here.
            </p>
          </div>
        ) : sourceFilter === "rss" ? (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-500">
              Add RSS sources in Settings to see items here.
            </p>
          </div>
        ) : sourceFilter === "github" ? (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-500">
              Add GitHub users or repos (owner/repo) in Settings to see activity here.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-400">
              Add an agent to your roster in the Overview tab to see their activity here.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Demo signals
            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-500">placeholder</span>
          </h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500 mr-1">Layer:</span>
            {(["all", 1, 2, 3] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayerFilter(l)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  layerFilter === l
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                }`}
              >
                {l === "all" ? "All" : `L${l}`}
              </button>
            ))}
          </div>
        </div>
        <ul className="space-y-4">
          {filteredDemoSignals.map((feed) => (
            <li
              key={feed.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{feed.name}</span>
                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                      {feed.source}
                    </span>
                    <span className="rounded bg-zinc-700/80 px-1.5 py-0.5 text-xs text-zinc-500" title="Governance layer">
                      L{feed.layer ?? 1}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{feed.lastDelta}</p>
                  <p className="mt-1 text-xs text-zinc-500 italic">
                    Why it matters: {feed.whyItMatters}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Fetched {formatDistanceToNow(new Date(feed.lastFetchedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-semibold text-emerald-400">
                    {feed.signalStrength}
                  </div>
                  <div className="text-xs text-zinc-500">signal</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {(feed.confidence * 100).toFixed(0)}% conf
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
