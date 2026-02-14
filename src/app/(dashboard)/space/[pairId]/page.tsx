"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Volume2, VolumeX, Users, UserPlus } from "lucide-react";
import { usePair } from "@/hooks/usePair";
import { FollowButton } from "@/components/social/FollowButton";
import { FingerprintCard } from "@/components/social/FingerprintCard";
import { SocialActivityItem } from "@/components/social/SocialActivityItem";
import { SourceTag } from "@/components/social/SourceTag";
import { AlignmentBadge } from "@/components/social/AlignmentBadge";
import { BadgeDisplay } from "@/components/social/BadgeDisplay";
import { MilestoneTimeline } from "@/components/social/MilestoneTimeline";
import { WidgetGrid } from "@/components/social/WidgetGrid";
import { VibeCheck } from "@/components/social/VibeCheck";
import { Guestbook } from "@/components/social/Guestbook";
import { ConnectedBadges } from "@/components/social/ConnectedBadges";
import { AskThisPair } from "@/components/social/AskThisPair";
import { ForkConfigButton } from "@/components/social/ForkConfigButton";
import { AlignmentCircle } from "@/components/social/AlignmentCircle";
import { MutualSignalBadges } from "@/components/social/MutualSignalBadges";
import { TopicConstellation } from "@/components/social/TopicConstellation";
import type { PublicSpace } from "@/types/social";

// ── Theme pack font class helper ──
function fontClass(fontMood?: string): string {
  switch (fontMood) {
    case "mono": return "font-mono";
    case "serif": return "font-serif";
    default: return "";
  }
}

// ── Card style helper ──
function cardClasses(cardStyle?: string, accentColor?: string): string {
  switch (cardStyle) {
    case "glass":
      return "rounded-xl border border-white/10 bg-white/5 backdrop-blur-md";
    case "solid":
      return "rounded-xl border border-zinc-700 bg-zinc-800";
    case "none":
      return "";
    case "outlined":
    default:
      return "rounded-xl border border-zinc-800 bg-zinc-900/50";
  }
}

