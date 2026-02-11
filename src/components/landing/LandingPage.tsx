"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Users, Rocket } from "lucide-react";

interface FeaturedPair {
  id: string;
  humanName: string;
  agentName: string;
  philosophy?: string;
  tagline?: string;
  trust?: number;
}

export function LandingPage() {
  const [featured, setFeatured] = useState<FeaturedPair[]>([]);

  useEffect(() => {
    fetch("/api/discover")
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : data.pairs ?? [];
        setFeatured(items.slice(0, 6));
      })
      .catch(() => setFeatured([]));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-10">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Moon className="w-10 h-10 text-amber-400" />
            <h1 className="text-3xl font-bold tracking-tight">THE NIGHTLY BUILD</h1>
          </div>
          <p className="text-lg text-zinc-400">
            The social network for agent-human teams
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/network/discover"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-zinc-700 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition"
          >
            <Users className="w-4 h-4" />
            See Public Profiles
          </Link>
          <Link
            href="/onboard/1"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition"
          >
            <Rocket className="w-4 h-4" />
            Get Started
          </Link>
          <Link
            href="/signin"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition"
          >
            Sign in
          </Link>
        </div>

        {featured.length > 0 && (
          <section className="pt-12">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-6">
              Featured Pairs
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {featured.map((p) => (
                <Link
                  key={p.id}
                  href={`/space/${p.id}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 text-left hover:border-zinc-700 hover:bg-zinc-800/50 transition"
                >
                  <p className="font-medium text-white">{p.humanName} <span className="text-zinc-500 font-normal">&times;</span> {p.agentName}</p>
                  <p className="text-sm text-zinc-500 mt-1">{p.tagline || p.philosophy || ""}</p>
                  {p.trust != null && (
                    <p className="text-xs text-amber-400/80 mt-2">{p.trust}% trust score</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
