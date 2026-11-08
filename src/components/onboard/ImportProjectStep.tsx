"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FolderGit2, ChevronRight, ChevronLeft, Loader2, Github } from "lucide-react";
import { getOnboardDraft, setOnboardDraft, type OnboardDraft } from "@/lib/onboard-session";

type RepoOption = { full_name: string; html_url: string; private: boolean };

export function ImportProjectStep() {
  const searchParams = useSearchParams();
  const [repoInput, setRepoInput] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<RepoOption[]>([]);
  const [githubConnected, setGithubConnected] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft) {
      if (draft.projectId) setProjectId(draft.projectId);
      if (draft.projectSkipped) setSkipped(true);
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos", { credentials: "include" });
      const data = await res.json();
      if (data.connected && Array.isArray(data.repos)) {
        setGithubConnected(true);
        setGithubRepos(data.repos);
      } else {
        setGithubConnected(false);
        setGithubRepos([]);
      }
    } catch {
      setGithubConnected(false);
      setGithubRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  useEffect(() => {
    if (githubRepos.length > 0 && !selectedRepo) {
      setSelectedRepo(githubRepos[0].full_name);
    }
    if (githubRepos.length > 0 && selectedRepo && !githubRepos.some((r) => r.full_name === selectedRepo)) {
      setSelectedRepo(githubRepos[0].full_name);
    }
  }, [githubRepos, selectedRepo]);

  // Read OAuth callback params (optional: clear URL without full navigation)
  useEffect(() => {
    const err = searchParams.get("github_error");
    const connected = searchParams.get("github_connected");
    if (err) setError(decodeURIComponent(err));
    if (connected) fetchRepos();
  }, [searchParams, fetchRepos]);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 2 };
    draft.step = 2;
    if (skipped) {
      draft.projectId = undefined;
      draft.projectSkipped = true;
    } else {
      draft.projectSkipped = false;
      if (projectId) {
        draft.projectId = projectId;
      }
    }
    setOnboardDraft(draft);
  }, [projectId, skipped]);

  const normalizeRepo = (s: string): string | null => {
    const t = s.trim();
    if (!t) return null;
    const match = t.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
    if (match) return `${match[1]}/${match[2]}`;
    if (t.includes("/") && !t.includes(" ")) return t;
    return null;
  };

  const createProjectFromRepo = async (repo: string) => {
    const [owner, repoName] = repo.split("/");
    const projectName = repoName || repo;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        problemSpaceMarkdown: "",
        linkedRepos: [
          {
            id: `repo_${Date.now()}`,
            name: repoName,
            url: `https://github.com/${owner}/${repoName}`,
            branch: "main",
          },
        ],
        linkedFeeds: [],
        linkedAgents: [],
        decisionLog: [],
      }),
    });
    const data = await res.json();
    if (!data.success || !data.project?.id) {
      throw new Error(data.error ?? "Failed to create project");
    }
    setProjectId(data.project.id);
    const draft = getOnboardDraft();
    if (draft) {
      draft.projectId = data.project.id;
      setOnboardDraft(draft);
    }
  };

  const handleAddRepo = async () => {
    const fromInput = normalizeRepo(repoInput);
    const repoToUse =
      fromInput ??
      (selectedRepo && githubRepos.some((r) => r.full_name === selectedRepo) ? selectedRepo : null);
    if (!repoToUse) {
      setError("Select a repo from the list or enter owner/repo (e.g. vercel/next.js)");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await createProjectFromRepo(repoToUse);
      setRepoInput("");
      setSelectedRepo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const canContinue = skipped || projectId !== null;

  return (
    <div>
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 2 of 6
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Import Your Project
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Link a GitHub repo as your agent&apos;s work target. Optional — you can add one later.
        </p>
      </div>

      <div className="space-y-6">
        {skipped ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
            <p className="text-sm text-zinc-400">
              You&apos;ll add a project later. Your agent will still monitor RSS and GitHub from your context sources.
            </p>
            <button
              type="button"
              onClick={() => setSkipped(false)}
              className="mt-4 text-sm text-amber-400 hover:text-amber-300"
            >
              Add a project now
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
                <FolderGit2 className="w-4 h-4 text-zinc-300" />
              </div>
              <h3 className="text-base font-semibold text-white">GitHub Repository</h3>
            </div>

            {loadingRepos ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking GitHub connection…
              </div>
            ) : githubConnected && githubRepos.length > 0 ? (
              <>
                <p className="text-sm text-zinc-500 mb-3">
                  Choose a repo from your account
                </p>
                <div className="flex gap-3 flex-wrap items-center">
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  >
                    <option value="">Select a repository…</option>
                    {githubRepos.map((r) => (
                      <option key={r.full_name} value={r.full_name}>
                        {r.full_name}{r.private ? " (private)" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddRepo}
                    disabled={creating || !selectedRepo}
                    className="px-4 py-3 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-2">Or enter a repo manually (e.g. owner/repo)</p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddRepo()}
                      placeholder="owner/repo"
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddRepo}
                      disabled={creating || !repoInput.trim()}
                      className="px-4 py-3 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-500 mb-4">
                  Connect your GitHub account to pick a repo from a list, or enter one manually.
                </p>
                <a
                  href="/api/integrations/github/connect?returnTo=/onboard/2"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-zinc-700 text-white border border-zinc-600 hover:bg-zinc-600 transition mb-4"
                >
                  <Github className="w-4 h-4" />
                  Connect with GitHub
                </a>
                <p className="text-xs text-zinc-500 mb-3">
                  Or enter a repo as <code className="bg-zinc-800 px-1 rounded">owner/repo</code> (e.g. vercel/next.js)
                </p>
              </>
            )}

            {(!githubConnected || githubRepos.length === 0) && !loadingRepos && (
              <div className="flex gap-3 mt-2">
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRepo()}
                  placeholder="owner/repo"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddRepo}
                  disabled={creating || !repoInput.trim()}
                  className="px-4 py-3 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                </button>
              </div>
            )}

            {projectId && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400">Project linked. Your agent will use this repo for context.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-10 pt-8 border-t border-zinc-800/50">
        <Link
          href="/onboard/1"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSkipped(true);
              const draft = getOnboardDraft() ?? { step: 2 };
              draft.projectSkipped = true;
              draft.projectId = undefined;
              setOnboardDraft(draft);
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            Skip, I&apos;ll add a project later
          </button>
          <Link
            href={canContinue ? "/onboard/3" : "#"}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition ${
              canContinue
                ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
            onClick={(e) => !canContinue && e.preventDefault()}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
