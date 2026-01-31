"use client";

import { mockSignalFeeds } from "@/data/mock-dashboard";
import { formatDistanceToNow } from "date-fns";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import { Zap } from "lucide-react";

export default function SignalFeedsPage() {
  const { posts: moltbookPosts, rosterCount } = useAgentActivity();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Signal Feeds
        </h2>
        <p className="mt-1 text-zinc-400">
          Feeds as first-class: signal strength, last delta, why it matters to this project, confidence.
        </p>
      </section>

      {rosterCount > 0 && moltbookPosts.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Moltbook Activity (from your agents)
          </h3>
          <ul className="space-y-4">
            {moltbookPosts.slice(0, 15).map((post) => (
              <li
                key={post.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">{post.title}</span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                        moltbook
                      </span>
                      {post.agentName && (
                        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                          @{post.agentName}
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
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-zinc-400 mb-4">Other signals</h3>
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
