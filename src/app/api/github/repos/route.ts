/**
 * GET /api/github/repos?pairId=xxx
 *
 * Returns the authenticated user's GitHub repos (for dropdown).
 * Uses onboarding cookie if no pairId; otherwise uses stored GitHub integration for pair.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchUserRepos } from "@/lib/integrations/providers/github";
import { getIntegration } from "@/lib/integrations/store";

const ONBOARD_COOKIE = "github_onboard";
const ONBOARD_KV_PREFIX = "github_onboard_";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pairId = url.searchParams.get("pairId")?.trim();

  let accessToken: string | null = null;

  if (pairId) {
    const conn = await getIntegration(pairId, "github");
    accessToken = conn?.connectionData?.accessToken ?? null;
  }

  if (!accessToken) {
    const key = req.cookies.get(ONBOARD_COOKIE)?.value;
    if (key) {
      const { kv } = await import("@/lib/db");
      const stored = await kv.get<{ accessToken?: string }>(
        `${ONBOARD_KV_PREFIX}${key}`
      );
      accessToken = stored?.accessToken ?? null;
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { success: false, repos: [], connected: false },
      { status: 200 }
    );
  }

  try {
    const repos = await fetchUserRepos(accessToken);
    return NextResponse.json({
      success: true,
      connected: true,
      repos: repos.map((r) => ({
        full_name: r.full_name,
        html_url: r.html_url,
        private: r.private,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch repos";
    return NextResponse.json(
      { success: false, repos: [], connected: true, error: msg },
      { status: 200 }
    );
  }
}
