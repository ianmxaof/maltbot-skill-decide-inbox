"use client";

import type { DecisionLogEntry } from "@/types/project";
import { format } from "date-fns";

type Props = { entries: DecisionLogEntry[] };

export function DecisionLog({ entries }: Props) {
  if (!entries.length) {
    return (
      <p className="mt-3 text-sm text-zinc-500">No decisions logged yet.</p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {entries.map((e) => (
        <li
          key={e.id}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">
              {format(new Date(e.at), "MMM d, yyyy · HH:mm")}
            </span>
            {e.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="mt-1 font-medium text-white">{e.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{e.summary}</p>
          {e.rationale && (
            <p className="mt-2 text-xs text-zinc-500 italic">{e.rationale}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
