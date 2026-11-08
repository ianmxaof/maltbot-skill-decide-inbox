/**
 * GET /api/integrations/github/connect?returnTo=/onboard/2&pairId=xxx
 *
 * Initiates GitHub OAuth. Optional pairId for settings; returnTo for onboarding.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildGitHubAuthUrl, isGitHubConfigured } from "@/lib/integrations/providers/github";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  if (!isGitHubConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "GitHub integration not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env.local",
      },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo")?.trim() || "/onboard/2";
  const pairId = url.searchParams.get("pairId")?.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/github/callback`;

  const statePayload: { returnTo: string; pairId?: string; key?: string } = { returnTo };
  if (pairId) {
    statePayload.pairId = pairId;
  } else {
    // Onboarding: store token under a one-time key; we'll set cookie in callback
    statePayload.key = randomBytes(16).toString("hex");
  }

  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  const authUrl = buildGitHubAuthUrl(redirectUri, state);
  const res = NextResponse.redirect(authUrl);

  return res;
}
