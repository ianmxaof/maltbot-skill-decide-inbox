"use client";

import { useState, useEffect } from "react";
import { Activity, Clock } from "lucide-react";
import Link from "next/link";

interface AgentStatusCardProps {
  humanName?: string;
  heartbeatIntervalMinutes?: number;
  contextSources?: {
    githubRepos: string[];
    githubUsers: string[];
    rssUrls: string[];
    moltbookTopics: string[];
  };
}

function countSources(ctx?: AgentStatusCardProps["contextSources"]): number {
  if (!ctx) return 0;
  return (
    ctx.githubRepos.length +
    ctx.githubUsers.length +
    ctx.rssUrls.length +
    ctx.moltbookTopics.length
  );
}

export function AgentStatusCard({
  humanName = "Operator",
  heartbeatIntervalMinutes = 30,
  contextSources,
}: AgentStatusCardProps) {
  const [nextCheck, setNextCheck] = useState<string>("");

  useEffect(() => {
    const interval = Math.max(heartbeatIntervalMinutes, 1) * 60 * 1000;
    const now = Date.now();
    const next = Math.ceil(now / interval) * interval;
    const mins = Math.round((next - now) / 60000);
    setNextCheck(mins <= 0 ? "Checking soon…" : `Next check in ~${mins} min`);
  }, [heartbeatIntervalMinutes]);

  const total = countSources(contextSources);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Activity className="w-4 h-4 text-amber-500" />
        Agent status
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        Monitoring {total} source{total !== 1 ? "s" : ""} every {heartbeatIntervalMinutes} min
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
        <Clock className="w-3 h-3" />
        {nextCheck}
      </p>
      <Link
        href="/settings"
        className="mt-3 block text-xs text-amber-500/80 hover:text-amber-400"
      >
        Configure agent →
      </Link>
    </div>
  );
}
