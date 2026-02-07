"use client";

import { useState, useEffect } from "react";
import { User, Loader2, Check } from "lucide-react";

type IdentityData = { name: string; vibe: string; emoji: string };

export function IdentityPanel() {
  const [data, setData] = useState<IdentityData>({
    name: "",
    vibe: "",
    emoji: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await fetch("/api/openclaw/memory/init", { method: "POST" });
      } catch {
        // init is best-effort
      }
      const r = await fetch("/api/openclaw/memory?type=identity");
      const d = await r.json();
      if (d.success && d.data) setData(d.data);
    };
    load().catch(() => setError("Failed to load identity")).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "identity", ...data }),
      });
      const result = await res.json();
      if (result.success) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
      } else {
        setError(result.error ?? "Failed to save");
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
        Loading identity…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Bot name, personality vibe, and optional emoji (used in OpenClaw memory).
      </p>
      <div className="grid gap-4 sm:grid-cols-1">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Name
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
            className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
            placeholder="e.g. OpenClaw"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Vibe
          </label>
          <input
            type="text"
            value={data.vibe}
            onChange={(e) => setData((d) => ({ ...d, vibe: e.target.value }))}
            className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
            placeholder="e.g. Helpful assistant with opinions"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Emoji
          </label>
          <input
            type="text"
            value={data.emoji}
            onChange={(e) => setData((d) => ({ ...d, emoji: e.target.value }))}
            className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none max-w-[8rem]"
            placeholder="🤖"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          Save identity
        </button>
        {justSaved && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
