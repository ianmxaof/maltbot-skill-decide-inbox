// POST /api/workers/first-brief
// After first-scan, uses LLM to summarize top items into a research brief.
// Adds the brief as a decide-queue item for dashboard first load.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { kv } from "@/lib/db";
import { getPairById } from "@/lib/agent-pair-store";
import { getProject } from "@/lib/project-store";
import { validateWorkerAuth } from "@/lib/worker-auth";
import { getEnvKeyRaw } from "@/lib/openclaw-config";

const FirstBriefSchema = z.object({
  pairId: z.string().trim().min(1, "pairId is required"),
  apiKeyProvider: z.string().optional(),
  modelId: z.string().optional(),
  projectId: z.string().optional(),
});

interface DecideQueueItem {
  id: string;
  ingestItemId: string;
  workerId: string;
  pairId: string;
  title: string;
  summary: string;
  detail?: string;
  sourceUrl?: string;
  sourceName: string;
  urgency: string;
  confidence: number;
  signalKeys: string[];
  tags: string[];
  status: string;
  ingestedAt: string;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getApiKey(provider: string): Promise<string | null> {
  const fromEnv = await getEnvKeyRaw(provider);
  if (fromEnv) return fromEnv;
  const fromProcess = process.env[provider];
  return fromProcess?.trim() || null;
}

const MODEL_MAP: Record<string, string> = {
  "anthropic/claude-opus-4-5": "claude-opus-4-5-20250514",
  "anthropic/claude-sonnet-4": "claude-sonnet-4-20250514",
  "anthropic/claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
  "anthropic/claude-3-haiku": "claude-3-haiku-20240307",
  "openai/gpt-5.2": "gpt-4o",
  "openai/gpt-4o": "gpt-4o",
  "openai/gpt-4o-mini": "gpt-4o-mini",
  "openai/gpt-4-turbo": "gpt-4-turbo",
};

async function callAnthropic(
  model: string,
  apiKey: string,
  prompt: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text?.trim() ?? "";
}

async function callOpenAI(
  model: string,
  apiKey: string,
  prompt: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
    }),
  });
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const auth = validateWorkerAuth(req);
  if (!auth.ok) return auth.response!;

  try {
    const body = await req.json();
    const parsed = parseBody(FirstBriefSchema, body);
    if (!parsed.ok) return parsed.response;
    const { pairId, apiKeyProvider, modelId, projectId } = parsed.data;

    const pair = await getPairById(pairId);
    if (!pair) {
      return NextResponse.json({ error: "Pair not found" }, { status: 404 });
    }

    const queue = (await kv.get<DecideQueueItem[]>("worker-decide-queue")) ?? [];
    const pairItems = queue.filter((q) => q.pairId === pairId).slice(0, 5);

    if (pairItems.length === 0) {
      return NextResponse.json({ success: true, briefCreated: false, reason: "No items to summarize" });
    }

    const modelKey = modelId ?? "anthropic/claude-3.5-sonnet";
    const provider =
      apiKeyProvider ??
      (modelKey.startsWith("openai/") ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY");
    const apiKey = await getApiKey(provider);
    if (!apiKey) {
      return NextResponse.json({ success: true, briefCreated: false, reason: "No API key configured" });
    }

    const apiModel = MODEL_MAP[modelKey] ?? "claude-3-5-sonnet-20241022";

    const itemsText = pairItems
      .map((i, idx) => `${idx + 1}. ${i.title}\n   ${(i.summary || "").slice(0, 200)}`)
      .join("\n\n");

    let projectContext = "";
    if (projectId) {
      const project = await getProject(projectId);
      if (project?.linkedRepos?.length) {
        const repo = project.linkedRepos[0];
        const match = repo.url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
        if (match) {
          const [, owner, repoName] = match;
          try {
            const readmeRes = await fetch(
              `https://api.github.com/repos/${owner}/${repoName}/readme`,
              {
                headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "ContextHub-FirstBrief/1.0" },
                signal: AbortSignal.timeout(5000),
              }
            );
            if (readmeRes.ok) {
              const readmeData = (await readmeRes.json()) as { content?: string; encoding?: string };
              if (readmeData.content && readmeData.encoding === "base64") {
                const content = Buffer.from(readmeData.content, "base64").toString("utf8").slice(0, 2000);
                projectContext = `\n\nProject README (${repo.name}):\n${content}\n`;
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    const prompt = `You are a research assistant. Summarize these ${pairItems.length} items from the user's monitored sources into a short, actionable one-paragraph "research brief" (2-4 sentences). Focus on what might matter most to the user${projectContext ? ", especially in the context of their linked project" : ""}. Be concise.\n\nItems:\n${itemsText}${projectContext}\n\nResearch brief:`;

    let brief = "";
    if (provider === "OPENAI_API_KEY") {
      brief = await callOpenAI(apiModel, apiKey, prompt);
    } else {
      brief = await callAnthropic(apiModel, apiKey, prompt);
    }

    if (!brief) {
      return NextResponse.json({ success: true, briefCreated: false, reason: "LLM returned empty" });
    }

    const briefItem: DecideQueueItem = {
      id: genId("dq"),
      ingestItemId: genId("fb"),
      workerId: "first-brief",
      pairId,
      title: "Research brief",
      summary: brief,
      detail: brief,
      sourceName: "first-brief",
      urgency: "medium",
      confidence: 0.9,
      signalKeys: ["first-brief", "onboarding"],
      tags: ["onboarding", "first-brief", "research-brief"],
      status: "pending",
      ingestedAt: new Date().toISOString(),
    };

    const updated = [...queue, briefItem].slice(-200);
    await kv.set("worker-decide-queue", updated);

    return NextResponse.json({
      success: true,
      briefCreated: true,
      briefLength: brief.length,
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { error: "First brief failed", detail: err.message },
      { status: 500 }
    );
  }
}
