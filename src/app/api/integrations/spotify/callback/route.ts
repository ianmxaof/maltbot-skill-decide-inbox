/**
 * GET /api/integrations/spotify/callback
 *
 * Handles the Spotify OAuth2 callback.
 * Exchanges the authorization code for tokens and stores the connection.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeSpotifyCode } from "@/lib/integrations/providers/spotify";
import { connectIntegration } from "@/lib/integrations/store";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Must match redirect_uri used in connect (Spotify requires 127.0.0.1, not localhost)
  const spotifyBase = appUrl.replace(/localhost/i, "127.0.0.1");

  // Handle user denial
  if (error) {
    return NextResponse.redirect(`${appUrl}/settings?spotify_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?spotify_error=missing_params`);
  }

  // Decode state
  let pairId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    pairId = decoded.pairId;
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?spotify_error=invalid_state`);
  }

  try {
    const redirectUri = `${spotifyBase}/api/integrations/spotify/callback`;
    const tokens = await exchangeSpotifyCode(code, redirectUri);

    // Fetch the user's Spotify profile for display name
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : null;
    const displayName = profile?.display_name ?? profile?.id ?? "Spotify User";

    // Store the connection with tokens in connectionData
    await connectIntegration(pairId, "spotify", displayName, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: String(tokens.expiresAt),
      scope: tokens.scope,
      spotifyId: profile?.id ?? "",
    });

    return NextResponse.redirect(`${appUrl}/settings?spotify_connected=true`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${appUrl}/settings?spotify_error=${encodeURIComponent(msg)}`
    );
  }
}
