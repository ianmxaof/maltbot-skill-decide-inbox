"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileWarning, Loader2, RefreshCw } from "lucide-react";

interface RiskReportSummary {
  period: string;
  since: string;
  until: string;
  blockedCount: number;
  approvedCount: number;
  anomalyCount: number;
  rateSpikeCount: number;
  topAnomalyTypes: Record<string, number>;
  suggestedRulesCount: number;
  suggestedRules: { id: string; description: string; type: string }[];
}

export default function RiskReportPage() {
  const [summary, setSummary] = useState<RiskReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [anomaliesLastHour, setAnomaliesLastHour] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cron/risk-report?hours=${hours}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setAnomaliesLastHour(data.anomaliesLastHour ?? null);
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/security"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Security
        </Link>
      </div>
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Risk report
        </h2>
        <p className="mt-1 text-zinc-400">
          Blocked/approved counts, anomalies, rate spikes, and suggested rules for the selected period.
        </p>
      </section>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
        >
          <option value={24}>Last 24 hours</option>
          <option value={168}>Last 7 days</option>
        </select>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded border border-zinc-600 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {anomaliesLastHour != null && anomaliesLastHour >= 5 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-200 text-sm">
              {anomaliesLastHour} anomalies in the last hour. Consider reviewing the Security dashboard.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-xs uppercase text-zinc-500">Blocked</div>
              <div className="text-2xl font-bold text-red-400">{summary.blockedCount}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-xs uppercase text-zinc-500">Approved</div>
              <div className="text-2xl font-bold text-emerald-400">{summary.approvedCount}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-xs uppercase text-zinc-500">Anomalies</div>
              <div className="text-2xl font-bold text-amber-400">{summary.anomalyCount}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="text-xs uppercase text-zinc-500">Rate spikes</div>
              <div className="text-2xl font-bold text-zinc-300">{summary.rateSpikeCount}</div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Period</h3>
            <p className="text-sm text-zinc-500">
              {summary.period}: {new Date(summary.since).toLocaleString()} — {new Date(summary.until).toLocaleString()}
            </p>
          </div>

          {Object.keys(summary.topAnomalyTypes).length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Top anomaly types</h3>
              <ul className="space-y-1">
                {Object.entries(summary.topAnomalyTypes).map(([type, count]) => (
                  <li key={type} className="flex justify-between text-sm">
                    <span className="text-zinc-400">{type}</span>
                    <span className="text-zinc-300 font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Suggested rules</h3>
            <p className="text-sm text-zinc-500 mb-3">
              {summary.suggestedRulesCount} suggested rule(s) from activity. Apply from the Security → Suggested Rules tab.
            </p>
            {summary.suggestedRules.length > 0 ? (
              <ul className="space-y-2">
                {summary.suggestedRules.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 text-xs">{r.type}</span>
                    <span className="text-zinc-400">{r.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">None</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-12 text-zinc-500">
          <FileWarning className="h-12 w-12 opacity-50" />
          <p>Could not load risk report.</p>
        </div>
      )}
    </main>
  );
}
