/**
 * GET /api/auth/debug-providers
 *
 * Returns whether GitHub (and Google) sign-in are configured.
 * No secrets are exposed. Use to verify .env.local is read correctly.
 */

import { NextResponse } from "next/server";
import { getEnvFromFile } from "@/lib/load-env";

export async function GET() {
  const env = getEnvFromFile();
  const baseUrl = (env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const githubId = env.AUTH_GITHUB_ID ?? env.GITHUB_ID ?? "";
  const githubSecret = env.AUTH_GITHUB_SECRET ?? env.GITHUB_SECRET ?? "";
  const googleId = env.AUTH_GOOGLE_ID ?? "";
  const googleSecret = env.AUTH_GOOGLE_SECRET ?? "";

  return NextResponse.json({
    nextAuthUrl: baseUrl || "(not set)",
    githubCallbackUrl: baseUrl ? `${baseUrl}/api/auth/callback/github` : "(set NEXTAUTH_URL first)",
    githubConfigured: Boolean(githubId && githubSecret),
    githubIdPresent: Boolean(githubId),
    githubSecretPresent: Boolean(githubSecret),
    googleConfigured: Boolean(googleId && googleSecret),
  });
}
