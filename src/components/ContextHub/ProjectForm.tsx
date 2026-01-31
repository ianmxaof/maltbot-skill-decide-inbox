"use client";

import { useState, useEffect } from "react";
import type { LinkedRepo, LinkedFeed, LinkedAgent } from "@/types/project";
import { Plus, Trash2 } from "lucide-react";

const FEED_TYPES = ["rss", "api", "docs", "moltbook", "custom"] as const;

type ProjectFormData = {
  name: string;
  problemSpaceMarkdown: string;
  primaryAgentId?: string;
  linkedRepos: LinkedRepo[];
  linkedFeeds: LinkedFeed[];
  linkedAgents: LinkedAgent[];
};

type RosterAgent = { id: string; name: string; keyHint?: string };

function nextId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  submitting,
}: {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [problemSpaceMarkdown, setProblemSpaceMarkdown] = useState(initialData?.problemSpaceMarkdown ?? "");
  const [primaryAgentId, setPrimaryAgentId] = useState(initialData?.primaryAgentId ?? "");
  const [linkedRepos, setLinkedRepos] = useState<LinkedRepo[]>(initialData?.linkedRepos ?? []);
  const [linkedFeeds, setLinkedFeeds] = useState<LinkedFeed[]>(initialData?.linkedFeeds ?? []);
  const [linkedAgents, setLinkedAgents] = useState<LinkedAgent[]>(initialData?.linkedAgents ?? []);
  const [rosterAgents, setRosterAgents] = useState<RosterAgent[]>([]);

  const [repoName, setRepoName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoBranch, setRepoBranch] = useState("");
  const [feedName, setFeedName] = useState("");
  const [feedSource, setFeedSource] = useState("");
  const [feedType, setFeedType] = useState<LinkedFeed["type"]>("rss");
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("Research");

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => setRosterAgents(d.agents ?? []));
  }, []);

  const addRepo = () => {
    if (!repoName.trim() || !repoUrl.trim()) return;
    setLinkedRepos((prev) => [
      ...prev,
      { id: nextId(), name: repoName.trim(), url: repoUrl.trim(), branch: repoBranch.trim() || undefined },
    ]);
    setRepoName("");
    setRepoUrl("");
    setRepoBranch("");
  };

  const removeRepo = (id: string) => setLinkedRepos((prev) => prev.filter((r) => r.id !== id));

  const addFeed = () => {
    if (!feedName.trim() || !feedSource.trim()) return;
    setLinkedFeeds((prev) => [
      ...prev,
      { id: nextId(), name: feedName.trim(), urlOrSource: feedSource.trim(), type: feedType },
    ]);
    setFeedName("");
    setFeedSource("");
  };

  const removeFeed = (id: string) => setLinkedFeeds((prev) => prev.filter((f) => f.id !== id));

  const addAgent = () => {
    if (!agentName.trim()) return;
    setLinkedAgents((prev) => [
      ...prev,
      { id: nextId(), name: agentName.trim(), role: agentRole.trim() || "Research" },
    ]);
    setAgentName("");
  };

  const removeAgent = (id: string) => setLinkedAgents((prev) => prev.filter((a) => a.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      problemSpaceMarkdown: problemSpaceMarkdown.trim(),
      primaryAgentId: primaryAgentId.trim() || undefined,
      linkedRepos,
      linkedFeeds,
      linkedAgents,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label htmlFor="project-name" className="block text-sm font-medium text-zinc-400 mb-2">
          Name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. API reliability & observability"
          required
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      <div>
        <label htmlFor="problem-space" className="block text-sm font-medium text-zinc-400 mb-2">
          Problem space (ruleset the agent follows)
        </label>
        <textarea
          id="problem-space"
          value={problemSpaceMarkdown}
          onChange={(e) => setProblemSpaceMarkdown(e.target.value)}
          placeholder="Define goals, constraints, and context. Markdown supported."
          rows={8}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Repos</h3>
        <ul className="space-y-2 mb-3">
          {linkedRepos.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-sm text-zinc-300">{r.name} — {r.url}</span>
              <button type="button" onClick={() => removeRepo(r.id)} aria-label="Remove" className="p-1 text-zinc-500 hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="Name"
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm w-32"
          />
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="URL"
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm flex-1 min-w-[200px]"
          />
          <input
            type="text"
            value={repoBranch}
            onChange={(e) => setRepoBranch(e.target.value)}
            placeholder="Branch"
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm w-24"
          />
          <button type="button" onClick={addRepo} className="p-2 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Feeds</h3>
        <ul className="space-y-2 mb-3">
          {linkedFeeds.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-sm text-zinc-300">{f.name} ({f.type}) — {f.urlOrSource}</span>
              <button type="button" onClick={() => removeFeed(f.id)} aria-label="Remove" className="p-1 text-zinc-500 hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={feedName}
            onChange={(e) => setFeedName(e.target.value)}
            placeholder="Name"
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm w-32"
          />
          <input
            type="text"
            value={feedSource}
            onChange={(e) => setFeedSource(e.target.value)}
            placeholder="URL or source"
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm flex-1 min-w-[200px]"
          />
          <select
            value={feedType}
            onChange={(e) => setFeedType(e.target.value as LinkedFeed["type"])}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm"
          >
            {FEED_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="button" onClick={addFeed} className="p-2 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Agents to follow</h3>
        <ul className="space-y-2 mb-3">
          {linkedAgents.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-sm text-zinc-300">{a.name} ({a.role})</span>
              <button type="button" onClick={() => removeAgent(a.id)} aria-label="Remove" className="p-1 text-zinc-500 hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Name"
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm w-32"
          />
          <input
            type="text"
            value={agentRole}
            onChange={(e) => setAgentRole(e.target.value)}
            placeholder="Role"
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm w-28"
          />
          <button type="button" onClick={addAgent} className="p-2 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="primary-agent" className="block text-sm font-medium text-zinc-400 mb-2">
          Primary agent (uses this context)
        </label>
        <select
          id="primary-agent"
          value={primaryAgentId}
          onChange={(e) => setPrimaryAgentId(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">— Select —</option>
          <option value="main">OpenClaw main</option>
          {rosterAgents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">The agent that uses this project's context when you run Direct to Agent.</p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-zinc-600 text-zinc-400 rounded-lg hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