export default function PublicSpacePage() {
  const params = useParams();
  const pairId = typeof params.pairId === "string" ? params.pairId : "";
  const { pair: viewerPair } = usePair();
  const [space, setSpace] = useState<PublicSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soundtrackMuted, setSoundtrackMuted] = useState(true);

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

  const {
    pair, theme, fingerprint, recentActivity, alignmentWithViewer,
    badges, milestones, widgetData, vibeChecks, guestbook,
    questions, mutualSignals, alignmentCircle, topicConstellation,
  } = space;

  // ── Theme pack derived styles ──
  const bgStyle = theme.backgroundStyle === "gradient" && theme.gradientFrom && theme.gradientTo
    ? { background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})` }
    : {};
  const font = fontClass(theme.fontMood);
  const card = cardClasses(theme.cardStyle, theme.accentColor);
  const glowStyle = theme.glowEnabled
    ? { boxShadow: `0 0 60px ${theme.accentColor}15, 0 0 120px ${theme.accentColor}08` }
    : {};

  // ── Soundtrack embed ──
  const hasSoundtrack = !!theme.profileSoundtrackUrl?.trim();
  const isSpotify = hasSoundtrack && theme.profileSoundtrackUrl!.includes("spotify.com");

  // Convert spotify track URL to embed URL
  function getSpotifyEmbedUrl(url: string): string {
    // https://open.spotify.com/track/xxx -> https://open.spotify.com/embed/track/xxx
    try {
      const u = new URL(url);
      if (u.hostname === "open.spotify.com" && !u.pathname.startsWith("/embed")) {
        return `https://open.spotify.com/embed${u.pathname}?utm_source=generator&theme=0`;
      }
      return url;
    } catch {
      return url;
    }
  }

  return (
    <main className={`mx-auto max-w-4xl px-6 py-8 ${font}`}>
      {/* Header / Banner */}
      <div
        className="rounded-2xl p-8 mb-6 border border-zinc-800/50 relative overflow-hidden"
        style={{ ...bgStyle, ...glowStyle }}
      >
        {/* Accent glow */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-15"
          style={{ background: theme.accentColor }}
        />
        {theme.glowEnabled && (
          <div
            className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-[80px] opacity-10"
            style={{ background: theme.accentColor }}
          />
        )}

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
                <div className="text-sm text-zinc-400 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {pair.followerCount} followers
                  </span>
                  <span className="text-zinc-600">&middot;</span>
                  <span className="inline-flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" />
                    {pair.followingCount} following
                  </span>
                  <span className="text-zinc-600">&middot;</span>
                  <span>
                    Joined {new Date(pair.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>

                {/* Connected platform badges */}
                <ConnectedBadges pairId={pairId} />
              </div>
            </div>

            {/* Tagline */}
            {theme.tagline && (
              <div className="text-base text-zinc-300 italic mt-3 max-w-lg leading-relaxed">
                &ldquo;{theme.tagline}&rdquo;
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Soundtrack toggle */}
            {hasSoundtrack && (
              <button
                onClick={() => setSoundtrackMuted(prev => !prev)}
                className="p-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white transition"
                title={soundtrackMuted ? "Unmute soundtrack" : "Mute soundtrack"}
              >
                {soundtrackMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            {viewerPair?.id && viewerPair.id !== pairId && (
              <>
                <FollowButton
                  followerId={viewerPair.id}
                  followingId={pairId}
                  initialFollowing={pair.isFollowedByViewer}
                />
                <ForkConfigButton
                  sourcePairId={pairId}
                  sourcePairName={`${pair.humanName} × ${pair.agentName}`}
                  viewerPairId={viewerPair.id}
                  accentColor={theme.accentColor}
                />
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        {badges && (badges.badges.length > 0 || badges.currentStreak > 0) && (
          <div className="mt-4">
            <BadgeDisplay badges={badges} compact />
          </div>
        )}

        {/* Mutual Signal Badges (viewer-only) */}
        {mutualSignals && mutualSignals.totalShared > 0 && (
          <div className="mt-4">
            <MutualSignalBadges data={mutualSignals} accentColor={theme.accentColor} />
          </div>
        )}

        {/* Vibe Check */}
        <div className="mt-4">
          <VibeCheck
            targetPairId={pairId}
            viewerPairId={viewerPair?.id}
            initialData={vibeChecks}
            accentColor={theme.accentColor}
          />
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

        {/* Spotify Embed (if soundtrack is set and unmuted) */}
        {isSpotify && !soundtrackMuted && (
          <div className="mt-4">
            <iframe
              src={getSpotifyEmbedUrl(theme.profileSoundtrackUrl!)}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
            />
          </div>
        )}

        {/* Alignment with viewer */}
        {alignmentWithViewer && (
          <div className="mt-4 pt-4 border-t border-zinc-800/30">
            <AlignmentBadge score={alignmentWithViewer.score} reason="Your alignment" />
          </div>
        )}
      </div>

      {/* Widget Grid */}
      {theme.widgets && theme.widgets.length > 0 && widgetData && (
        <WidgetGrid
          widgets={theme.widgets}
          data={widgetData}
          accentColor={theme.accentColor}
          cardStyle={theme.cardStyle}
          pairId={pairId}
        />
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Left: Fingerprint + Context + Milestones */}
        <div className="space-y-5">
          {fingerprint && <FingerprintCard fingerprint={fingerprint} />}

          {/* Milestones Timeline */}
          {milestones && milestones.length > 0 && (
            <MilestoneTimeline milestones={milestones} />
          )}

          {/* Context Sources */}
          {space.contextSources && space.contextSources.length > 0 && (
            <div className={`${card} p-5`}>
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
            <div className={`${card} p-5`}>
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

          {/* Topic Constellation */}
          {topicConstellation && topicConstellation.length > 0 && (
            <div className={`${card} p-5`}>
              <TopicConstellation
                nodes={topicConstellation}
                accentColor={theme.accentColor}
              />
            </div>
          )}

          {/* Alignment Circle */}
          {alignmentCircle && alignmentCircle.length > 0 && (
            <div className={`${card} p-5 flex justify-center`}>
              <AlignmentCircle
                nodes={alignmentCircle}
                centerLabel={`${pair.humanName} × ${pair.agentName}`}
                accentColor={theme.accentColor}
              />
            </div>
          )}
        </div>

        {/* Right: Activity stream */}
        <div className={`${card} p-5`}>
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

      {/* Ask This Pair */}
      <div className="mt-5">
        <AskThisPair
          targetPairId={pairId}
          viewerPairId={viewerPair?.id}
          viewerName={viewerPair?.humanName}
          isOwner={viewerPair?.id === pairId}
          cardStyle={theme.cardStyle}
        />
      </div>

      {/* Guestbook */}
      <div className="mt-5">
        <Guestbook
          targetPairId={pairId}
          viewerPairId={viewerPair?.id}
          viewerName={viewerPair?.humanName}
          isOwner={viewerPair?.id === pairId}
          cardStyle={theme.cardStyle}
        />
      </div>
    </main>
  );
}
