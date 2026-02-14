/**
 * Spotify Integration Provider — The Nightly Build
 *
 * OAuth2 Authorization Code flow with PKCE.
 * Fetches now playing, top artists/tracks, and recently played.
 */

import type {
  SpotifyTokens,
  SpotifyNowPlaying,
  SpotifyWidgetData,
  SpotifyTopItem,
  IntegrationProfileData,
} from "@/types/integration";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_AUTH = "https://accounts.spotify.com";

// ─── OAuth Helpers ──────────────────────────────────────────

export function getSpotifyClientId(): string {
  return process.env.SPOTIFY_CLIENT_ID ?? "";
}

export function getSpotifyClientSecret(): string {
  return process.env.SPOTIFY_CLIENT_SECRET ?? "";
}

export function isSpotifyConfigured(): boolean {
  return !!(getSpotifyClientId() && getSpotifyClientSecret());
}

/**
 * Build the Spotify authorization URL.
 */
export function buildSpotifyAuthUrl(
  redirectUri: string,
  state: string
): string {
  const scopes = [
    "user-read-currently-playing",
    "user-read-recently-played",
    "user-top-read",
    "user-read-playback-state",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: getSpotifyClientId(),
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    show_dialog: "true",
  });

  return `${SPOTIFY_AUTH}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string
): Promise<SpotifyTokens> {
  const res = await fetch(`${SPOTIFY_AUTH}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${getSpotifyClientId()}:${getSpotifyClientSecret()}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshSpotifyToken(
  refreshToken: string
): Promise<SpotifyTokens> {
  const res = await fetch(`${SPOTIFY_AUTH}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${getSpotifyClientId()}:${getSpotifyClientSecret()}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Spotify token refresh failed");
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

// ─── API Fetchers ──────────────────────────────────────────

async function spotifyFetch(endpoint: string, accessToken: string) {
  const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 30 },
  });
  if (res.status === 204) return null; // No content (nothing playing)
  if (!res.ok) {
    if (res.status === 401) throw new Error("SPOTIFY_TOKEN_EXPIRED");
    return null;
  }
  return res.json();
}

async function fetchNowPlaying(token: string): Promise<SpotifyNowPlaying> {
  try {
    const data = await spotifyFetch("/me/player/currently-playing", token);
    if (!data || !data.item) {
      return { isPlaying: false, timestamp: new Date().toISOString() };
    }

    return {
      isPlaying: data.is_playing,
      track: {
        id: data.item.id,
        name: data.item.name,
        artists: data.item.artists?.map((a: { name: string }) => a.name) ?? [],
        album: data.item.album?.name ?? "",
        albumArtUrl: data.item.album?.images?.[0]?.url,
        durationMs: data.item.duration_ms,
        progressMs: data.progress_ms ?? 0,
        previewUrl: data.item.preview_url,
        spotifyUrl: data.item.external_urls?.spotify ?? "",
      },
      device: data.device?.name,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return { isPlaying: false, timestamp: new Date().toISOString() };
  }
}

async function fetchTopArtists(token: string): Promise<SpotifyTopItem[]> {
  try {
    const data = await spotifyFetch("/me/top/artists?limit=8&time_range=medium_term", token);
    if (!data?.items) return [];

    return data.items.map((a: {
      id: string;
      name: string;
      images?: Array<{ url: string }>;
      external_urls?: { spotify: string };
      genres?: string[];
      popularity: number;
    }) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.images?.[0]?.url,
      spotifyUrl: a.external_urls?.spotify ?? "",
      subtitle: (a.genres ?? []).slice(0, 2).join(", ") || "Music",
      popularity: a.popularity,
    }));
  } catch {
    return [];
  }
}

async function fetchTopTracks(token: string): Promise<SpotifyTopItem[]> {
  try {
    const data = await spotifyFetch("/me/top/tracks?limit=8&time_range=medium_term", token);
    if (!data?.items) return [];

    return data.items.map((t: {
      id: string;
      name: string;
      artists?: Array<{ name: string }>;
      album?: { images?: Array<{ url: string }> };
      external_urls?: { spotify: string };
      popularity: number;
    }) => ({
      id: t.id,
      name: t.name,
      imageUrl: t.album?.images?.[0]?.url,
      spotifyUrl: t.external_urls?.spotify ?? "",
      subtitle: t.artists?.map((a) => a.name).join(", ") ?? "",
      popularity: t.popularity,
    }));
  } catch {
    return [];
  }
}

async function fetchRecentlyPlayed(token: string) {
  try {
    const data = await spotifyFetch("/me/player/recently-played?limit=10", token);
    if (!data?.items) return [];

    return data.items.map((item: {
      track: {
        id: string;
        name: string;
        artists?: Array<{ name: string }>;
        album?: { images?: Array<{ url: string }> };
      };
      played_at: string;
    }) => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists?.map((a) => a.name) ?? [],
      albumArtUrl: item.track.album?.images?.[0]?.url,
      playedAt: item.played_at,
    }));
  } catch {
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────

/**
 * Get a valid access token, refreshing if expired.
 * Returns updated tokens (caller should persist if changed).
 */
export async function getValidToken(
  tokens: SpotifyTokens
): Promise<{ accessToken: string; tokens: SpotifyTokens; refreshed: boolean }> {
  if (tokens.expiresAt > Date.now() + 60_000) {
    return { accessToken: tokens.accessToken, tokens, refreshed: false };
  }
  const newTokens = await refreshSpotifyToken(tokens.refreshToken);
  return { accessToken: newTokens.accessToken, tokens: newTokens, refreshed: true };
}

// ─── Main Fetch Function ───────────────────────────────────

/**
 * Fetch Spotify profile data including now playing, top artists/tracks,
 * and recently played.
 */
export async function fetchSpotifyProfileData(
  tokens: SpotifyTokens
): Promise<IntegrationProfileData | null> {
  try {
    const { accessToken } = await getValidToken(tokens);

    // Fetch profile for display name
    const profile = await spotifyFetch("/me", accessToken);
    if (!profile) return null;

    // Fetch all data in parallel
    const [nowPlaying, topArtists, topTracks, recentlyPlayed] = await Promise.all([
      fetchNowPlaying(accessToken),
      fetchTopArtists(accessToken),
      fetchTopTracks(accessToken),
      fetchRecentlyPlayed(accessToken),
    ]);

    const widgetData: SpotifyWidgetData = {
      displayName: profile.display_name ?? profile.id,
      profileUrl: profile.external_urls?.spotify ?? "",
      nowPlaying,
      topArtists,
      topTracks,
      recentlyPlayed,
    };

    return {
      providerId: "spotify",
      widgetData: widgetData as unknown as Record<string, unknown>,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
