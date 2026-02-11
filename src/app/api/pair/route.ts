/**
 * GET /api/pair — List pairs (or get active pair info).
 * POST /api/pair — Create a new pair.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listPairs,
  getPair,
  getActivePairId,
  createPair,
  setActivePairId,
} from "@/lib/agent-pair-store";
import type { CreatePairInput } from "@/lib/agent-pair-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const active = searchParams.get("active");

    if (id) {
      const { getPairById } = await import("@/lib/agent-pair-store");
      const pair = await getPairById(id);
      if (!pair) {
        return NextResponse.json({ success: false, error: "Pair not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, pair });
    }

    if (active === "true" || active === "1") {
      const pair = await getPair();
      const activeId = await getActivePairId();
      return NextResponse.json({ success: true, pair, activePairId: activeId });
    }

    const pairs = await listPairs();
    return NextResponse.json({ success: true, pairs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get pairs";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const input: CreatePairInput = {
      humanName: String(body.humanName ?? "").trim(),
      agentName: String(body.agentName ?? "Agent").trim(),
      agentPowerCoreId: typeof body.agentPowerCoreId === "string" ? body.agentPowerCoreId : undefined,
      operatingPhilosophy: (body.operatingPhilosophy as CreatePairInput["operatingPhilosophy"]) ?? "review-before-deploy",
      autonomyTiers: (body.autonomyTiers as CreatePairInput["autonomyTiers"]) ?? {
        tier1: ["file organization", "research & drafts", "memory maintenance"],
        tier2: ["code changes", "documentation updates"],
        tier3: ["public posts", "financial decisions", "external communications"],
      },
      activityPattern: body.activityPattern as CreatePairInput["activityPattern"],
      humanPreferences: body.humanPreferences as CreatePairInput["humanPreferences"],
      visibility: (body.visibility as CreatePairInput["visibility"]) ?? "private",
      contextSources: (body.contextSources as CreatePairInput["contextSources"]) ?? {
        githubRepos: [],
        githubUsers: [],
        rssUrls: [],
        moltbookTopics: [],
      },
      soulMd: typeof body.soulMd === "string" ? body.soulMd : undefined,
      publicNarrative: typeof body.publicNarrative === "string" ? body.publicNarrative : undefined,
    };

    if (!input.humanName) {
      return NextResponse.json({ success: false, error: "humanName is required" }, { status: 400 });
    }

    const pair = await createPair(input);
    await setActivePairId(pair.id);
    return NextResponse.json({ success: true, pair });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create pair";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
