"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";

interface GovernanceFingerprint {
  operatorId: string;
  windowStart: string;
  windowEnd: string;
  hoursBack: number;
  approvedCount: number;
  blockedCount: number;
  approvedByCategory: Record<string, number>;
  blockedByCategory: Record<string, number>;
  topBlockedOperations: Array<{ operation: string; target?: string; count: number }>;
  topAllowedOperations: Array<{ operation: string; target?: string; count: number }>;
  preferredMode?: string;
  overridesSummary: { allow: number; block: number; ask: number };
  signalSourcesCount: number;
}

export default function GovernanceFingerprintBlock() {
  const [fingerprint, setFingerprint] = useState<GovernanceFingerprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(720);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/governance/fingerprint?hours=${hours}`);
      const data = await res.json();
      if (data.success && data.fingerprint) setFingerprint(data.fingerprint);
      else setFingerprint(null);
    } catch {
      setFingerprint(null);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-400" />
          Your governance
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
          >
            <option value={168}>Last 7 days</option>
            <option value={720}>Last 30 days</option>
            <option value={2160}>Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : fingerprint ? (
        <div className="space-y-4 text-sm">
          <p className="text-zinc-400">
            Last {fingerprint.hoursBack / 24} days: <span className="text-emerald-400 font-medium">{fingerprint.approvedCount}</span> approved,{" "}
            <span className="text-red-400 font-medium">{fingerprint.blockedCount}</span> blocked.
          </p>
          {fingerprint.preferredMode && (
            <p className="text-zinc-400">
              Preferred capability profile: <span className="text-amber-400 capitalize">{fingerprint.preferredMode}</span>
            </p>
          )}
          <p className="text-zinc-400">
            Operation overrides: {fingerprint.overridesSummary.allow} allow, {fingerprint.overridesSummary.block} block, {fingerprint.overridesSummary.ask} ask.
          </p>
          <p className="text-zinc-400">
            Signal sources: {fingerprint.signalSourcesCount}.
          </p>
          {fingerprint.topBlockedOperations.length > 0 && (
            <div>
              <span className="text-zinc-500 text-xs uppercase">Top blocked</span>
              <ul className="mt-1 space-y-0.5">
                {fingerprint.topBlockedOperations.slice(0, 5).map((item, i) => (
                  <li key={i} className="text-zinc-400 text-xs">
                    {item.operation}
                    {item.target ? ` → ${item.target}` : ""} ({item.count})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fingerprint.topAllowedOperations.length > 0 && (
            <div>
              <span className="text-zinc-500 text-xs uppercase">Top allowed</span>
              <ul className="mt-1 space-y-0.5">
                {fingerprint.topAllowedOperations.slice(0, 5).map((item, i) => (
                  <li key={i} className="text-zinc-400 text-xs">
                    {item.operation}
                    {item.target ? ` → ${item.target}` : ""} ({item.count})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-zinc-500 text-sm py-2">No governance data for this period.</p>
      )}
    </section>
  );
}
