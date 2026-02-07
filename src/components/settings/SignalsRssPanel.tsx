"use client";

import { useState, useEffect } from "react";
import { Rss, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export function SignalsRssPanel() {
  const [rssUrls, setRssUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    fetch("/api/signals/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.rssUrls)) setRssUrls(d.rssUrls);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    const url = newUrl.trim();
    if (!url || saving) return;
    setSaving(true);
    setError(null);
    try {
      const next = [...rssUrls, url];
      const res = await fetch("/api/signals/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rssUrls: next }),
      });
      const data = await res.json();
      if (data.success) {
        setRssUrls(data.rssUrls ?? next);
        setNewUrl("");
      } else {
        setError(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (index: number) => {
    if (saving) return;
    const next = rssUrls.filter((_, i) => i !== index);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/signals/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rssUrls: next }),
      });
      const data = await res.json();
      if (data.success) {
        setRssUrls(data.rssUrls ?? next);
      } else {
        setError(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        RSS feed URLs appear in the Signals panel (Moltbook tab). You can add RSSHub routes (e.g. Hacker News, Reddit, Product Hunt) or any RSS/Atom feed URL.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://example.com/feed.xml or https://rsshub.app/..."
          className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !newUrl.trim()}
          className="inline-flex items-center gap-1.5 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {rssUrls.length === 0 ? (
          <li className="text-xs text-zinc-500">No RSS URLs yet. Add one above.</li>
        ) : (
          rssUrls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex items-center justify-between gap-2 rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Rss className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="truncate text-sm text-zinc-300">{url}</span>
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                title="Remove"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>
      <p className="text-xs text-zinc-500">
        Items from these feeds show in <Link href="/moltbook?tab=feed" className="text-amber-400 hover:text-amber-300 underline">Signals</Link> with a &quot;Send to inbox&quot; button.
      </p>
    </div>
  );
}
