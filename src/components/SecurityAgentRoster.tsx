"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type RosterAgent = {
  id: string;
  name: string;
  keyHint?: string;
  addedAt: string;
};

export function SecurityAgentRoster() {
  const [agents, setAgents] = useState<RosterAgent[]>([]);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch((e) => { console.error("[SecurityAgentRoster] fetch agents failed:", e); setAgents([]); });
  }, []);

  if (agents.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-medium text-zinc-300 mb-2">Moltbook agent roster</h3>
      <p className="text-xs text-zinc-500 mb-3">
        Agents registered via this dashboard. API keys stored server-side in .data/agents.json (gitignored).
      </p>
      <ul className="space-y-2">
        {agents.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <span className="text-zinc-300">@{a.name}</span>
            {a.keyHint && <span className="text-xs text-zinc-600">{a.keyHint}</span>}
          </li>
        ))}
      </ul>
      <Link
        href="/moltbook"
        className="mt-3 inline-block text-xs text-amber-400 hover:text-amber-300"
      >
        Manage in Moltbook Hub →
      </Link>
    </div>
  );
}
