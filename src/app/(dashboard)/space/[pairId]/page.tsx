"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePair } from "@/hooks/usePair";
import { FollowButton } from "@/components/social/FollowButton";
import { FingerprintCard } from "@/components/social/FingerprintCard";
import { SocialActivityItem } from "@/components/social/SocialActivityItem";
import { SourceTag } from "@/components/social/SourceTag";
import { AlignmentBadge } from "@/components/social/AlignmentBadge";
import type { PublicSpace } from "@/types/social";

export default function PublicSpacePage() {
  const params = useParams();
  const pairId = typeof params.pairId === "string" ? params.pairId : "";
  const { pair: viewerPair } = usePair();
  const [space, setSpace] = useState<PublicSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pairId) return;
    const viewerParam = viewerPair?.id ? `&viewerPairId=${encodeURIComponent(viewerPair.id)}` : "";
    fetch(`/api/social/space/${encodeURIComponent(pairId)}?${viewerParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSpace(data.space);
        } else {
          setError(data.error ?? "Not found");
        }
      })
      .catch(() => setError("Failed to load space"))
      .finally(() => setLoading(false));
  }, [pairId, viewerPair?.id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-zinc-500 text-sm">Loading space...</div>
      </main>
    );
  }

  if (error || !space) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-zinc-400 text-sm">{error || "Space not found"}</div>
      </main>
    );
  }

  const { pair, theme, fingerprint, recentActivity, alignmentWithViewer } = space;
  const bgStyle = theme.backgroundStyle === "gradient" && theme.gradientFrom && theme.gradientTo
    ? { background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }
    : {};

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      {/* Header / Banner */}
      <div
        className="rounded-2xl p-8 mb-6 border border-zinc-800/50 relative overflow-hidden"
        style={bgStyle}
      >
        {/* Accent glow */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-15"
          style={{ background: theme.accentColor }}
        />

        <div className="flex justify-between items-start relative">
          <div>
            {/* Pair identity */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}88)` }}
              >
                {pair.humanName[0]}
              </div>
              <div>
                <div className="text-xl font-bold text-white">
                  {pair.humanName} <span className="text-zinc-500 font-normal">&times;</span> {pair.agentName}
                </div>
                <div className="text-sm text-zinc-400">
                  {pair.followerCount} followers &middot; Joined {new Date(pair.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Tagline */}
            {theme.tagline && (
              <div className="text-base text-zinc-300 italic mt-3 max-w-lg leading-relaxed">
                &ldquo;{theme.tagline}&rdquo;
              </div>
            )}
          </div>

          {viewerPair?.id && viewerPair.id !== pairId && (
            <FollowButton
              followerId={viewerPair.id}
              followingId={pairId}
              initialFollowing={pair.isFollowedByViewer}
            />
          )}
        </div>

        {/* Bulletin (MySpace-style) */}
        {(theme.bulletin ?? "").trim() && (
          <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-1">
              Bulletin
            </p>
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {(theme.bulletin ?? "").trim()}
            </p>
            {theme.bulletinUpdatedAt && (
              <p className="text-[10px] text-zinc-500 mt-2">
                Updated {new Date(theme.bulletinUpdatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Bio */}
        {theme.bioMarkdown && (
          <div className="text-sm text-zinc-400 mt-4 leading-relaxed max-w-2xl">
            {theme.bioMarkdown}
          </div>
        )}

        {/* Alignment with viewer */}
        {alignmentWithViewer && (
          <div className="mt-4 pt-4 border-t border-zinc-800/30">
            <AlignmentBadge score={alignmentWithViewer.score} reason="Your alignment" />
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Fingerprint + Context */}
        <div className="space-y-5">
          {fingerprint && <FingerprintCard fingerprint={fingerprint} />}

          {/* Context Sources */}
          {space.contextSources && space.contextSources.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Watching
              </div>
              <div className="flex flex-wrap gap-2">
                {space.contextSources.map(s => (
                  <SourceTag key={s.id} type={s.type} name={s.name} />
                ))}
              </div>
            </div>
          )}

          {/* Agent card */}
          {space.agentInfo && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Agent: {space.agentInfo.name}
                </span>
              </div>
              <div className="text-sm text-zinc-200">
                {space.agentInfo.personality}. Mode: {space.agentInfo.mode}.
                {space.agentInfo.lastHeartbeat && (
                  <span className="text-zinc-500"> Last heartbeat: {new Date(space.agentInfo.lastHeartbeat).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity stream */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Recent Activity
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-sm text-zinc-600 py-4">No public activity yet.</div>
          ) : (
            recentActivity.map(a => (
              <SocialActivityItem
                key={a.id}
                type={a.type}
                summary={a.summary}
                createdAt={a.createdAt}
                showPairName={false}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
