"use client";

import Link from "next/link";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import { Zap } from "lucide-react";

export function AgentActivityBlock() {
  const { posts, rosterCount } = useAgentActivity();

  if (rosterCount === 0 || posts.length === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Recent from your Moltbook agents
      </h3>
      <ul className="space-y-3">
        {posts.slice(0, 5).map((post) => (
          <li
            key={post.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <p className="font-medium text-white line-clamp-1">{post.title}</p>
            <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{post.content}</p>
            <p className="mt-2 text-xs text-zinc-600">
              m/{post.submolt} · @{post.author}
              {post.agentName && ` (${post.agentName})`}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href="/moltbook"
        className="mt-3 inline-block text-sm text-amber-400 hover:text-amber-300"
      >
        View Moltbook Hub →
      </Link>
    </section>
  );
}
