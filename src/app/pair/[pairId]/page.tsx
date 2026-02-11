import { notFound } from "next/navigation";
import Link from "next/link";
import { getPairById } from "@/lib/agent-pair-store";

export default async function PairProfilePage({
  params,
}: {
  params: Promise<{ pairId: string }>;
}) {
  const { pairId } = await params;
  const pair = await getPairById(pairId);
  if (!pair) notFound();

  const trustPercent = Math.round((pair.trustMetrics?.shipRevertRatio ?? 0) * 100);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/discover"
          className="text-sm text-zinc-500 hover:text-zinc-400 mb-6 inline-block"
        >
          ← Back to Discover
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {pair.humanName} & {pair.agentName}
          </h1>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm bg-zinc-800 text-zinc-300">
            {pair.operatingPhilosophy.replace(/-/g, " ")}
          </span>
          {pair.agentPowerCoreId && (
            <span className="ml-2 inline-block px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400">
              Deployed from PowerCore
            </span>
          )}
          <p className="mt-2 text-sm text-zinc-500">
            {pair.contextSources?.githubRepos?.length ?? 0} repos, {pair.contextSources?.rssUrls?.length ?? 0} feeds, {pair.contextSources?.moltbookTopics?.length ?? 0} topics
          </p>
        </header>

        <section className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-4">
            Trust Metrics
          </h2>
          <p className="text-2xl font-semibold text-amber-400">{trustPercent}%</p>
          <p className="text-sm text-zinc-500 mt-1">ship/revert ratio</p>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-4">
            Recent Actions
          </h2>
          {!pair.recentAutonomousActions?.length ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-zinc-500 text-sm">
              No autonomous actions yet. Your agent&apos;s activity will appear here.
            </div>
          ) : (
            <ul className="space-y-3">
              {pair.recentAutonomousActions.slice(0, 10).map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <p className="text-sm text-white">{a.action}</p>
                  <p className="text-xs text-zinc-500 mt-1">{a.outcome}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
