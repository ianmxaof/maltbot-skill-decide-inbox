"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, Check, UserPlus } from "lucide-react";

const DEFAULT_NAME = "PowerCoreAi";

function RegistrationSuccess({
  result,
  onAddedToRoster,
}: {
  result: { api_key: string; claim_url: string; agent_name: string };
  onAddedToRoster: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleAddToRoster = async () => {
    setAdding(true);
    setErr(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: result.agent_name, apiKey: result.api_key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setAdded(true);
      setTimeout(onAddedToRoster, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
      <h3 className="text-sm font-semibold text-emerald-400 mb-3">Registration successful</h3>
      <p className="text-sm text-zinc-300 mb-4">
        Save your API key immediately — it will not be shown again.
      </p>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-zinc-500">API key:</span>
          <code className="ml-2 block mt-1 p-2 bg-zinc-900 rounded text-amber-400 break-all font-mono text-xs">
            {result.api_key}
          </code>
        </div>
        <div>
          <span className="text-zinc-500">Claim URL:</span>
          <a
            href={result.claim_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-amber-400 hover:underline flex items-center gap-1"
          >
            {result.claim_url}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleAddToRoster}
            disabled={adding || added}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {added ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {added ? "Added to roster!" : adding ? "Adding…" : "Add to roster"}
          </button>
          {err && <p className="mt-2 text-xs text-rose-400">{err}</p>}
        </div>
        <p className="text-xs text-zinc-500">
          Add to roster to see live data in this dashboard. Open the claim URL and post the verification tweet to activate your agent.
        </p>
      </div>
    </div>
  );
}

const DEFAULT_DESCRIPTION =
  "Governance and marketplace layer for AI agents. Human-in-the-loop decisions via Decide Inbox.";

export function MoltbookRegisterWidget() {
  const [name, setName] = useState(DEFAULT_NAME);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    api_key: string;
    claim_url: string;
    verification_code: string;
    agent_name: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/moltbook/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      const agent = data.agent ?? data;
      setResult({
        api_key: agent.api_key ?? "",
        claim_url: agent.claim_url ?? "",
        verification_code: agent.verification_code ?? "",
        agent_name: agent.name ?? name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <RegistrationSuccess
        result={result}
        onAddedToRoster={() => {
          setResult(null);
          setName("");
          setDescription("");
        }}
      />
    );
  }

  return (
    <div className="p-5 bg-amber-500/10 rounded-lg border border-amber-500/20">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-400">Connect to Moltbook</h3>
      </div>
      <p className="text-sm text-zinc-400 mb-4">
        Register PowerCoreAi on Moltbook to participate in the agent social layer.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Agent name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="PowerCoreAi"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What your agent does"
            rows={2}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none"
          />
        </div>
        {error && (
          <p className="text-sm text-rose-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Registering…" : "Register on Moltbook"}
        </button>
      </form>
    </div>
  );
}
