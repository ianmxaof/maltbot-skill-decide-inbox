"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Loader2, Check, Calendar } from "lucide-react";
import { format } from "date-fns";

type TabId = "user" | "memory" | "heartbeat" | "daily";

const TABS: { id: TabId; label: string }[] = [
  { id: "user", label: "User profile" },
  { id: "memory", label: "Long-term memory" },
  { id: "heartbeat", label: "Heartbeat" },
  { id: "daily", label: "Daily notes" },
];

export function MemoryPanel() {
  const [tab, setTab] = useState<TabId>("user");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [dailyDates, setDailyDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailyContent, setDailyContent] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);

  const memoryType = tab === "user" ? "user" : tab === "memory" ? "memory" : "heartbeat";

  const loadContent = useCallback(async () => {
    if (tab === "daily") return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/openclaw/memory?type=${memoryType}`);
      const d = await r.json();
      if (d.success && typeof d.content === "string") setContent(d.content);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tab, memoryType]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (tab === "daily") {
      fetch("/api/openclaw/memory/daily")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.dates)) setDailyDates(d.dates);
        });
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
      setDailyContent("");
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "daily" || !selectedDate) return;
    setDailyLoading(true);
    fetch(`/api/openclaw/memory/daily?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDailyContent(d.content ?? "");
      })
      .finally(() => setDailyLoading(false));
  }, [tab, selectedDate]);

  const handleSave = async () => {
    if (tab === "daily") return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: memoryType, content }),
      });
      const result = await res.json();
      if (result.success) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
      } else setError(result.error ?? "Failed to save");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDaily = async () => {
    if (!selectedDate) return;
    setDailySaving(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/memory/daily", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, content: dailyContent }),
      });
      const result = await res.json();
      if (result.success) {
        if (!dailyDates.includes(selectedDate)) setDailyDates((d) => [selectedDate, ...d].sort().reverse());
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
      } else setError(result.error ?? "Failed to save");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setDailySaving(false);
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        User profile, long-term memory, heartbeat tasks, and daily notes in <code className="bg-zinc-800 px-1 rounded">claude/</code>.
      </p>

      <div className="flex flex-wrap gap-1 border-b border-zinc-700 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              tab === t.id
                ? "bg-zinc-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "daily" && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none font-mono resize-y min-h-[10rem]"
                placeholder={tab === "user" ? "User profile…" : tab === "memory" ? "Long-term memory…" : "Heartbeat tasks…"}
                spellCheck={false}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                  Save
                </button>
                {justSaved && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === "daily" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400">Date:</label>
            <input
              type="date"
              value={selectedDate ?? today}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              className="rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-sm text-white focus:border-zinc-600 focus:outline-none"
            />
          </div>
          {selectedDate && (
            <>
              {dailyLoading ? (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <textarea
                    value={dailyContent}
                    onChange={(e) => setDailyContent(e.target.value)}
                    rows={12}
                    className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none font-mono resize-y min-h-[8rem]"
                    placeholder="Daily note…"
                    spellCheck={false}
                  />
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDaily}
                      disabled={dailySaving}
                      className="inline-flex items-center gap-2 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {dailySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                      Save daily note
                    </button>
                    {justSaved && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {dailyDates.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-1">Existing notes</p>
              <ul className="flex flex-wrap gap-1">
                {dailyDates.slice(0, 20).map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`rounded px-2 py-0.5 text-xs ${
                        selectedDate === d ? "bg-zinc-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {d}
                    </button>
                  </li>
                ))}
                {dailyDates.length > 20 && <span className="text-xs text-zinc-500">…</span>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
