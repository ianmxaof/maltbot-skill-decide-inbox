"use client";

import { useState } from "react";
import { mockDecideInbox } from "@/data/mock-dashboard";
import { format } from "date-fns";
import type { DecideInboxItem as Item } from "@/types/dashboard";

const riskColors: Record<Item["riskLevel"], string> = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-rose-500/20 text-rose-400",
};

export default function DecideInboxPage() {
  const [items, setItems] = useState(mockDecideInbox.filter((i) => i.status === "pending"));

  const act = (id: string, action: "ignore" | "approve" | "deeper") => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Decide Inbox
        </h2>
        <p className="mt-1 text-zinc-400">
          Single inbox for human decisions. What changed · why it matters · options · risk · recommendation.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Swipe left = ignore · Swipe right = approve · Long press = deeper analysis (UI: use buttons below)
        </p>
      </section>

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {format(new Date(item.at), "MMM d, HH:mm")}
              <span className={`rounded px-1.5 py-0.5 ${riskColors[item.riskLevel]}`}>
                {item.riskLevel}
              </span>
            </div>
            <h3 className="mt-2 font-medium text-white">What changed</h3>
            <p className="text-sm text-zinc-300">{item.whatChanged}</p>
            <h3 className="mt-3 font-medium text-white">Why it matters</h3>
            <p className="text-sm text-zinc-300">{item.whyItMatters}</p>
            <div className="mt-3">
              <span className="text-xs font-medium text-zinc-500">Options</span>
              <ul className="mt-1 space-y-1">
                {item.options.map((o) => (
                  <li key={o.id} className="text-sm text-zinc-400">
                    {o.label}: {o.summary}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 rounded bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200">
              <strong>Recommendation:</strong> {item.recommendation}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => act(item.id, "ignore")}
                className="rounded border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Ignore
              </button>
              <button
                type="button"
                onClick={() => act(item.id, "approve")}
                className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => act(item.id, "deeper")}
                className="rounded border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Deeper analysis
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
          Inbox clear. New items appear when the system needs your decision.
        </p>
      )}
    </main>
  );
}
