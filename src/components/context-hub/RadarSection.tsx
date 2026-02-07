"use client";

import { mockRadar } from "@/data/mock-dashboard";
import { formatDistanceToNow } from "date-fns";

const kindLabels: Record<string, string> = {
  ci_failure: "CI failure",
  dependency_churn: "Dependency churn",
  tooling_change: "Tooling change",
  automation_opportunity: "Automation opportunity",
};

export function RadarSection() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          CI / CR Radar
        </h3>
        <p className="mt-1 text-zinc-400">
          Radar view: CI failures upstream, dependency churn, tooling changes, new automation opportunities.
        </p>
      </section>

      <ul className="space-y-4">
        {mockRadar.map((r) => (
          <li key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="rounded bg-zinc-700 px-1.5 py-0.5">
                {kindLabels[r.kind] ?? r.kind}
              </span>
              <span>{formatDistanceToNow(new Date(r.at), { addSuffix: true })}</span>
            </div>
            <h3 className="mt-2 font-medium text-white">{r.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{r.summary}</p>
            {r.impact && (
              <p className="mt-2 rounded bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {r.impact}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
