"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Github, Rss, Plus, X, Hash, ChevronRight } from "lucide-react";
import { LivePreviewCard } from "./LivePreviewCard";
import {
  getOnboardDraft,
  setOnboardDraft,
  type OnboardDraft,
} from "@/lib/onboard-session";

const PRESET_RSS = [
  { label: "Hacker News", url: "https://hnrss.org/frontpage" },
  { label: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { label: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { label: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { label: "AI News (MIT)", url: "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml" },
  { label: "Lobsters", url: "https://lobste.rs/rss" },
];

const PRESET_GITHUB = [
  { label: "vercel/next.js", type: "repo" as const },
  { label: "langchain-ai/langchain", type: "repo" as const },
  { label: "anthropics/anthropic-sdk-python", type: "repo" as const },
  { label: "openai/openai-python", type: "repo" as const },
];

const PRESET_MOLTBOOK = ["m/general", "m/infrastructure", "m/devtools", "m/agent-marketplaces"];

function isValidRssUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ContextStep() {
  const [githubRepos, setGithubRepos] = useState<string[]>([]);
  const [githubUsers, setGithubUsers] = useState<string[]>([]);
  const [rssUrls, setRssUrls] = useState<string[]>([]);
  const [moltbookTopics, setMoltbookTopics] = useState<string[]>([]);
  const [newRepo, setNewRepo] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newRss, setNewRss] = useState("");
  const [rssError, setRssError] = useState<string | null>(null);

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft?.contextSources) {
      setGithubRepos(draft.contextSources.githubRepos ?? []);
      setGithubUsers(draft.contextSources.githubUsers ?? []);
      setRssUrls(draft.contextSources.rssUrls ?? []);
      setMoltbookTopics(draft.contextSources.moltbookTopics ?? []);
    }
  }, []);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 1 };
    draft.step = 1;
    draft.contextSources = {
      githubRepos,
      githubUsers,
      rssUrls,
      moltbookTopics,
    };
    setOnboardDraft(draft);
  }, [githubRepos, githubUsers, rssUrls, moltbookTopics]);

  const addRepo = () => {
    const repo = newRepo.trim();
    if (!repo) return;
    if (!repo.includes("/")) {
      setNewRepo("");
      return;
    }
    const parts = repo.split("/").filter(Boolean);
    const ownerRepo = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : repo;
    if (!githubRepos.includes(ownerRepo)) {
      setGithubRepos([...githubRepos, ownerRepo]);
      setNewRepo("");
    }
  };

  const removeRepo = (i: number) => {
    setGithubRepos(githubRepos.filter((_, idx) => idx !== i));
  };

  const addUser = () => {
    const user = newUser.trim().toLowerCase();
    if (!user || githubUsers.includes(user)) return;
    setGithubUsers([...githubUsers, user]);
    setNewUser("");
  };

  const removeUser = (i: number) => {
    setGithubUsers(githubUsers.filter((_, idx) => idx !== i));
  };

  const addRss = (url?: string) => {
    const u = (url ?? newRss).trim();
    if (!u) return;
    if (!isValidRssUrl(u)) {
      setRssError("Enter a valid URL (http or https)");
      return;
    }
    setRssError(null);
    if (!rssUrls.includes(u)) {
      setRssUrls([...rssUrls, u]);
      setNewRss("");
    }
  };

  const removeRss = (i: number) => {
    setRssUrls(rssUrls.filter((_, idx) => idx !== i));
  };

  const toggleMoltbook = (topic: string) => {
    if (moltbookTopics.includes(topic)) {
      setMoltbookTopics(moltbookTopics.filter((t) => t !== topic));
    } else {
      setMoltbookTopics([...moltbookTopics, topic]);
    }
  };

  const totalSources = githubRepos.length + githubUsers.length + rssUrls.length + moltbookTopics.length;
  const canContinue = totalSources >= 1;

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 1 of 4
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          What Are You Interested In?
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Your public profile will show what you care about. Choose sources to monitor.
        </p>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="space-y-6">
        {/* GitHub Section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <Github className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white">GitHub</h3>
          </div>
          <p className="text-sm text-zinc-500 mb-5 ml-[42px]">
            Track repositories and users for updates.
          </p>

          <div className="space-y-3 mb-5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
                placeholder="owner/repo (e.g. vercel/next.js)"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition"
                onKeyDown={(e) => e.key === "Enter" && addRepo()}
              />
              <button
                type="button"
                onClick={addRepo}
                disabled={!newRepo.trim()}
                className="px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400 disabled:hover:border-zinc-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                placeholder="GitHub username"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition"
                onKeyDown={(e) => e.key === "Enter" && addUser()}
              />
              <button
                type="button"
                onClick={addUser}
                disabled={!newUser.trim()}
                className="px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400 disabled:hover:border-zinc-700 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_GITHUB.map((p) => {
              const selected = githubRepos.includes(p.label);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    if (!selected) {
                      setGithubRepos([...githubRepos, p.label]);
                    } else {
                      setGithubRepos(githubRepos.filter((r) => r !== p.label));
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                    selected
                      ? "border border-amber-500/40 bg-amber-500/15 text-amber-400"
                      : "border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Selected items */}
          {(githubRepos.length > 0 || githubUsers.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-800/50">
              {[...githubRepos, ...githubUsers].map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-sm text-zinc-300"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() =>
                      githubRepos.includes(item)
                        ? removeRepo(githubRepos.indexOf(item))
                        : removeUser(githubUsers.indexOf(item))
                    }
                    className="text-zinc-500 hover:text-red-400 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* News & Blogs Section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <Rss className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white">News & Blogs</h3>
          </div>
          <p className="text-sm text-zinc-500 mb-5 ml-[42px]">
            Add RSS feeds to stay current on topics you care about.
          </p>

          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={newRss}
              onChange={(e) => {
                setNewRss(e.target.value);
                setRssError(null);
              }}
              placeholder="Enter RSS URL"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition"
              onKeyDown={(e) => e.key === "Enter" && addRss()}
            />
            <button
              type="button"
              onClick={() => addRss()}
              disabled={!newRss.trim()}
              className="px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400 disabled:hover:border-zinc-700 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {rssError && (
            <p className="text-sm text-red-400 mb-3">{rssError}</p>
          )}

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_RSS.map((p) => {
              const selected = rssUrls.includes(p.url);
              return (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      setRssUrls(rssUrls.filter((u) => u !== p.url));
                    } else {
                      addRss(p.url);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                    selected
                      ? "border border-amber-500/40 bg-amber-500/15 text-amber-400"
                      : "border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Selected items */}
          {rssUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-800/50">
              {rssUrls.map((url, i) => (
                <span
                  key={`${url}-${i}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 max-w-[240px]"
                >
                  <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
                  <button
                    type="button"
                    onClick={() => removeRss(i)}
                    className="text-zinc-500 hover:text-red-400 transition shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Moltbook Section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <Hash className="w-4 h-4 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Moltbook Topics
              <span className="text-xs font-normal text-zinc-500 ml-2">optional</span>
            </h3>
          </div>
          <p className="text-sm text-zinc-500 mb-5 ml-[42px]">
            Follow AI agent communities on Moltbook. Requires a Moltbook API key &mdash; you can add this later in Settings.
          </p>

          <div className="flex flex-wrap gap-2">
            {PRESET_MOLTBOOK.map((topic) => {
              const selected = moltbookTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleMoltbook(topic)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                    selected
                      ? "border border-amber-500/40 bg-amber-500/15 text-amber-400"
                      : "border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live preview */}
        <LivePreviewCard
          githubRepos={githubRepos}
          githubUsers={githubUsers}
          rssUrls={rssUrls}
          moltbookTopics={moltbookTopics}
        />
      </div>

      {/* ── Navigation ──────────────────────────────── */}
      <div className="flex items-center justify-between mt-10 pt-8 border-t border-zinc-800/50">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          Skip for Now
        </Link>
        <Link
          href={canContinue ? "/onboard/2" : "#"}
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
  );
}
