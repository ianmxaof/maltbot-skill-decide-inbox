"use client";

import { useState, useEffect } from "react";
import { Key, Loader2, Check } from "lucide-react";

type EnvKey = { name: string; masked: string; hasValue: boolean };

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<EnvKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/openclaw/env")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.keys)) setKeys(d.keys);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string) => {
    setEditing(key);
    setValue("");
    setError(null);
  };

  const handleSave = async () => {
    if (!editing || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editing, value }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = keys.map((k) =>
          k.name === editing
            ? { ...k, masked: value ? value.slice(0, 4) + "..." + value.slice(-4) : "", hasValue: Boolean(value) }
            : k
        );
        setKeys(updated);
        setEditing(null);
        setValue("");
      } else {
        setError(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setValue("");
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        API keys are stored in <code className="bg-zinc-800 px-1 rounded">~/.openclaw/.env</code>.
        Change keys here instead of re-onboarding.
      </p>
      <ul className="space-y-2">
        {keys.map((k) => (
          <li
            key={k.name}
            className="flex items-center justify-between gap-4 py-2 border-b border-zinc-800 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Key className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="text-sm font-mono text-zinc-300">{k.name}</span>
              {k.hasValue && (
                <span className="text-xs text-zinc-500 truncate">{k.masked}</span>
              )}
            </div>
            {editing === k.name ? (
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="New value"
                  className="w-40 px-2 py-1 text-sm bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                  aria-label="Save"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1.5 rounded border border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleChange(k.name)}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Change
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-sm text-rose-400">{error}</p>
      )}
    </div>
  );
}
