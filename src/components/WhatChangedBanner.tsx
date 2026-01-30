"use client";

import { getIdleDays } from "@/lib/idle";

type Props = {
  projectId: string;
  lastActivityAt: string | undefined;
};

/**
 * "This project has been idle for 9 days — here's what changed"
 * Placeholder: in production this would fetch diffs / feed summaries since lastActivityAt.
 */
export function WhatChangedBanner({ projectId, lastActivityAt }: Props) {
  const days = getIdleDays(lastActivityAt);
  if (days === null || days < 1) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
      <p className="text-sm text-zinc-300">
        <strong>Here&apos;s what changed</strong> in the last {days} days
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        (Placeholder: will show repo diffs, feed highlights, and agent activity since last activity.)
      </p>
    </div>
  );
}
