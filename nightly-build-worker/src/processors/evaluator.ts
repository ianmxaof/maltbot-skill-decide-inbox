// Uses the local Ollama model to evaluate discovered items.
// Scores relevance, extracts signal keys, suggests actions.

import { OllamaClient } from "../lib/ollama.js";

export interface RawItem {
  title: string;
  content: string;
  link: string;
  source: string;
  contentHash: string;
  pubDate: string;
}

export interface EvaluatedItem extends RawItem {
  score: number;
  reason: string;
  suggestedAction: "approve" | "escalate" | "investigate" | "ignore";
  tags: string[];
  signalKeys: string[];
  itemType: string;
  urgency: "low" | "medium" | "high" | "critical";
  summary: string;
}

interface EvalConfig {
  systemPrompt: string;
  evaluationPrompt: string;
  keywords: string[];
  excludeKeywords: string[];
  minRelevance: number;
  temperature: number;
  maxTokens: number;
}

export async function evaluateItems(
  ollama: OllamaClient,
  items: RawItem[],
  config: EvalConfig
): Promise<EvaluatedItem[]> {
  if (items.length === 0) return [];

  const results: EvaluatedItem[] = [];

  for (const item of items) {
    try {
      const evaluated = await evaluateSingle(ollama, item, config);
      if (evaluated) results.push(evaluated);
    } catch (e) {
      console.warn(
        `[evaluator] Failed to evaluate "${item.title}": ${(e as Error).message}`
      );
      const fallback = keywordFallback(item, config);
      if (fallback) results.push(fallback);
    }
  }

  return results;
}

async function evaluateSingle(
  ollama: OllamaClient,
  item: RawItem,
  config: EvalConfig
): Promise<EvaluatedItem | null> {
  const prompt = `${config.evaluationPrompt}

Context keywords the operator cares about: ${config.keywords.join(", ")}

Item to evaluate:
Title: ${item.title}
Source: ${item.source}
Content: ${item.content.slice(0, 800)}

Respond with ONLY valid JSON, no markdown fences, no explanation:
{ "score": 0.X, "reason": "brief reason", "suggestedAction": "approve|escalate|investigate|ignore", "tags": ["tag1", "tag2"], "signalKeys": ["repo:owner/name", "topic:keyword"], "itemType": "opportunity|threat|trend|discussion|release|bug|content_idea|competitor|collaboration", "urgency": "low|medium|high|critical", "summary": "one sentence summary" }`;

  const { text } = await ollama.generate(prompt, {
    system: config.systemPrompt,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });

  const parsed = parseModelJson(text);
  if (!parsed) {
    console.warn(`[evaluator] Failed to parse model output for "${item.title}"`);
    return keywordFallback(item, config);
  }

  const score = clamp(parsed.score ?? 0, 0, 1);
  const keywordBoost = calculateKeywordBoost(item, config.keywords);
  const finalScore = clamp(score + keywordBoost, 0, 1);

  if (matchesExcludeKeywords(item, config.excludeKeywords)) {
    return null;
  }

  if (finalScore < config.minRelevance) return null;

  return {
    ...item,
    score: Math.round(finalScore * 100) / 100,
    reason: parsed.reason ?? "Model evaluation",
    suggestedAction: parsed.suggestedAction ?? "investigate",
    tags: parsed.tags ?? [],
    signalKeys: parsed.signalKeys ?? extractSignalKeys(item),
    itemType: parsed.itemType ?? "trend",
    urgency: parsed.urgency ?? scoreToUrgency(finalScore),
    summary: parsed.summary ?? item.title,
  };
}

function keywordFallback(
  item: RawItem,
  config: EvalConfig
): EvaluatedItem | null {
  const text = `${item.title} ${item.content}`.toLowerCase();
  const matchedKeywords = config.keywords.filter((k) =>
    text.includes(k.toLowerCase())
  );

  if (matchedKeywords.length === 0) return null;
  if (matchesExcludeKeywords(item, config.excludeKeywords)) return null;

  const score = Math.min(0.3 + matchedKeywords.length * 0.15, 0.9);
  if (score < config.minRelevance) return null;

  return {
    ...item,
    score,
    reason: `Matched keywords: ${matchedKeywords.join(", ")}`,
    suggestedAction: "investigate",
    tags: matchedKeywords,
    signalKeys: extractSignalKeys(item),
    itemType: "trend",
    urgency: scoreToUrgency(score),
    summary: item.title,
  };
}

function parseModelJson(text: string): Record<string, unknown> | null {
  try {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function calculateKeywordBoost(item: RawItem, keywords: string[]): number {
  const text = `${item.title} ${item.content}`.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) matches++;
  }
  return Math.min(matches * 0.05, 0.2);
}

function matchesExcludeKeywords(
  item: RawItem,
  excludeKeywords: string[]
): boolean {
  if (!excludeKeywords.length) return false;
  const text = `${item.title} ${item.content}`.toLowerCase();
  return excludeKeywords.some((kw) => text.includes(kw.toLowerCase()));
}

function scoreToUrgency(
  score: number
): "low" | "medium" | "high" | "critical" {
  if (score >= 0.9) return "critical";
  if (score >= 0.7) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function extractSignalKeys(item: RawItem): string[] {
  const keys: string[] = [];
  const text = `${item.title} ${item.content}`;

  const repoMatch = text.match(/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g);
  if (repoMatch) {
    for (const r of repoMatch.slice(0, 3)) {
      keys.push(`repo:${r.toLowerCase()}`);
    }
  }

  const cveMatch = text.match(/CVE-\d{4}-\d+/gi);
  if (cveMatch) {
    for (const c of cveMatch) {
      keys.push(`cve:${c.toUpperCase()}`);
    }
  }

  return [...new Set(keys)];
}
