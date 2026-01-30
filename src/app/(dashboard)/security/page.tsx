import { mockSecurityPosture } from "@/data/mock-dashboard";
import { formatDistanceToNow } from "date-fns";

export default function SecurityPosturePage() {
  const s = mockSecurityPosture;
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Security Posture
        </h2>
        <p className="mt-1 text-zinc-400">
          Public exposure · port risk · API key inventory · plugin trust. What an attacker could see (read-only, sanitized).
        </p>
      </section>

      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-medium text-zinc-300">Public exposure</h3>
          <p className="mt-1">
            {s.publicExposure ? (
              <span className="text-rose-400">Yes — service is reachable from the internet</span>
            ) : (
              <span className="text-emerald-400">No — not publicly exposed</span>
            )}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-medium text-zinc-300">Port visibility risk</h3>
          <p className="mt-1">
            <span className={s.portRiskScore > 50 ? "text-amber-400" : "text-emerald-400"}>
              Score: {s.portRiskScore}/100
            </span>{" "}
            (lower = safer)
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-medium text-zinc-300">API key inventory</h3>
          <ul className="mt-2 space-y-2">
            {s.apiKeys.map((k) => (
              <li key={k.id} className="flex justify-between text-sm">
                <span className="text-zinc-300">{k.label}</span>
                {k.lastUsedAt ? (
                  <span className="text-zinc-500">
                    Last used {formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}
                  </span>
                ) : (
                  <span className="text-zinc-500">Never used</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-medium text-zinc-300">Plugin trust level</h3>
          <ul className="mt-2 space-y-2">
            {s.pluginTrust.map((p) => (
              <li key={p.name} className="flex justify-between text-sm">
                <span className="text-zinc-300">{p.name}</span>
                <span
                  className={
                    p.level === "verified"
                      ? "text-emerald-400"
                      : p.level === "community"
                        ? "text-amber-400"
                        : "text-zinc-500"
                  }
                >
                  {p.level}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {s.attackerPreview && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
            <h3 className="text-sm font-medium text-amber-200">What an attacker could see right now</h3>
            <p className="mt-2 text-sm text-amber-200/90">{s.attackerPreview}</p>
          </div>
        )}
      </div>
    </main>
  );
}
