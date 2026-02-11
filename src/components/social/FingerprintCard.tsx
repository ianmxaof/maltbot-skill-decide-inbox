"use client";

import type { GovernanceFingerprintSummary } from "@/types/social";

interface FingerprintCardProps {
  fingerprint: GovernanceFingerprintSummary;
}

export function FingerprintCard({ fingerprint }: FingerprintCardProps) {
  const rows = [
    { label: "Style", value: fingerprint.style },
    { label: "Focus", value: fingerprint.focus },
    { label: "Pattern", value: fingerprint.pattern },
    { label: "Active", value: fingerprint.activeWindow },
  ];

  return (
    <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
      <div className="text-xs font-semibold text-violet-300 uppercase tracking-wider mb-3">
        Governance Fingerprint
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <span className="text-[11px] text-zinc-500 font-semibold">{label}</span>
            <div className="text-sm text-zinc-200 mt-0.5">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
