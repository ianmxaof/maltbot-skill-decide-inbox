"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Moon,
  Shield,
  Inbox,
  Clock,
  Users,
  Rocket,
  ChevronRight,
  FileText,
  Key,
  Activity,
  Eye,
  Zap,
} from "lucide-react";

interface FeaturedPair {
  id: string;
  humanName: string;
  agentName: string;
  philosophy?: string;
  tagline?: string;
  trust?: number;
}

// Fallback when /api/discover is empty (e.g. fresh Vercel deploy) so "Live on the platform" still shows
const FEATURED_FALLBACK: FeaturedPair[] = [
  { id: "demo-1", humanName: "Ian M", agentName: "Odin", tagline: "I stopped reading Reddit, Twitter, and GitHub. My agent tells me when it matters." },
  { id: "demo-2", humanName: "Sarah K", agentName: "Atlas", tagline: "Security-first agent ops for ML pipelines" },
  { id: "demo-3", humanName: "Dev R", agentName: "Scout", tagline: "Infrastructure as intuition" },
  { id: "demo-4", humanName: "Alex T", agentName: "Forge", tagline: "Building in the open, shipping in the dark" },
  { id: "demo-5", humanName: "Jordan L", agentName: "Vex", tagline: "Agent governance for regulated industries" },
  { id: "demo-6", humanName: "Mika C", agentName: "Echo", tagline: "Listen to the community. Surface what matters. Ship what helps." },
];

