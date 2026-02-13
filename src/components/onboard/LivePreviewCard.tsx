"use client";

import { Activity } from "lucide-react";

interface LivePreviewCardProps {
  githubRepos: string[];
  githubUsers: string[];
  rssUrls: string[];
  moltbookTopics: string[];
}

export function LivePreviewCard({
  githubRepos,
  githubUsers,
  rssUrls,
  moltbookTopics,
}: LivePreviewCardProps) {
  const repoCount = githubRepos.length + githubUsers.length;
  const feedCount = rssUrls.length;
  const topicCount = moltbookTopics.length;
  const total = repoCount + feedCount + topicCount;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center">
          <Activity className="w-4 h-4 text-zinc-300" />
        </div>
        <h3 className="text-base font-semibold text-white">Your Feed</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 p-4 text-center">
          <p className="text-2xl font-bold text-white">{repoCount}</p>
          <p className="text-xs text-zinc-500 mt-1">GitHub source{repoCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 p-4 text-center">
          <p className="text-2xl font-bold text-white">{feedCount}</p>
          <p className="text-xs text-zinc-500 mt-1">RSS feed{feedCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 p-4 text-center">
          <p className="text-2xl font-bold text-white">{topicCount}</p>
          <p className="text-xs text-zinc-500 mt-1">Moltbook topic{topicCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {total > 0 && (
        <p className="text-sm text-zinc-500 mt-4 text-center">
          Monitoring <span className="text-amber-400 font-medium">{total}</span> source{total !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
