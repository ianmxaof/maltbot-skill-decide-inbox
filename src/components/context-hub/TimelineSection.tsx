"use client";

import { mockAgentTimeline } from "@/data/mock-dashboard";
import { format } from "date-fns";

const kindLabels: Record<string, string> = {
  observed: "Observed signal",
  hypothesis: "Formed hypothesis",
  cross_check: "Cross-checked against repo",
  proposal: "Generated proposal",
  awaiting_decision: "Awaiting decision",
};

export function TimelineSection() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Agent Timeline
        </h3>
        <p className="mt-1 text-zinc-400">
          Timeline of agent cognition: observed → hypothesis → cross-check → proposal → awaiting decision.
        </p>
      </section>

      <div className="relative">
        <div className="absolute left-3 top-0 h-full w-px bg-zinc-700" />
        <ul className="space-y-0">
          {mockAgentTimeline.map((e) => (
            <li key={e.id} className="relative flex gap-4 pb-6 pl-10">
              <div className="absolute left-0 h-2.5 w-2.5 rounded-full bg-zinc-600 ring-4 ring-zinc-950" />
              <div className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{e.agentName}</span>
                  <span>·</span>
                  <span className="font-medium text-zinc-400">
                    {kindLabels[e.kind] ?? e.kind}
                  </span>
                  <span>·</span>
                  <span>{format(new Date(e.at), "MMM d, HH:mm")}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{e.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
