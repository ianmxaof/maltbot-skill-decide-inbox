"use client";

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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-medium text-zinc-400 mb-2">Your feed will include:</h3>
      <ul className="text-sm text-zinc-300 space-y-1">
        <li>• {repoCount} GitHub source{repoCount !== 1 ? "s" : ""}</li>
        <li>• {feedCount} RSS feed{feedCount !== 1 ? "s" : ""}</li>
        <li>• {topicCount} Moltbook topic{topicCount !== 1 ? "s" : ""}</li>
      </ul>
      {total > 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          Monitoring {total} source{total !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
