"use client";

import Link from "next/link";
import { ApiKeysPanel, ModelPanel } from "@/components/settings";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Settings
        </h2>
        <p className="mt-1 text-zinc-400">
          OpenClaw configuration — change API keys, model, and channels without re-onboarding.
        </p>
      </section>

      <div className="space-y-8">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">API Keys</h3>
          <ApiKeysPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Default Model</h3>
          <ModelPanel />
        </section>
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        Config is stored in <code className="bg-zinc-800 px-1 rounded">~/.openclaw/</code>.
        Start or restart the Gateway for changes to take effect. See{" "}
        <code className="bg-zinc-800 px-1 rounded">docs/OPENCLAW-FULL-SCOPE-SETTINGS.md</code> for
        the roadmap to full OpenClaw CLI parity.
      </p>

      <p className="mt-4 text-xs text-zinc-500">
        Auth or token errors in <Link href="/command" className="text-amber-400 hover:text-amber-300 underline">Direct to Agent</Link>? Save your API key above, then click <strong>Start Gateway</strong>. No terminal needed.
      </p>
    </main>
  );
}
