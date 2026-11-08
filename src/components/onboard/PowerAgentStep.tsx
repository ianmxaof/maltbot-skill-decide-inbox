"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Key, Cpu, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { getOnboardDraft, setOnboardDraft, type OnboardDraft } from "@/lib/onboard-session";

const API_KEY_PROVIDERS = [
  { key: "ANTHROPIC_API_KEY", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { key: "OPENAI_API_KEY", label: "OpenAI (GPT)", placeholder: "sk-..." },
] as const;

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
};

export function PowerAgentStep() {
  const [provider, setProvider] = useState<string>("ANTHROPIC_API_KEY");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft) {
      if (draft.apiKeyMasked === "skipped") {
        setSkipped(true);
      } else if (draft.apiKeyProvider && draft.apiKeyMasked && draft.apiKeyMasked !== "skipped") {
        setAlreadyConfigured(true);
        setProvider(draft.apiKeyProvider);
        setModelId(draft.modelId ?? "");
      } else if (draft.apiKeyProvider) setProvider(draft.apiKeyProvider);
      if (draft.modelId) setModelId(draft.modelId);
    }
  }, []);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 2 };
    draft.step = 3;
    if (skipped) {
      draft.apiKeyProvider = undefined;
      draft.apiKeyMasked = "skipped";
      draft.modelId = undefined;
    } else if (alreadyConfigured) {
      draft.apiKeyProvider = provider;
      draft.modelId = modelId || undefined;
      // Keep existing apiKeyMasked
    } else if (apiKey.trim()) {
      draft.apiKeyProvider = provider;
      draft.apiKeyMasked = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : undefined;
      draft.modelId = modelId || undefined;
    }
    setOnboardDraft(draft);
  }, [provider, apiKey, modelId, skipped, alreadyConfigured]);

  const models = API_KEY_MODELS[provider] ?? [];

  const handleContinue = async (): Promise<boolean> => {
    if (skipped) return true;

    if (!apiKey.trim()) {
      setError("Enter an API key or skip to set up later in Settings.");
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: provider, value: apiKey.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to save API key");
        return false;
      }

      const draft = getOnboardDraft();
      if (draft) {
        draft.apiKeyProvider = provider;
        draft.apiKeyMasked = `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
        draft.modelId = modelId || models[0];
        setOnboardDraft(draft);
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const canContinue = skipped || alreadyConfigured || (apiKey.trim().length > 0);
  const needsSaveBeforeContinue = !skipped && !alreadyConfigured && apiKey.trim().length > 0;

  return (
    <div>
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 3 of 5
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Power Your Agent
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Add an API key and pick a model so your agent can think. You can change this anytime in Settings.
        </p>
      </div>

      <div className="space-y-6">
        {skipped ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
            <p className="text-sm text-zinc-400">
              You&apos;ll set this up in Settings. Your dashboard will still work — you just won&apos;t get AI-powered summaries until you add a key.
            </p>
            <button
              type="button"
              onClick={() => setSkipped(false)}
              className="mt-4 text-sm text-amber-400 hover:text-amber-300"
            >
              Add a key now
            </button>
          </div>
        ) : alreadyConfigured ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">API key configured</p>
                <p className="text-xs text-zinc-500">
                  {provider} • {modelId || "Default model"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlreadyConfigured(false)}
              className="mt-4 text-sm text-amber-400 hover:text-amber-300"
            >
              Change key
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                  <Key className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="text-base font-semibold text-white">API Key</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      setModelId("");
                      setApiKey("");
                    }}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  >
                    {API_KEY_PROVIDERS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={API_KEY_PROVIDERS.find((p) => p.key === provider)?.placeholder ?? "sk-..."}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="text-base font-semibold text-white">Model</h3>
              </div>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
              >
                <option value="">— Select model —</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-10 pt-8 border-t border-zinc-800/50">
        <Link
          href="/onboard/2"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            I&apos;ll set this up in Settings
          </button>
          <Link
            href={canContinue ? "/onboard/4" : "#"}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition ${
              canContinue
                ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
            onClick={async (e) => {
              if (!canContinue) {
                e.preventDefault();
                return;
              }
              if (needsSaveBeforeContinue) {
                e.preventDefault();
                const ok = await handleContinue();
                if (ok) window.location.href = "/onboard/4";
              }
            }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
