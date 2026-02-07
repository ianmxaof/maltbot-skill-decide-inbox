/**
 * GET /api/signals/config — read RSS URLs, GitHub users/repos
 * PATCH /api/signals/config — update (body: { rssUrls?, githubUsers?, githubRepos? }; partial merge)
 */

import { NextRequest, NextResponse } from "next/server";
import { readSignalsConfig, writeSignalsConfig } from "@/lib/signals-config";
import { getOperatorId } from "@/lib/operator";

export async function GET() {
  try {
    const config = await readSignalsConfig();
    return NextResponse.json({
      success: true,
      rssUrls: config.rssUrls ?? [],
      githubUsers: config.githubUsers ?? [],
      githubRepos: config.githubRepos ?? [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read config";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function normalizeStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await readSignalsConfig();
    const rssUrls = body.rssUrls !== undefined ? normalizeStrings(body.rssUrls) : (current.rssUrls ?? []);
    const githubUsers = body.githubUsers !== undefined ? normalizeStrings(body.githubUsers) : (current.githubUsers ?? []);
    const githubRepos = body.githubRepos !== undefined ? normalizeStrings(body.githubRepos) : (current.githubRepos ?? []);
    const operatorId = current.operatorId ?? getOperatorId();
    await writeSignalsConfig({ rssUrls, githubUsers, githubRepos, operatorId });
    return NextResponse.json({
      success: true,
      rssUrls,
      githubUsers,
      githubRepos,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to write config";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
