"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Loader2, Play, RotateCcw } from "lucide-react";

/** Models shown when each API key is configured — no refresh needed after save */
const API_KEY_MODELS: Record<string, string[]> = {
  ANTHROPIC_API_KEY: [
    "anthropic/claude-opus-4-5",
    "anthropic/claude-sonnet-4",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-haiku",
  ],
  OPENAI_API_KEY: [
    "openai/gpt-5.2",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "openai/gpt-4-turbo",
  ],
  OPENROUTER_API_KEY: [
    "openrouter/z-ai/glm-4.7",
    "openrouter/anthropic/claude-sonnet-4",
    "openrouter/anthropic/claude-3.5-sonnet",
    "openrouter/anthropic/claude-3-haiku",
    "openrouter/openai/gpt-4o",
    "openrouter/openai/gpt-4o-mini",
    "openrouter/google/gemini-2.0-flash-001",
    "openrouter/google/gemini-flash-1.5",
    "openrouter/meta-llama/llama-3.3-70b-instruct",
  ],
  GROQ_API_KEY: [
    "groq/llama-3.3-70b-versatile",
    "groq/llama-3.1-8b-instant",
  ],
  ZAI_API_KEY: [
    "zai/glm-4.7",
    "zai/glm-4.7-flash",
  ],
};

type Config = {
  agents?: {
    defaults?: {
      model?: { primary?: string } | string;
      models?: Record<string, unknown>;
    };
  };
};

type EnvKey = { name: string; masked: string; hasValue: boolean };

export function ModelPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [envKeys, setEnvKeys] = useState<EnvKey[]>([]);
  const [hash, setHash] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");

  const fetchEnv = useCallback(async () => {
    const r = await fetch("/api/openclaw/env");
    const d = await r.json();
    if (d.success && Array.isArray(d.keys)) setEnvKeys(d.keys);
  }, []);

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

  useEffect(() => {
    fetchEnv();
  }, [fetchEnv]);

  useEffect(() => {
    const onKeysUpdated = () => fetchEnv();
    window.addEventListener("settings:keysUpdated", onKeysUpdated);
    return () => window.removeEventListener("settings:keysUpdated", onKeysUpdated);
  }, [fetchEnv]);

  const configModels = config?.agents?.defaults?.models
    ? Object.keys(config.agents.defaults.models)
    : [];

  const primary =
    typeof config?.agents?.defaults?.model === "string"
      ? config.agents.defaults.model
      : config?.agents?.defaults?.model?.primary ?? "";

  useEffect(() => {
    if (primary) setSelected(primary);
  }, [primary]);

  const envConfiguredModels = envKeys
    .filter((k) => k.hasValue && API_KEY_MODELS[k.name])
    .flatMap((k) => API_KEY_MODELS[k.name]);

  const allOptions = Array.from(
    new Set([...configModels, ...envConfiguredModels, primary || ""].filter(Boolean))
  ).sort((a, b) => {
    const aIsOpenRouter = a.startsWith("openrouter/");
    const bIsOpenRouter = b.startsWith("openrouter/");
    if (aIsOpenRouter && !bIsOpenRouter) return 1;
    if (!aIsOpenRouter && bIsOpenRouter) return -1;
    return a.localeCompare(b);
  });

  const handleStartGateway = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/gateway/start", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to start Gateway");
        return;
      }
      if (data.alreadyRunning) {
        setError(null);
        // Dispatch event even if already running (for wizard refresh)
        window.dispatchEvent(new CustomEvent("settings:gatewayUpdated"));
        return;
      }
      setError(null);
      // Notify other components that gateway was started
      window.dispatchEvent(new CustomEvent("settings:gatewayUpdated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start Gateway");
    } finally {
      setStarting(false);
    }
  };

  const handleRestartGateway = async () => {
    setRestarting(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/gateway/restart", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        const msg = data.error ?? "Failed";
        if (msg.includes("timed out")) {
          setError(
            "Restart timed out. If you run the Gateway manually in a terminal (e.g. openclaw gateway --port 18789), there is no service to restart — stop it there (Ctrl+C) and start it again. If the Gateway is installed as a service, try: openclaw gateway restart"
          );
        } else {
          setError(msg);
        }
        return;
      }
      // Notify other components that gateway was restarted
      window.dispatchEvent(new CustomEvent("settings:gatewayUpdated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restart Gateway");
    } finally {
      setRestarting(false);
    }
  };

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
        // Notify other components that model was updated
        window.dispatchEvent(new CustomEvent("settings:modelUpdated"));
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

  const optgroups: { label: string; models: string[] }[] = [];
  const anthropicModels = allOptions.filter((m) => m.startsWith("anthropic/"));
  const openaiModels = allOptions.filter((m) => m.startsWith("openai/") && !m.startsWith("openrouter/"));
  const openRouterModels = allOptions.filter((m) => m.startsWith("openrouter/"));
  const groqModels = allOptions.filter((m) => m.startsWith("groq/"));
  const otherModels = allOptions.filter(
    (m) => !m.startsWith("anthropic/") && !m.startsWith("openai/") && !m.startsWith("openrouter/") && !m.startsWith("groq/")
  );
  if (anthropicModels.length) optgroups.push({ label: "Anthropic (ANTHROPIC_API_KEY)", models: anthropicModels });
  if (openaiModels.length) optgroups.push({ label: "OpenAI (OPENAI_API_KEY)", models: openaiModels });
  if (openRouterModels.length) optgroups.push({ label: "OpenRouter (OPENROUTER_API_KEY)", models: openRouterModels });
  if (groqModels.length) optgroups.push({ label: "Groq (GROQ_API_KEY)", models: groqModels });
  if (otherModels.length) optgroups.push({ label: "Config / Other", models: otherModels });

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Models appear when you save their API key above. Save key → select model → Save → Restart Gateway if needed.
      </p>
      <div className="flex items-center gap-3">
        <Cpu className="w-4 h-4 text-zinc-500" />
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">— Select model —</option>
          {optgroups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </optgroup>
          ))}
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
        <button
          type="button"
          onClick={handleStartGateway}
          disabled={starting || restarting}
          title="Start OpenClaw Gateway in the background (port from OPENCLAW_GATEWAY_PORT or 18789)"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Gateway
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleRestartGateway}
          disabled={starting || restarting}
          title="Restart OpenClaw Gateway (works when Gateway runs as a service)"
          className="flex items-center gap-2 px-4 py-2 border border-zinc-600 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {restarting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              Restart Gateway
            </>
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
