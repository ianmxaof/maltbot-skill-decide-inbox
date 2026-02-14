"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiKeysPanel, ModelPanel, IdentityPanel, SoulPanel, MemoryPanel, ScheduledTasksPanel, GoogleOAuthPanel, RefreshIntervalPanel, SignalsRssPanel, SignalsGitHubPanel, ConnectedAccountsPanel } from "@/components/settings";
import { VisibilityControls, SpaceThemeEditor } from "@/components/social";
import { DigestEmailPanel } from "@/components/dashboard";
import { usePair } from "@/hooks/usePair";

function SettingsContent() {
  const { pair } = usePair();
  const pairId = pair?.id ?? "";
  const searchParams = useSearchParams();
  const [spotifyBanner, setSpotifyBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const connected = searchParams.get("spotify_connected");
    const error = searchParams.get("spotify_error");
    if (connected === "true") {
      setSpotifyBanner({ type: "success", message: "Spotify connected. Add the Now Playing widget to your Space theme to show it on your profile." });
    } else if (error) {
      const msg = error === "missing_params" ? "Authorization was cancelled or incomplete." : decodeURIComponent(error);
      setSpotifyBanner({ type: "error", message: `Spotify: ${msg}` });
    }
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      {spotifyBanner && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 ${
            spotifyBanner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <p className="text-sm">{spotifyBanner.message}</p>
          <button
            type="button"
            onClick={() => setSpotifyBanner(null)}
            className="mt-2 text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Settings
        </h2>
        <p className="mt-1 text-zinc-400">
          OpenClaw configuration — change API keys, model, identity, and personality without re-onboarding.
        </p>
      </section>

      <div className="space-y-8">
        {pairId && (
          <section className="rounded-lg border border-violet-500/20 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Space Visibility</h3>
            <VisibilityControls pairId={pairId} />
          </section>
        )}

        {pairId && (
          <section className="rounded-lg border border-violet-500/20 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Space Theme</h3>
            <SpaceThemeEditor pairId={pairId} />
          </section>
        )}

        {pairId && (
          <section className="rounded-lg border border-orange-500/20 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Connected Accounts</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Link external platforms to enrich your profile and feed your agent real context.
            </p>
            <ConnectedAccountsPanel pairId={pairId} />
          </section>
        )}

        {pairId && (
          <section className="rounded-lg border border-amber-500/20 bg-zinc-900/50 p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Morning Briefing Email</h3>
            <DigestEmailPanel pairId={pairId} />
          </section>
        )}

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Feed auto-refresh</h3>
          <RefreshIntervalPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Signals / RSS</h3>
          <SignalsRssPanel />
        </section>
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Signals / GitHub</h3>
          <SignalsGitHubPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">API Keys</h3>
          <ApiKeysPanel />
        </section>

        <section id="default-model" className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Default Model</h3>
          <ModelPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Identity</h3>
          <IdentityPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Soul (Personality & Voice)</h3>
          <SoulPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Memory</h3>
          <MemoryPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Scheduled Tasks</h3>
          <ScheduledTasksPanel />
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Google Workspace</h3>
          <GoogleOAuthPanel />
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl px-6 py-8 animate-pulse text-zinc-500">Loading settings…</main>}>
      <SettingsContent />
    </Suspense>
  );
}
