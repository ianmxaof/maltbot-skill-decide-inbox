"use client";

import { useActivityFeed } from "@/hooks/useActivityFeed";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";

export function RecentActionsBlock({ limit = 5 }: { limit?: number }) {
  const { items, loading } = useActivityFeed({ limit });

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-500">Loading recent actions…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-white">Recent actions</p>
        <p className="mt-2 text-sm text-zinc-500">
          Your agent will check for signals every 30 minutes. Activity will appear here as it works.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Recent actions</p>
        <Link
          href="/activity"
          className="text-xs text-amber-500/80 hover:text-amber-400 flex items-center gap-1"
        >
          View all
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {items.slice(0, limit).map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-zinc-200">{item.action}</p>
              <p className="text-xs text-zinc-500">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