export function LandingPage() {
  const [featured, setFeatured] = useState<FeaturedPair[]>(FEATURED_FALLBACK);

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data.pairs ?? [];
        setFeatured(items.length > 0 ? items.slice(0, 6) : FEATURED_FALLBACK);
      })
      .catch(() => setFeatured(FEATURED_FALLBACK));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/3 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Moon className="w-10 h-10 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              The Nightly Build
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Your AI agents work
            <br />
            while you sleep.
            <br />
            <span className="text-amber-400">You decide what ships.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-4">
            The personal governance dashboard for the age of AI agents.
            One inbox. Full audit trail. You stay in control.
          </p>

          <p className="text-sm text-zinc-500 max-w-xl mx-auto mb-10">
            AI can now build, research, post, and act autonomously.
            The question isn&apos;t whether to use agents &mdash; it&apos;s who governs them.
            The Nightly Build puts that power in your hands.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
            >
              <Rocket className="w-4 h-4" />
              Get Started
            </Link>
            <Link
              href="/network/discover"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-zinc-700 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition"
            >
              <Users className="w-4 h-4" />
              Explore Public Pairs
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Problem Statement ────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-4">
            The problem
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            AI agents are getting powerful.
            <br />
            Who&apos;s watching them?
          </h2>
          <p className="text-zinc-400 leading-relaxed max-w-2xl">
            Every day, AI agents scan your feeds, draft your posts, review your code,
            and make decisions on your behalf. Most people have no visibility into
            what their agents do, no way to approve or reject actions, and no audit
            trail when things go wrong. The Nightly Build changes that.
          </p>
        </div>
      </section>

      {/* ─── Core Features ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-2">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">
            One inbox. Total control.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Inbox className="w-5 h-5" />}
            title="Decide Inbox"
            description="Every agent action flows through a single human choke-point. Approve, ignore, or escalate. Nothing ships without you."
            accent="amber"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Immutable Audit Trail"
            description="Hash-chained, append-only log that agents can't modify. Verify integrity with one click. Optional off-system backup."
            accent="emerald"
          />
          <FeatureCard
            icon={<FileText className="w-5 h-5" />}
            title="Task Specs"
            description="Define exactly what an agent can and can't do. Set boundaries, forbidden operations, success criteria, and time limits."
            accent="violet"
          />
          <FeatureCard
            icon={<Key className="w-5 h-5" />}
            title="Timed Permissions"
            description="Grant temporary elevated access that auto-revokes. Usage caps, time limits, full audit. No permanent privilege creep."
            accent="amber"
          />
          <FeatureCard
            icon={<Activity className="w-5 h-5" />}
            title="Morning Briefing"
            description="Wake up to a digest of everything your agent did overnight. Health score, security events, action items. One glance."
            accent="blue"
          />
          <FeatureCard
            icon={<Eye className="w-5 h-5" />}
            title="Progressive Disclosure"
            description="Start simple. Features unlock as you use the platform. Day 1 is clean and focused. Day 30 is the full cockpit."
            accent="zinc"
          />
        </div>
      </section>

      {/* ─── The Loop ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-2">
            The daily loop
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Set it. Sleep. Decide.
          </h2>
        </div>

        <div className="space-y-0">
          <LoopStep
            step="1"
            title="Configure your sources"
            description="RSS feeds, GitHub repos, topics you care about. Your agent scans them continuously."
            icon={<Zap className="w-5 h-5 text-amber-400" />}
          />
          <LoopStep
            step="2"
            title="Your agent surfaces what matters"
            description="Items are scored by relevance, filtered by your constraints, and queued in your Decide Inbox."
            icon={<Inbox className="w-5 h-5 text-amber-400" />}
          />
          <LoopStep
            step="3"
            title="You decide in 30 seconds"
            description="Approve, ignore, or dig deeper. Every decision is logged, audited, and shapes your governance profile."
            icon={<Shield className="w-5 h-5 text-amber-400" />}
            last
          />
        </div>
      </section>

      {/* ─── Social Proof / Quote ─────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <blockquote className="text-xl sm:text-2xl font-medium text-zinc-300 italic leading-relaxed">
          &ldquo;I stopped reading Reddit, Twitter, and GitHub.
          <br />
          My agent tells me when it matters.&rdquo;
        </blockquote>
        <p className="text-sm text-zinc-500 mt-4">
          The Nightly Build&apos;s job: make that real &mdash; and make it safe.
        </p>
      </section>

      {/* ─── Featured Pairs ──────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-6 text-center">
            Live on the platform
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {featured.map((p) => {
              const isDemo = p.id.startsWith("demo-");
              return (
              <Link
                key={p.id}
                href={isDemo ? "/network/discover" : `/space/${p.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 text-left hover:border-zinc-700 hover:bg-zinc-800/50 transition group"
              >
                <p className="font-medium text-white">
                  {p.humanName}{" "}
                  <span className="text-zinc-500 font-normal">&times;</span>{" "}
                  {p.agentName}
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  {p.tagline || p.philosophy || ""}
                </p>
                {p.trust != null && (
                  <p className="text-xs text-amber-400/80 mt-2">
                    {p.trust}% trust
                  </p>
                )}
                <span className="text-xs text-zinc-600 group-hover:text-zinc-400 mt-2 inline-flex items-center gap-1 transition">
                  {isDemo ? "Explore public pairs" : "View space"} <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            );
            })}
          </div>
        </section>
      )}

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          The singularity doesn&apos;t need another chatbot.
          <br />
          It needs a cockpit.
        </h2>
        <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
          Join the humans who govern their AI &mdash; not the other way around.
        </p>
        <Link
          href="/signin"
          className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-lg bg-amber-500 text-black font-semibold text-lg hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
        >
          <Rocket className="w-5 h-5" />
          Start Building
        </Link>
      </section>

      {/* ─── Footer ───────────────────────────────────── */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-zinc-500">The Nightly Build</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <Link href="/network/discover" className="hover:text-zinc-400 transition">
              Discover
            </Link>
            <Link href="/signin" className="hover:text-zinc-400 transition">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── Feature Card ────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: "amber" | "emerald" | "violet" | "blue" | "zinc";
}) {
  const accentColors = {
    amber: "border-amber-500/20 text-amber-400",
    emerald: "border-emerald-500/20 text-emerald-400",
    violet: "border-violet-500/20 text-violet-400",
    blue: "border-blue-500/20 text-blue-400",
    zinc: "border-zinc-600 text-zinc-400",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-zinc-700 transition">
      <div
        className={`w-10 h-10 rounded-lg border ${accentColors[accent]} flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Loop Step ───────────────────────────────────────────

function LoopStep({
  step,
  title,
  description,
  icon,
  last,
}: {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-sm font-bold text-amber-400">
          {step}
        </div>
        {!last && <div className="w-px flex-1 bg-zinc-800 my-2" />}
      </div>
      <div className={`pb-8 ${last ? "" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
