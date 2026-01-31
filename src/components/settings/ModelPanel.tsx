"use client";

import { useState, useEffect } from "react";
import { Cpu, Loader2 } from "lucide-react";

type Config = {
  agents?: {
    defaults?: {
      model?: { primary?: string } | string;
      models?: Record<string, unknown>;
    };
  };
};

export function ModelPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [hash, setHash] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch("/api/openclaw/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setConfig(d.config ?? {});
          setHash(d.hash);
          const primary =
            typeof d.config?.agents?.defaults?.model === "string"
              ? d.config.agents.defaults.model
              : d.config?.agents?.defaults?.model?.primary;
          setSelected(primary ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const models = config?.agents?.defaults?.models
    ? Object.keys(config.agents.defaults.models)
    : [];
  const primary =
    typeof config?.agents?.defaults?.model === "string"
      ? config.agents.defaults.model
      : config?.agents?.defaults?.model?.primary ?? "";

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw: JSON.stringify({
            agents: {
              defaults: {
                model: { primary: selected },
              },
            },
          }),
          baseHash: hash,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig((c) => ({
          ...c,
          agents: {
            ...c?.agents,
            defaults: {
              ...c?.agents?.defaults,
              model: { primary: selected },
            },
          },
        }));
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
      <div className="flex items-center gap-2 text-zinc-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const options = models.length > 0 ? models : primary ? [primary] : [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Default model used by the agent. Changes require Gateway restart.
      </p>
      <div className="flex items-center gap-3">
        <Cpu className="w-4 h-4 text-zinc-500" />
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">— Select model —</option>
          {options.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          {primary && !options.includes(primary) && (
            <option value={primary}>{primary}</option>
          )}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || selected === primary}
          className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Save"
          )}
        </button>
      </div>
      {primary && (
        <p className="text-xs text-zinc-500">
          Current: <code className="bg-zinc-800 px-1 rounded">{primary}</code>
        </p>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
