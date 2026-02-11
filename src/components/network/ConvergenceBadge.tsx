"use client";

interface ConvergenceBadgeProps {
  count: number;
  pairNames?: string[];
  convergenceId?: string;
  action?: string; // "escalated", "started tracking", etc.
}

export function ConvergenceBadge({ count, pairNames, action = "acted on this" }: ConvergenceBadgeProps) {
  if (count < 1) return null;

  const label = count === 1
    ? `1 other pair also ${action}`
    : `${count} others also ${action}`;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
      <span className="text-amber-500">&#x25C9;</span>
      <span>{label}</span>
      {pairNames && pairNames.length > 0 && (
        <span className="text-amber-500/60 ml-0.5">
          ({pairNames.slice(0, 3).join(", ")}{pairNames.length > 3 ? ` +${pairNames.length - 3}` : ""})
        </span>
      )}
    </div>
  );
}
