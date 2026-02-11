"use client";

import { useActivityFeed } from "@/hooks/useActivityFeed";
import Link from "next/link";
import { CheckCircle2, RotateCcw, Edit3, ExternalLink } from "lucide-react";

function OutcomeIcon({ outcome }: { outcome?: "kept" | "reverted" | "modified" }) {
  switch (outcome) {
    case "kept":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "reverted":
      return <RotateCcw className="w-4 h-4 text-amber-500" />;
    case "modified":
      return <Edit3 className="w-4 h-4 text-blue-500" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-zinc-500" />;
  }
}

export default function ActivityPage() {
  const { items, loading, refetch } = useActivityFeed({ limit: 100 });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Activity
          </h2>
          <p className="mt-1 text-zinc-400">
            Autonomous actions across your agent
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm text-amber-500/80 hover:text-amber-400"
        >
          Refresh
        </button>
      </section>

      {loading ? (
        <p className="text-zinc-500">Loading activity…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">
            Autonomous actions will appear here as your agent works.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4"
            >
              <div className="flex items-start gap-3">
                <OutcomeIcon outcome={item.outcome} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{item.action}</p>
                  {item.reasoning && (
                    <p className="mt-1 text-sm text-zinc-500">{item.reasoning}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-600">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                    {item.outcome && (
                      <span className="text-xs text-zinc-500 capitalize">
                        {item.outcome}
                      </span>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/pair/${item.pairId}`}
                      className="inline-flex items-center gap-0.5 text-xs text-amber-500/80 hover:text-amber-400"
                    >
                      View profile
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
