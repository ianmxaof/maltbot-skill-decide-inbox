/**
 * POST /api/integrations/github/migrate-onboard
 *
 * After creating the pair at end of onboarding, move the temporary
 * GitHub token (from cookie + KV) into the pair's integration.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectIntegration } from "@/lib/integrations/store";
import { kv } from "@/lib/db";

const ONBOARD_COOKIE = "github_onboard";
const ONBOARD_KV_PREFIX = "github_onboard_";

export async function POST(req: NextRequest) {
  let body: { pairId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const pairId = body.pairId?.trim();
  if (!pairId) {
    return NextResponse.json(
      { success: false, error: "pairId required" },
      { status: 400 }
    );
  }

  const key = req.cookies.get(ONBOARD_COOKIE)?.value;
  if (!key) {
    return NextResponse.json(
      { success: true, migrated: false, message: "No onboarding GitHub session" }
    );
  }

  const stored = await kv.get<{
    accessToken?: string;
    githubLogin?: string;
    displayName?: string;
  }>(`${ONBOARD_KV_PREFIX}${key}`);

  if (!stored?.accessToken) {
    return NextResponse.json(
      { success: true, migrated: false, message: "No token to migrate" }
    );
  }

  await connectIntegration(pairId, "github", stored.displayName ?? "GitHub", {
    accessToken: stored.accessToken,
    githubLogin: stored.githubLogin ?? "",
  });

  await kv.del(`${ONBOARD_KV_PREFIX}${key}`);

  const res = NextResponse.json({
    success: true,
    migrated: true,
  });
  res.cookies.set(ONBOARD_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
  return res;
}
