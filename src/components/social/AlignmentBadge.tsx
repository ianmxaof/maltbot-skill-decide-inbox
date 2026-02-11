"use client";

interface AlignmentBadgeProps {
  score: number; // 0–1
  reason?: string | null;
  size?: "sm" | "md";
}

export function AlignmentBadge({ score, reason, size = "md" }: AlignmentBadgeProps) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "text-violet-400" : pct >= 50 ? "text-indigo-400" : "text-zinc-400";
  const ring = pct >= 75 ? "border-violet-500/40" : pct >= 50 ? "border-indigo-500/40" : "border-zinc-600/40";
  const dim = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${dim} rounded-full border-2 ${ring} ${color} flex items-center justify-center font-bold bg-zinc-900/80`}
      >
        {pct}
      </div>
      {reason && (
        <span className="text-xs text-zinc-500">{reason}</span>
      )}
    </div>
  );
}
