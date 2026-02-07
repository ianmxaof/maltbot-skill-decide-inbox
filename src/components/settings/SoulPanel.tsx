"use client";

import { useState, useEffect } from "react";
import { Heart, Loader2, Check } from "lucide-react";

export function SoulPanel() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    fetch("/api/openclaw/memory?type=soul")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && typeof d.content === "string") setContent(d.content);
      })
      .catch(() => setError("Failed to load soul"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "soul", content }),
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
        Loading soul (personality & voice)…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Core truths, voice preferences, blocked phrases, and custom instructions. Stored in <code className="bg-zinc-800 px-1 rounded">claude/soul.md</code>.
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none font-mono resize-y min-h-[12rem]"
        placeholder="# Soul (Personality + Voice + Values)…"
        spellCheck={false}
      />
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
            <Heart className="h-3.5 w-3.5" />
          )}
          Save soul
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
