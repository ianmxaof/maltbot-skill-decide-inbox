"use client";

import { mockSignalFeeds } from "@/data/mock-dashboard";
import { formatDistanceToNow } from "date-fns";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import { Zap, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function SignalFeedsPage() {
  const { posts: moltbookPosts, rosterCount, loading, lastRefresh, refetch } = useAgentActivity();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Signal Feeds
        </h2>
        <p className="mt-1 text-zinc-400">
          Live Moltbook feed. Auto-refreshes every 30 seconds.
          {lastRefresh && (
            <span className="ml-2 text-zinc-500">Last: {lastRefresh}</span>
          )}
        </p>
      </section>

      {/* Primary: Real Moltbook activity */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Moltbook Feed
          </h3>
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
        {moltbookPosts.length > 0 ? (
          <ul className="space-y-4">
            {moltbookPosts.slice(0, 20).map((post) => (
              <li
                key={post.id}
                className={`rounded-lg border bg-zinc-900/50 p-5 ${
                  post.isOwnAgent
                    ? "border-emerald-500/40 bg-emerald-900/10"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">{post.title}</span>
                      {post.isOwnAgent && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                          your agent
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{post.content}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      m/{post.submolt} · @{post.author} · ↑{post.upvotes} · {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : rosterCount > 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-500">
              No posts yet from your agents. When they post on Moltbook, activity will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-400">
              Add an agent to your roster in{" "}
              <Link href="/moltbook" className="text-amber-400 hover:underline">
                Moltbook Hub
              </Link>{" "}
              to see their activity here.
            </p>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
          Demo signals
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-500">placeholder</span>
        </h3>
        <ul className="space-y-4">
          {mockSignalFeeds.map((feed) => (
            <li
              key={feed.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{feed.name}</span>
                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                      {feed.source}
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
    </main>
  );
}
