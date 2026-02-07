"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Play } from "lucide-react";
import { format } from "date-fns";

type ScheduledJobType =
  | "daily_briefing"
  | "weekly_report"
  | "reminder"
  | "heartbeat"
  | "custom";

interface ScheduledJob {
  id: string;
  type: ScheduledJobType;
  cron: string;
  label: string;
  config?: Record<string, unknown>;
  lastRun?: string;
  nextRun: string;
  enabled?: boolean;
}

const JOB_TYPES: { value: ScheduledJobType; label: string }[] = [
  { value: "daily_briefing", label: "Daily briefing" },
  { value: "weekly_report", label: "Weekly report" },
  { value: "reminder", label: "Reminder" },
  { value: "heartbeat", label: "Heartbeat check" },
  { value: "custom", label: "Custom" },
];

const CRON_EXAMPLES: Record<ScheduledJobType, string> = {
  daily_briefing: "0 8 * * *",
  weekly_report: "0 9 * * 1",
  reminder: "0 12 * * *",
  heartbeat: "*/30 * * * *",
  custom: "0 * * * *",
};

export function ScheduledTasksPanel() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState(false);

  const [newType, setNewType] = useState<ScheduledJobType>("daily_briefing");
  const [newCron, setNewCron] = useState("0 8 * * *");
  const [newLabel, setNewLabel] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/openclaw/schedule");
      const d = await r.json();
      if (d.success && Array.isArray(d.jobs)) setJobs(d.jobs);
      else setError(d.error ?? "Failed to load");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          cron: newCron,
          label: newLabel || newType.replace(/_/g, " "),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCron(CRON_EXAMPLES[newType]);
        setNewLabel("");
        await load();
      } else setError(data.error ?? "Failed to add");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/openclaw/schedule?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) await load();
      else setError(data.error ?? "Failed to delete");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleRunDue = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/schedule/run", { method: "POST" });
      const data = await res.json();
      if (data.success) await load();
      else setError(data.error ?? "Failed to run");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run");
    } finally {
      setRunning(false);
    }
  };

  const onTypeChange = (t: ScheduledJobType) => {
    setNewType(t);
    setNewCron(CRON_EXAMPLES[t]);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading schedule…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Cron-like tasks (daily briefing, weekly report, reminders). Run due jobs via this panel or external cron calling <code className="bg-zinc-800 px-1 rounded">POST /api/openclaw/schedule/run</code>.
      </p>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRunDue}
          disabled={running}
          className="inline-flex items-center gap-2 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run due jobs now
        </button>
      </div>

      <div className="rounded border border-zinc-700 bg-zinc-800/50 p-3 space-y-2">
        <h4 className="text-xs font-medium text-zinc-400">Add task</h4>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-0.5">Type</label>
            <select
              value={newType}
              onChange={(e) => onTypeChange(e.target.value as ScheduledJobType)}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white focus:outline-none"
            >
              {JOB_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-0.5">Cron (e.g. 0 8 * * * = 8am daily)</label>
            <input
              type="text"
              value={newCron}
              onChange={(e) => setNewCron(e.target.value)}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white w-32 focus:outline-none font-mono"
              placeholder="0 8 * * *"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-0.5">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white w-40 focus:outline-none"
              placeholder="Optional"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center gap-1 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-xs text-white hover:bg-zinc-600 disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {jobs.length === 0 ? (
          <li className="text-xs text-zinc-500">No scheduled tasks yet.</li>
        ) : (
          jobs.map((j) => (
            <li
              key={j.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-medium">{j.label}</span>
                <span className="ml-2 text-xs text-zinc-500">{j.type}</span>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">{j.cron}</p>
                <p className="text-xs text-zinc-500">
                  Next: {format(new Date(j.nextRun), "yyyy-MM-dd HH:mm")}
                  {j.lastRun && ` · Last: ${format(new Date(j.lastRun), "yyyy-MM-dd HH:mm")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(j.id)}
                className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
