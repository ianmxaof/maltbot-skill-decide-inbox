/**
 * GET /api/integrations/github/callback
 *
 * Handles GitHub OAuth callback. Stores token for pair or for onboarding (cookie + KV).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGitHubCode,
  fetchGitHubUser,
  isGitHubConfigured,
} from "@/lib/integrations/providers/github";
import { connectIntegration } from "@/lib/integrations/store";
import { kv } from "@/lib/db";

const ONBOARD_COOKIE = "github_onboard";
const ONBOARD_MAX_AGE = 600;
const ONBOARD_KV_PREFIX = "github_onboard_";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!isGitHubConfigured()) {
    return NextResponse.redirect(`${appUrl}/onboard/2?github_error=not_configured`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/onboard/2?github_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/onboard/2?github_error=missing_params`);
  }

  let payload: { returnTo?: string; pairId?: string; key?: string };
  try {
    payload = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(`${appUrl}/onboard/2?github_error=invalid_state`);
  }

  const returnTo = payload.returnTo || "/onboard/2";
  const redirectUri = `${appUrl}/api/integrations/github/callback`;

  try {
    const { accessToken } = await exchangeGitHubCode(code, redirectUri);
    const user = await fetchGitHubUser(accessToken);
    const displayName = user.name || user.login || "GitHub User";

    if (payload.pairId) {
      await connectIntegration(payload.pairId, "github", displayName, {
        accessToken,
        githubLogin: user.login,
      });
      return NextResponse.redirect(
        `${appUrl}/settings?github_connected=true`
      );
    }

    // Onboarding: store token in KV, set cookie with key
    const key = payload.key;
    if (!key) {
      return NextResponse.redirect(`${appUrl}/onboard/2?github_error=invalid_state`);
    }
    await kv.set(`${ONBOARD_KV_PREFIX}${key}`, {
      accessToken,
      githubLogin: user.login,
      displayName,
    });
    const res = NextResponse.redirect(`${appUrl}${returnTo}`);
    res.cookies.set(ONBOARD_COOKIE, key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ONBOARD_MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${appUrl}/onboard/2?github_error=${encodeURIComponent(msg)}`
    );
  }
}
