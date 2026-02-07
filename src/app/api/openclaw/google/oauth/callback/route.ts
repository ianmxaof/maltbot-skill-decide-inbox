/**
 * GET /api/openclaw/google/oauth/callback?code= — exchange code for tokens, store in vault, redirect to /settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/security/credential-vault";
import type { CredentialPermission } from "@/lib/security/credential-vault";
import { exchangeGoogleCode } from "@/lib/openclaw-google";

const GOOGLE_TOKEN_PERMISSIONS: CredentialPermission[] = [
  "google:calendar",
  "google:drive",
  "google:gmail",
  "google:docs",
  "google:sheets",
  "google:slides",
];

function getRedirectUri(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;
  return `${base}/api/openclaw/google/oauth/callback`;
}

function getSettingsUrl(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/settings`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const settingsUrl = getSettingsUrl(req);

  if (!code) {
    return NextResponse.redirect(
      `${settingsUrl}?google=error&message=${encodeURIComponent("Missing code")}`
    );
  }

  try {
    const vault = getVault();
    const credentials = vault.list();
    const clientCred = credentials.find((c) => c.service === "google_oauth_client");
    if (!clientCred) {
      return NextResponse.redirect(
        `${settingsUrl}?google=error&message=${encodeURIComponent("Google OAuth client not configured")}`
      );
    }

    const redirectUri = getRedirectUri(req);
    const clientConfig = await vault.executeWithCredential(
      clientCred.id,
      "google:oauth",
      async (value) => JSON.parse(value) as { client_id: string; client_secret: string }
    );

    const tokens = await exchangeGoogleCode(
      clientConfig.client_id,
      clientConfig.client_secret,
      redirectUri,
      code
    );

    const tokenValue = JSON.stringify({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    });

    vault.store(
      "google",
      "Google Account",
      tokenValue,
      GOOGLE_TOKEN_PERMISSIONS
    );

    return NextResponse.redirect(`${settingsUrl}?google=connected`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OAuth failed";
    return NextResponse.redirect(
      `${settingsUrl}?google=error&message=${encodeURIComponent(msg)}`
    );
  }
}
