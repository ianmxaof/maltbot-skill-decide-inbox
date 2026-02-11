"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Github, Rss, Plus, Trash2 } from "lucide-react";
import { LivePreviewCard } from "./LivePreviewCard";
import {
  getOnboardDraft,
  setOnboardDraft,
  type OnboardDraft,
} from "@/lib/onboard-session";

const PRESET_RSS = [
  { label: "Hacker News", url: "https://hnrss.org/frontpage" },
  { label: "TechCrunch", url: "https://techcrunch.com/feed/" },
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
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-white">
          Step 1 of 4: What Are You Interested In?
        </h2>
        <p className="mt-1 text-zinc-400">
          Your public profile will show what you care about. Choose sources to monitor.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub
        </h3>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            placeholder="owner/repo (e.g. vercel/next.js)"
            className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
            onKeyDown={(e) => e.key === "Enter" && addRepo()}
          />
          <button
            type="button"
            onClick={addRepo}
            disabled={!newRepo.trim()}
            className="px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="GitHub username"
            className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
            onKeyDown={(e) => e.key === "Enter" && addUser()}
          />
          <button
            type="button"
            onClick={addUser}
            disabled={!newUser.trim()}
            className="px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[...githubRepos, ...githubUsers].map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-sm text-zinc-300"
            >
              {item}
              <button
                type="button"
                onClick={() =>
                  githubRepos.includes(item) ? removeRepo(githubRepos.indexOf(item)) : removeUser(githubUsers.indexOf(item))
                }
                className="text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Rss className="w-4 h-4" />
          News and Blogs
        </h3>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={newRss}
            onChange={(e) => {
              setNewRss(e.target.value);
              setRssError(null);
            }}
            placeholder="Enter RSS URL"
            className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
            onKeyDown={(e) => e.key === "Enter" && addRss()}
          />
          <button
            type="button"
            onClick={() => addRss()}
            disabled={!newRss.trim()}
            className="px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {rssError && <p className="text-sm text-red-400 mb-2">{rssError}</p>}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_RSS.map((p) => (
            <button
              key={p.url}
              type="button"
              onClick={() => addRss(p.url)}
              className="px-3 py-1.5 rounded border border-zinc-600 bg-zinc-800/50 text-sm text-zinc-400 hover:bg-zinc-700"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {rssUrls.map((url, i) => (
            <span
              key={`${url}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-sm text-zinc-300 truncate max-w-[200px]"
            >
              {url}
              <button type="button" onClick={() => removeRss(i)} className="text-zinc-500 hover:text-red-400 shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Moltbook Topics</h3>
        <div className="flex flex-wrap gap-2">
          {PRESET_MOLTBOOK.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => toggleMoltbook(topic)}
              className={`px-3 py-1.5 rounded border text-sm ${
                moltbookTopics.includes(topic)
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                  : "border-zinc-600 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      <LivePreviewCard
        githubRepos={githubRepos}
        githubUsers={githubUsers}
        rssUrls={rssUrls}
        moltbookTopics={moltbookTopics}
      />

      <div className="flex justify-between pt-4">
        <Link
          href="/"
          className="text-zinc-500 hover:text-zinc-300"
        >
          Skip for Now
        </Link>
        <Link
          href={canContinue ? "/onboard/2" : "#"}
          className={`px-4 py-2 rounded-lg ${
            canContinue
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          }`}
          onClick={(e) => !canContinue && e.preventDefault()}
        >
          Continue
        </Link>
      </div>
    </div>
  );
}
