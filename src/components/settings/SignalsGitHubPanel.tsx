"use client";

import { useState, useEffect } from "react";
import { Github, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export function SignalsGitHubPanel() {
  const [githubUsers, setGithubUsers] = useState<string[]>([]);
  const [githubRepos, setGithubRepos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState("");
  const [newRepo, setNewRepo] = useState("");

  useEffect(() => {
    fetch("/api/signals/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (Array.isArray(d.githubUsers)) setGithubUsers(d.githubUsers);
          if (Array.isArray(d.githubRepos)) setGithubRepos(d.githubRepos);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const patchConfig = async (users: string[], repos: string[]) => {
    const res = await fetch("/api/signals/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUsers: users, githubRepos: repos }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? "Failed to save");
    return data;
  };

  const handleAddUser = async () => {
    const user = newUser.trim().toLowerCase();
    if (!user || saving || githubUsers.includes(user)) return;
    setSaving(true);
    setError(null);
    try {
      const next = [...githubUsers, user];
      const data = await patchConfig(next, githubRepos);
      setGithubUsers(data.githubUsers ?? next);
      setNewUser("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (index: number) => {
    if (saving) return;
    const next = githubUsers.filter((_, i) => i !== index);
    setSaving(true);
    setError(null);
    try {
      const data = await patchConfig(next, githubRepos);
      setGithubUsers(data.githubUsers ?? next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRepo = async () => {
    const repo = newRepo.trim();
    if (!repo || saving) return;
    if (!repo.includes("/")) {
      setError("Use owner/repo format (e.g. octocat/Hello-World)");
      return;
    }
    setError(null);
    const parts = repo.split("/").filter(Boolean);
    const ownerRepo = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : repo;
    if (githubRepos.includes(ownerRepo)) return;
    setSaving(true);
    setError(null);
    try {
      const next = [...githubRepos, ownerRepo];
      const data = await patchConfig(githubUsers, next);
      setGithubRepos(data.githubRepos ?? next);
      setNewRepo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRepo = async (index: number) => {
    if (saving) return;
    const next = githubRepos.filter((_, i) => i !== index);
    setSaving(true);
    setError(null);
    try {
      const data = await patchConfig(githubUsers, next);
      setGithubRepos(data.githubRepos ?? next);
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
        GitHub users and repos (owner/repo) appear in the Signals panel. Public events (pushes, issues, PRs, stars, etc.) are fetched. Optional: set <code className="bg-zinc-800 px-1 rounded">GITHUB_TOKEN</code> for higher rate limits.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div>
        <span className="text-xs font-medium text-zinc-400">Users (public events)</span>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="username"
            className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
          />
          <button
            type="button"
            onClick={handleAddUser}
            disabled={saving || !newUser.trim()}
            className="inline-flex items-center gap-1.5 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {githubUsers.length === 0 ? (
            <li className="text-xs text-zinc-500">No users yet.</li>
          ) : (
            githubUsers.map((user, index) => (
              <li
                key={`${user}-${index}`}
                className="flex items-center justify-between gap-2 rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Github className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <a
                    href={`https://github.com/${user}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-300 hover:text-amber-400 truncate"
                  >
                    {user}
                  </a>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveUser(index)}
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
      </div>

      <div>
        <span className="text-xs font-medium text-zinc-400">Repos (owner/repo)</span>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            placeholder="owner/repo"
            className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            onKeyDown={(e) => e.key === "Enter" && handleAddRepo()}
          />
          <button
            type="button"
            onClick={handleAddRepo}
            disabled={saving || !newRepo.trim()}
            className="inline-flex items-center gap-1.5 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {githubRepos.length === 0 ? (
            <li className="text-xs text-zinc-500">No repos yet.</li>
          ) : (
            githubRepos.map((repo, index) => (
              <li
                key={`${repo}-${index}`}
                className="flex items-center justify-between gap-2 rounded border border-zinc-700 bg-zinc-800/50 px-3 py-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Github className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <a
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-300 hover:text-amber-400 truncate"
                  >
                    {repo}
                  </a>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveRepo(index)}
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
      </div>

      <p className="text-xs text-zinc-500">
        GitHub activity shows in <Link href="/moltbook?tab=feed" className="text-amber-400 hover:text-amber-300 underline">Signals</Link> with a &quot;Send to inbox&quot; button.
      </p>
    </div>
  );
}
