"use client";

import { useState, useEffect, useCallback } from "react";
import { Music, ExternalLink, Pause, Disc3, Clock } from "lucide-react";
import type { SpotifyWidgetData } from "@/types/integration";

interface Props {
  pairId: string;
  accentColor: string;
}

function formatMs(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SpotifyNowPlayingWidget({ pairId, accentColor }: Props) {
  const [data, setData] = useState<SpotifyWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/integrations/data?pairId=${encodeURIComponent(pairId)}&providerId=spotify`
      );
      const json = await res.json();
      if (json.success && json.data?.widgetData) {
        setData(json.data.widgetData as SpotifyWidgetData);
        setError("");
      } else {
        setError(json.error ?? "Not connected");
      }
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds for now playing updates
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return <div className="text-xs text-zinc-600 animate-pulse">Loading Spotify...</div>;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-600">
        <Music className="w-4 h-4 mr-2 text-zinc-700" />
        {error || "Not connected"}
      </div>
    );
  }

  const np = data.nowPlaying;
  const hasTrack = np?.isPlaying && np?.track;

  return (
    <div className="space-y-3">
      {/* Now Playing */}
      {hasTrack && np?.track ? (
        <div className="flex gap-3">
          {/* Album art */}
          {np.track.albumArtUrl ? (
            <a
              href={np.track.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 group relative"
            >
              <img
                src={np.track.albumArtUrl}
                alt={np.track.album}
                className="w-14 h-14 rounded-lg shadow-lg group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 opacity-0 group-hover:opacity-100 transition">
                <ExternalLink className="w-4 h-4 text-white" />
              </div>
            </a>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Disc3 className="w-6 h-6 text-[#1DB954] animate-spin" style={{ animationDuration: "3s" }} />
            </div>
          )}

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse shadow-[0_0_6px_rgba(30,215,96,0.5)]" />
              <span className="text-[10px] font-semibold text-[#1DB954] uppercase">Now Playing</span>
            </div>
            <a
              href={np.track.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-semibold text-zinc-200 truncate hover:text-white transition"
            >
              {np.track.name}
            </a>
            <p className="text-xs text-zinc-500 truncate">
              {np.track.artists.join(", ")}
            </p>
            <p className="text-[10px] text-zinc-600 truncate">{np.track.album}</p>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] text-zinc-600 min-w-[24px]">
                {formatMs(np.track.progressMs)}
              </span>
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (np.track.progressMs / np.track.durationMs) * 100)}%`,
                    backgroundColor: "#1DB954",
                  }}
                />
              </div>
              <span className="text-[9px] text-zinc-600 min-w-[24px] text-right">
                {formatMs(np.track.durationMs)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Pause className="w-4 h-4" />
          <span>Not playing right now</span>
        </div>
      )}

      {/* Recently played */}
      {data.recentlyPlayed.length > 0 && !hasTrack && (
        <div className="space-y-1">
          <div className="text-[10px] text-zinc-600 uppercase font-semibold flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            Recently Played
          </div>
          {data.recentlyPlayed.slice(0, 3).map((track, i) => (
            <div key={`${track.id}_${i}`} className="flex items-center gap-2 py-1">
              {track.albumArtUrl ? (
                <img src={track.albumArtUrl} alt="" className="w-7 h-7 rounded" />
              ) : (
                <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center">
                  <Music className="w-3 h-3 text-zinc-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 truncate">{track.name}</p>
                <p className="text-[10px] text-zinc-600 truncate">{track.artists.join(", ")}</p>
              </div>
              <span className="text-[10px] text-zinc-700 flex-shrink-0">{timeAgo(track.playedAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top Artists preview */}
      {data.topArtists.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/50">
          <div className="text-[10px] text-zinc-600 uppercase font-semibold mb-1.5">
            Top Artists
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {data.topArtists.slice(0, 5).map(artist => (
              <a
                key={artist.id}
                href={artist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 group flex-shrink-0"
              >
                {artist.imageUrl ? (
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="w-9 h-9 rounded-full object-cover group-hover:ring-2 ring-[#1DB954]/50 transition"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Music className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                )}
                <span className="text-[9px] text-zinc-500 text-center max-w-[44px] truncate group-hover:text-zinc-300 transition">
                  {artist.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Spotify attribution */}
      <div className="flex items-center justify-between pt-1">
        <a
          href={data.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-[#1DB954] transition"
        >
          <Music className="w-2.5 h-2.5" />
          {data.displayName} on Spotify
        </a>
      </div>
    </div>
  );
}
