/**
 * GET /api/integrations/spotify/connect?pairId=xxx
 *
 * Initiates the Spotify OAuth2 flow.
 * Redirects the user to Spotify's authorization page.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildSpotifyAuthUrl, isSpotifyConfigured } from "@/lib/integrations/providers/spotify";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pairId = url.searchParams.get("pairId")?.trim();

  if (!pairId) {
    return NextResponse.json({ success: false, error: "pairId required" }, { status: 400 });
  }

  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      { success: false, error: "Spotify integration not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env.local" },
      { status: 503 }
    );
  }

  // Spotify does not allow "localhost" as redirect URI; use 127.0.0.1 for local dev.
  // https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const spotifyBase = appUrl.replace(/localhost/i, "127.0.0.1");
  const redirectUri = `${spotifyBase}/api/integrations/spotify/callback`;

  // Encode pairId in state for the callback
  const state = Buffer.from(JSON.stringify({ pairId })).toString("base64url");

  const authUrl = buildSpotifyAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
