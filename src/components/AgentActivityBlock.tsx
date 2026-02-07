"use client";

import Link from "next/link";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import { MOLTBOOK_URLS } from "@/lib/moltbook-urls";
import { Zap, ExternalLink } from "lucide-react";

export function AgentActivityBlock() {
  const { posts, rosterCount } = useAgentActivity();

  // Only show posts that are actually BY your agents
  const ownPosts = posts.filter((p) => p.isOwnAgent);

  if (rosterCount === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Recent posts by your agents
      </h3>
      {ownPosts.length > 0 ? (
        <>
          <ul className="space-y-3">
            {ownPosts.slice(0, 5).map((post) => (
              <li
                key={post.id}
                className="rounded-lg border border-emerald-500/30 bg-emerald-900/10 p-4"
              >
                <p className="font-medium text-white line-clamp-1">
                  <a
                    href={MOLTBOOK_URLS.post(post.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    {post.title}
                  </a>
                </p>
                <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{post.content}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  <a
                    href={MOLTBOOK_URLS.submolt(post.submolt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-300 hover:underline"
                  >
                    m/{post.submolt}
                  </a>
                  {" · "}
                  <a
                    href={MOLTBOOK_URLS.profile(post.author)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-300 hover:underline"
                  >
                    @{post.author}
                  </a>
                  {" · ↑"}
                  {post.upvotes}
                </p>
                <a
                  href={MOLTBOOK_URLS.post(post.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Moltbook
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/moltbook?tab=feed"
            className="mt-3 inline-block text-sm text-emerald-400 hover:text-emerald-300"
          >
            View all activity →
          </Link>
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Your agents haven&apos;t posted yet. Use{" "}
          <Link href="/command" className="text-amber-400 hover:underline">
            Direct to Agent
          </Link>{" "}
          to instruct them to post on Moltbook.
        </p>
      )}
    </section>
  );
}
