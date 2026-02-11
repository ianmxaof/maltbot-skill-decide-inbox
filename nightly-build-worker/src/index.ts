#!/usr/bin/env node
// The Nightly Build Worker Daemon
//
// Runs on any machine with Node.js + Ollama.
// Monitors sources → Evaluates with local LLM → Pushes to Nightly Build platform.
//
// Usage:
//   cp worker.env.example .env
//   # Edit .env with your config (PLATFORM_URL, PAIR_ID, etc.)
//   npm install
//   npm run dev          # development with auto-reload
//   npm run build && npm start   # production

import { OllamaClient } from "./lib/ollama.js";
import { PlatformClient } from "./lib/platform.js";
import {
  checkMultipleFeeds,
  type RssItem,
} from "./watchers/rss.js";
import {
  checkRepos,
  type GithubItem,
} from "./watchers/github.js";
import {
  evaluateItems,
  type RawItem,
  type EvaluatedItem,
} from "./processors/evaluator.js";
import { hostname } from "os";

function env(key: string, fallback: string = ""): string {
  return process.env[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : fallback;
}

function envList(key: string): string[] {
  return (process.env[key] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadEnv() {
  try {
    const { readFileSync } = await import("fs");
    const content = readFileSync(".env", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // No .env file, that's fine
  }
}

interface WorkerState {
  workerId: string | null;
  configVersion: number;
  startedAt: number;
  itemsProcessed: number;
  itemsSurfaced: number;
  ollamaCallCount: number;
  tokensUsed: number;
  errors: {
    timestamp: string;
    source: string;
    message: string;
    recoverable: boolean;
  }[];
  currentTask: string | null;
  running: boolean;
}

const state: WorkerState = {
  workerId: null,
  configVersion: 0,
  startedAt: Date.now(),
  itemsProcessed: 0,
  itemsSurfaced: 0,
  ollamaCallCount: 0,
  tokensUsed: 0,
  errors: [],
  currentTask: null,
  running: false,
};

function log(scope: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${scope}] ${msg}`);
}

function logError(scope: string, msg: string, recoverable: boolean = true) {
  const ts = new Date().toISOString().slice(11, 19);
  console.error(`[${ts}] [${scope}] ERROR: ${msg}`);
  state.errors.push({
    timestamp: new Date().toISOString(),
    source: scope,
    message: msg,
    recoverable,
  });
  if (state.errors.length > 50) state.errors = state.errors.slice(-50);
}

async function main() {
  await loadEnv();

  const banner = `
  ╔══════════════════════════════════════════╗
  ║    🌙 The Nightly Build Worker v0.1     ║
  ║    Local Agent Daemon                    ║
  ╚══════════════════════════════════════════╝`;
  console.log(banner);

  const ollamaUrl = env("OLLAMA_URL", "http://localhost:11434");
  const ollamaModel = env("OLLAMA_MODEL", "qwen2.5:7b");
  const ollama = new OllamaClient(ollamaUrl, ollamaModel);
  const platform = new PlatformClient({
    baseUrl: env("PLATFORM_URL", "http://localhost:3000"),
    apiKey: env("PLATFORM_API_KEY") || undefined,
  });

  log("init", `Checking Ollama at ${ollamaUrl}...`);
  const ollamaOk = await ollama.isAvailable();
  if (!ollamaOk) {
    logError(
      "init",
      `Ollama not available at ${ollamaUrl}. Is it running?`,
      false
    );
    log("init", "Install Ollama: https://ollama.ai/download");
    log("init", `Then run: ollama pull ${ollamaModel}`);
    process.exit(1);
  }

  const hasModel = await ollama.hasModel(ollamaModel);
  if (!hasModel) {
    logError("init", `Model ${ollamaModel} not found. Pulling...`, true);
    log("init", `Run: ollama pull ${ollamaModel}`);
  }
  log("init", `✓ Ollama ready (model: ${ollamaModel})`);

  log("init", `Checking platform at ${env("PLATFORM_URL")}...`);
  const platformOk = await platform.isReachable();
  if (!platformOk) {
    log("init", `⚠ Platform not reachable at ${env("PLATFORM_URL")} — will retry`);
    log("init", "Worker will buffer items and retry ingestion.");
  } else {
    log("init", "✓ Platform reachable");
  }

  const aspect = env("WORKER_ASPECT", "golem");
  const workerName = env("WORKER_NAME", `worker-${hostname()}`);
  const pairId = env("PAIR_ID", "pair_001");

  log("init", `Registering as "${workerName}" (${aspect}) for pair ${pairId}...`);

  try {
    const { worker, config } = await platform.register({
      pairId,
      name: workerName,
      aspect,
      hostname: hostname(),
      platform: process.platform,
      ollamaModel,
      ollamaUrl,
      capabilities: detectCapabilities(),
      version: "0.1.0",
    });

    state.workerId = worker.id;
    state.configVersion = config.configVersion;
    log("init", `✓ Registered as ${worker.id}`);
    log(
      "init",
      `  Config version: ${config.configVersion}, Watchers: ${config.watchers?.length ?? 0}`
    );
  } catch (e) {
    logError("init", `Registration failed: ${(e as Error).message}`, true);
    log("init", "Running in offline mode — will buffer items locally");
    state.workerId = `local_${Date.now()}`;
  }

  const rssFeeds = envList("RSS_FEEDS");
  const githubRepos = envList("GITHUB_REPOS");
  const keywords = envList("KEYWORDS");
  const excludeKeywords = envList("EXCLUDE_KEYWORDS");
  const minRelevance = parseFloat(env("MIN_RELEVANCE", "0.5"));
  const heartbeatInterval = envInt("HEARTBEAT_INTERVAL_MS", 60000);
  const rssInterval = envInt("RSS_INTERVAL_MS", 300000);
  const githubInterval = envInt("GITHUB_INTERVAL_MS", 600000);
  const batchSize = envInt("BATCH_SIZE", 5);
  const cooldownMs = envInt("COOLDOWN_MS", 5000);
  const temperature = parseFloat(env("TEMPERATURE", "0.3"));
  const maxTokens = envInt("MAX_TOKENS", 2048);

  log("config", `RSS feeds: ${rssFeeds.length}`);
  log("config", `GitHub repos: ${githubRepos.length}`);
  log("config", `Keywords: ${keywords.join(", ") || "(none)"}`);
  log("config", `Min relevance: ${minRelevance}`);

  if (rssFeeds.length === 0 && githubRepos.length === 0) {
    log(
      "config",
      "⚠ No watchers configured. Set RSS_FEEDS and/or GITHUB_REPOS in .env"
    );
  }

  const aspectPrompts: Record<string, { system: string; eval: string }> = {
    golem: {
      system:
        "You are Golem, a tireless worker agent. Monitor sources, extract noteworthy items, and surface them for human review. Be thorough. Err on the side of surfacing too much.",
      eval: "Evaluate this item for relevance to the operator. Score 0-1. Focus on: actionable, new info, matches interests.",
    },
    prometheus: {
      system:
        "You are Prometheus, a creative and technical agent. Analyze, build, identify patterns. Think about solutions when you find problems.",
      eval: "Evaluate this for creative/technical opportunity. Score 0-1. Focus on: buildable, problem-solving, novel approach.",
    },
    odin: {
      system:
        "You are Odin, a wisdom agent. See patterns across signals. Consider second-order effects. Prioritize signal over noise.",
      eval: "Evaluate this for strategic significance. Score 0-1. Focus on: second-order effects, leading indicators, paradigm shifts.",
    },
    hermes: {
      system:
        "You are Hermes, a communication agent. Craft messages, monitor social signals, bridge contexts. Write clearly.",
      eval: "Evaluate this for communication/social relevance. Score 0-1. Focus on: audience angle, community impact, content-worthy.",
    },
  };

  const prompts = aspectPrompts[aspect] ?? aspectPrompts.golem;

  const evalConfig = {
    systemPrompt: prompts.system,
    evaluationPrompt: prompts.eval,
    keywords,
    excludeKeywords,
    minRelevance,
    temperature,
    maxTokens,
  };

  state.running = true;

  const heartbeatLoop = setInterval(async () => {
    if (!state.running) return;
    try {
      const memUsage = process.memoryUsage();
      const result = await platform.heartbeat({
        workerId: state.workerId!,
        status: state.currentTask ? "working" : "online",
        timestamp: new Date().toISOString(),
        activeWatchers:
          (rssFeeds.length > 0 ? 1 : 0) + (githubRepos.length > 0 ? 1 : 0),
        queueDepth: 0,
        currentTask: state.currentTask ?? undefined,
        itemsProcessed: state.itemsProcessed,
        itemsSurfaced: state.itemsSurfaced,
        ollamaCallCount: state.ollamaCallCount,
        tokensUsed: state.tokensUsed,
        errors: state.errors.slice(-5),
        memoryUsageMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        ollamaAvailable: await ollama.isAvailable(),
        ollamaModel,
        uptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
      });

      if (result.configChanged) {
        log(
          "heartbeat",
          `Config changed (v${result.newConfigVersion}). Re-pulling...`
        );
      }

      state.itemsProcessed = 0;
      state.itemsSurfaced = 0;
      state.ollamaCallCount = 0;
      state.tokensUsed = 0;
      state.errors = [];
    } catch {
      // Heartbeat failures are non-fatal
    }
  }, heartbeatInterval);

  let rssTimer: ReturnType<typeof setInterval> | null = null;
  if (rssFeeds.length > 0) {
    const runRss = async () => {
      if (!state.running) return;
      state.currentTask = `Scanning ${rssFeeds.length} RSS feeds`;
      log("rss", `Checking ${rssFeeds.length} feeds...`);

      try {
        const rawItems = await checkMultipleFeeds(rssFeeds, {
          maxItemsPerFeed: 5,
        });
        log("rss", `Found ${rawItems.length} new items`);

        if (rawItems.length > 0) {
          const toEval: RawItem[] = rawItems.map((r) => ({
            title: r.title,
            content: r.content,
            link: r.link,
            source: r.source,
            contentHash: r.contentHash,
            pubDate: r.pubDate,
          }));

          for (let i = 0; i < toEval.length; i += batchSize) {
            const batch = toEval.slice(i, i + batchSize);
            state.currentTask = `Evaluating RSS batch ${Math.floor(i / batchSize) + 1}`;

            const evaluated = await evaluateItems(ollama, batch, evalConfig);
            state.ollamaCallCount += batch.length;
            state.itemsProcessed += batch.length;

            if (evaluated.length > 0) {
              log(
                "eval",
                `${evaluated.length}/${batch.length} items passed threshold`
              );
              await ingestBatch(platform, evaluated, pairId, "rss_feed");
              state.itemsSurfaced += evaluated.length;
            }

            if (i + batchSize < toEval.length) {
              await sleep(cooldownMs);
            }
          }
        }
      } catch (e) {
        logError("rss", (e as Error).message);
      }

      state.currentTask = null;
    };

    await runRss();
    rssTimer = setInterval(runRss, rssInterval);
    log("rss", `Watching ${rssFeeds.length} feeds every ${rssInterval / 1000}s`);
  }

  let githubTimer: ReturnType<typeof setInterval> | null = null;
  if (githubRepos.length > 0) {
    const githubToken = env("GITHUB_TOKEN") || undefined;

    const runGithub = async () => {
      if (!state.running) return;
      state.currentTask = `Scanning ${githubRepos.length} GitHub repos`;
      log("github", `Checking ${githubRepos.length} repos...`);

      try {
        const rawItems = await checkRepos(githubRepos, {
          token: githubToken,
          includeIssues: true,
        });
        log("github", `Found ${rawItems.length} new items`);

        if (rawItems.length > 0) {
          const toEval: RawItem[] = rawItems.map((r) => ({
            title: r.title,
            content: r.content,
            link: r.link,
            source: r.source,
            contentHash: r.contentHash,
            pubDate: r.pubDate,
          }));

          for (let i = 0; i < toEval.length; i += batchSize) {
            const batch = toEval.slice(i, i + batchSize);
            state.currentTask = `Evaluating GitHub batch ${Math.floor(i / batchSize) + 1}`;

            const evaluated = await evaluateItems(ollama, batch, evalConfig);
            state.ollamaCallCount += batch.length;
            state.itemsProcessed += batch.length;

            if (evaluated.length > 0) {
              log(
                "eval",
                `${evaluated.length}/${batch.length} items passed threshold`
              );
              await ingestBatch(platform, evaluated, pairId, "github_repo");
              state.itemsSurfaced += evaluated.length;
            }

            if (i + batchSize < toEval.length) {
              await sleep(cooldownMs);
            }
          }
        }
      } catch (e) {
        logError("github", (e as Error).message);
      }

      state.currentTask = null;
    };

    setTimeout(async () => {
      await runGithub();
      githubTimer = setInterval(runGithub, githubInterval);
      log(
        "github",
        `Watching ${githubRepos.length} repos every ${githubInterval / 1000}s`
      );
    }, 30000);
  }

  const statusInterval = setInterval(() => {
    const uptime = Math.round((Date.now() - state.startedAt) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    log("status", `⏱ ${h}h${m}m${s}s | ${state.currentTask ?? "idle"}`);
  }, 120000);

  const shutdown = () => {
    log("shutdown", "Shutting down gracefully...");
    state.running = false;
    clearInterval(heartbeatLoop);
    if (rssTimer) clearInterval(rssTimer);
    if (githubTimer) clearInterval(githubTimer);
    clearInterval(statusInterval);

    platform
      .heartbeat({
        workerId: state.workerId!,
        status: "offline",
        timestamp: new Date().toISOString(),
        activeWatchers: 0,
        queueDepth: 0,
        itemsProcessed: 0,
        itemsSurfaced: 0,
        ollamaCallCount: 0,
        tokensUsed: 0,
        errors: [],
        memoryUsageMb: 0,
        ollamaAvailable: false,
        ollamaModel,
        uptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
      })
      .finally(() => {
        log("shutdown", "Goodbye.");
        process.exit(0);
      });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  log("daemon", "🟢 Worker daemon running. Press Ctrl+C to stop.");
}

async function ingestBatch(
  platform: PlatformClient,
  items: EvaluatedItem[],
  pairId: string,
  sourceType: string
): Promise<void> {
  const workerId = state.workerId!;

  const payloads = items.map((item) => ({
    workerId,
    pairId,
    type: item.itemType,
    urgency: item.urgency,
    confidence: item.score,
    title: item.title,
    summary: item.summary,
    detail: item.reason,
    sourceUrl: item.link,
    sourceName: item.source,
    sourceType,
    suggestedAction: item.suggestedAction,
    actionRationale: item.reason,
    signalKeys: item.signalKeys,
    tags: item.tags,
    contentHash: item.contentHash,
    discoveredAt: new Date().toISOString(),
  }));

  try {
    const result = await platform.ingest(payloads);
    log(
      "ingest",
      `Pushed ${result.accepted} items (${result.dropped} dropped)`
    );
  } catch (e) {
    logError(
      "ingest",
      `Failed to push ${items.length} items: ${(e as Error).message}`
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function detectCapabilities(): string[] {
  const caps: string[] = ["summarization", "classification"];
  if (envList("RSS_FEEDS").length > 0) caps.push("web_monitor");
  if (envList("GITHUB_REPOS").length > 0) caps.push("github_monitor");
  if (envList("REDDIT_SUBS").length > 0) caps.push("reddit_monitor");
  return caps;
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
