"use client";

import { getIdleDays } from "@/lib/idle";

type Props = {
  lastActivityAt: string | undefined;
  compact?: boolean;
};

export function IdleBanner({ lastActivityAt, compact }: Props) {
  const days = getIdleDays(lastActivityAt);
  if (days === null || days < 1) return null;

  if (compact) {
    return (
      <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
        Idle {days}d
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <p className="text-sm text-amber-200">
        This project has been idle for <strong>{days} days</strong>.
      </p>
      <p className="mt-1 text-xs text-amber-200/80">
        See &quot;What changed&quot; below for updates since last activity.
      </p>
    </div>
  );
}
