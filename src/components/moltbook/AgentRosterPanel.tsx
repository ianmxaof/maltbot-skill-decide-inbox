"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, ChevronRight } from "lucide-react";

type RosterAgent = {
  id: string;
  name: string;
  keyHint?: string;
  addedAt: string;
};

export function AgentRosterPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [agents, setAgents] = useState<RosterAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addKey, setAddKey] = useState("");
  const [addErr, setAddErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const fetchRoster = async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddErr(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), apiKey: addKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setAddName("");
      setAddKey("");
      setShowAdd(false);
      await fetchRoster();
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <p className="text-sm text-zinc-500">Loading roster…</p>
      </div>
    );
  }

  return (
    <div className="p-5 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
          <Users className="w-4 h-4" />
          MY AGENTS
        </h3>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
        >
          <UserPlus className="w-3 h-3" />
          Add
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-3 bg-zinc-800/50 rounded-lg space-y-2">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Agent name"
            className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm"
          />
          <input
            type="password"
            value={addKey}
            onChange={(e) => setAddKey(e.target.value)}
            placeholder="API key (moltbook_sk_...)"
            className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm"
          />
          {addErr && <p className="text-xs text-rose-400">{addErr}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={adding || !addName.trim() || !addKey.trim()}
              className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setAddErr(null); }}
              className="px-3 py-1.5 bg-zinc-700 text-zinc-400 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-1">
        {agents.length === 0 && (
          <li className="text-sm text-zinc-500 py-2">No agents yet. Register one in Moltbook, then add to roster.</li>
        )}
        {agents.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(selectedId === a.id ? null : a.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                selectedId === a.id ? "bg-amber-500/20 text-amber-400" : "hover:bg-zinc-800/50 text-zinc-300"
              }`}
            >
              <span className="font-medium truncate">@{a.name}</span>
              {a.keyHint && <span className="text-xs text-zinc-500">{a.keyHint}</span>}
              <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
