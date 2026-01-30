import { mockSkills } from "@/data/mock-dashboard";

export default function SkillsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Skill Marketplace
        </h2>
        <p className="mt-1 text-zinc-400">
          Skills with reputation: author identity, dependency risk, usage telemetry, time-to-rollback. Dry-run before install.
        </p>
      </section>

      <ul className="space-y-4">
        {mockSkills.map((s) => (
          <li key={s.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{s.name}</h3>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      s.authorReputation === "verified"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : s.authorReputation === "community"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-zinc-600 text-zinc-400"
                    }`}
                  >
                    {s.authorReputation ?? "unknown"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{s.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {s.authorName} · Risk {s.dependencyRiskScore}/100
                  {s.usageCount != null && ` · ${s.usageCount} installs`}
                  {s.timeToRollback && ` · Rollback ~${s.timeToRollback}`}
                </p>
              </div>
              <div className="shrink-0">
                {s.hasDryRun && (
                  <span className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-400">
                    Dry run
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
