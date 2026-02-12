// src/lib/worker-store.ts
// Persistence for worker registrations, configs, heartbeats, and ingest dedup.

import { kv } from "@/lib/db";
import type {
  WorkerRegistration,
  WorkerConfig,
  WorkerHeartbeat,
  WorkerStatus,
  WatcherConfig,
  IngestItem,
} from "@/types/worker";
import {
  ASPECT_SYSTEM_PROMPTS,
  ASPECT_EVALUATION_PROMPTS,
  DEFAULT_PROCESSING_CONFIG,
  DEFAULT_HEARTBEAT_INTERVAL,
} from "@/types/worker";

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const key = filename.replace(/\.json$/, "");
  return await kv.get<T>(key) ?? fallback;
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const key = filename.replace(/\.json$/, "");
  await kv.set(key, data);
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Worker Registrations ───────────────────────────────────

const WORKERS_FILE = "workers.json";

export async function getAllWorkers(): Promise<WorkerRegistration[]> {
  return readJson<WorkerRegistration[]>(WORKERS_FILE, []);
}

export async function getWorkerById(
  workerId: string
): Promise<WorkerRegistration | null> {
  const workers = await getAllWorkers();
  return workers.find((w) => w.id === workerId) ?? null;
}

export async function getWorkersForPair(
  pairId: string
): Promise<WorkerRegistration[]> {
  const workers = await getAllWorkers();
  return workers.filter((w) => w.pairId === pairId);
}

export async function registerWorker(
  registration: Omit<
    WorkerRegistration,
    | "id"
    | "registeredAt"
    | "lastHeartbeatAt"
    | "status"
    | "totalItemsIngested"
    | "totalDecisionsSurfaced"
    | "uptimeSeconds"
    | "tokensProcessed"
    | "configVersion"
  >
): Promise<WorkerRegistration> {
  const workers = await getAllWorkers();

  const existing = workers.find(
    (w) =>
      w.hostname === registration.hostname &&
      w.aspect === registration.aspect &&
      w.pairId === registration.pairId
  );

  const now = new Date().toISOString();

  if (existing) {
    existing.name = registration.name;
    existing.ollamaModel = registration.ollamaModel;
    existing.ollamaUrl = registration.ollamaUrl;
    existing.capabilities = registration.capabilities;
    existing.version = registration.version;
    existing.platform = registration.platform;
    existing.lastHeartbeatAt = now;
    existing.status = "online";
    await writeJson(WORKERS_FILE, workers);
    return existing;
  }

  const worker: WorkerRegistration = {
    ...registration,
    id: genId("wkr"),
    registeredAt: now,
    lastHeartbeatAt: now,
    status: "online",
    configVersion: 1,
    totalItemsIngested: 0,
    totalDecisionsSurfaced: 0,
    uptimeSeconds: 0,
    tokensProcessed: 0,
  };

  workers.push(worker);
  await writeJson(WORKERS_FILE, workers);
  return worker;
}

export async function updateWorkerStatus(
  workerId: string,
  status: WorkerStatus,
  stats?: Partial<
    Pick<
      WorkerRegistration,
      | "totalItemsIngested"
      | "totalDecisionsSurfaced"
      | "uptimeSeconds"
      | "tokensProcessed"
      | "lastActivityAt"
    >
  >
): Promise<void> {
  const workers = await getAllWorkers();
  const worker = workers.find((w) => w.id === workerId);
  if (!worker) return;

  worker.status = status;
  worker.lastHeartbeatAt = new Date().toISOString();
  if (stats) Object.assign(worker, stats);

  await writeJson(WORKERS_FILE, workers);
}

export async function removeWorker(workerId: string): Promise<boolean> {
  const workers = await getAllWorkers();
  const filtered = workers.filter((w) => w.id !== workerId);
  if (filtered.length === workers.length) return false;
  await writeJson(WORKERS_FILE, filtered);
  return true;
}

// ─── Worker Configs ─────────────────────────────────────────

const CONFIGS_FILE = "worker-configs.json";

export async function getWorkerConfig(
  workerId: string
): Promise<WorkerConfig | null> {
  const configs = await readJson<Record<string, WorkerConfig>>(CONFIGS_FILE, {});
  return configs[workerId] ?? null;
}

export async function setWorkerConfig(
  workerId: string,
  config: WorkerConfig
): Promise<void> {
  const configs = await readJson<Record<string, WorkerConfig>>(CONFIGS_FILE, {});
  configs[workerId] = config;
  await writeJson(CONFIGS_FILE, configs);
}

export async function generateDefaultConfig(
  worker: WorkerRegistration
): Promise<WorkerConfig> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const config: WorkerConfig = {
    workerId: worker.id,
    pairId: worker.pairId,
    configVersion: 1,
    watchers: [],
    processing: { ...DEFAULT_PROCESSING_CONFIG },
    platform: {
      baseUrl,
      ingestEndpoint: "/api/workers/ingest",
      heartbeatEndpoint: "/api/workers/heartbeat",
      configEndpoint: "/api/workers/config",
      registerEndpoint: "/api/workers/register",
    },
    heartbeatIntervalMs: DEFAULT_HEARTBEAT_INTERVAL,
    systemPrompt: ASPECT_SYSTEM_PROMPTS[worker.aspect],
    evaluationPrompt: ASPECT_EVALUATION_PROMPTS[worker.aspect],
  };

  await setWorkerConfig(worker.id, config);
  return config;
}

export async function addWatcherToConfig(
  workerId: string,
  watcher: WatcherConfig
): Promise<WorkerConfig | null> {
  const config = await getWorkerConfig(workerId);
  if (!config) return null;

  config.watchers.push(watcher);
  config.configVersion++;
  await setWorkerConfig(workerId, config);

  const workers = await getAllWorkers();
  const worker = workers.find((w) => w.id === workerId);
  if (worker) {
    worker.configVersion = config.configVersion;
    await writeJson(WORKERS_FILE, workers);
  }

  return config;
}

export async function removeWatcherFromConfig(
  workerId: string,
  watcherId: string
): Promise<WorkerConfig | null> {
  const config = await getWorkerConfig(workerId);
  if (!config) return null;

  config.watchers = config.watchers.filter((w) => w.id !== watcherId);
  config.configVersion++;
  await setWorkerConfig(workerId, config);
  return config;
}

// ─── Heartbeat History ──────────────────────────────────────

const HEARTBEAT_FILE = "worker-heartbeats.json";

export async function recordHeartbeat(
  heartbeat: WorkerHeartbeat
): Promise<void> {
  const history = await readJson<WorkerHeartbeat[]>(HEARTBEAT_FILE, []);
  history.push(heartbeat);

  const trimmed = history.slice(-1000);
  await writeJson(HEARTBEAT_FILE, trimmed);
}

export async function getHeartbeatHistory(
  workerId: string,
  limit: number = 60
): Promise<WorkerHeartbeat[]> {
  const history = await readJson<WorkerHeartbeat[]>(HEARTBEAT_FILE, []);
  return history
    .filter((h) => h.workerId === workerId)
    .slice(-limit);
}

// ─── Ingest Deduplication ───────────────────────────────────

const DEDUP_FILE = "worker-dedup.json";
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function isDuplicate(contentHash: string): Promise<boolean> {
  const dedup = await readJson<Record<string, string>>(DEDUP_FILE, {});
  const existing = dedup[contentHash];
  if (!existing) return false;

  const age = Date.now() - new Date(existing).getTime();
  return age < DEDUP_WINDOW_MS;
}

export async function markIngested(contentHash: string): Promise<void> {
  const dedup = await readJson<Record<string, string>>(DEDUP_FILE, {});
  dedup[contentHash] = new Date().toISOString();

  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const pruned: Record<string, string> = {};
  for (const [hash, ts] of Object.entries(dedup)) {
    if (ts > cutoff) pruned[hash] = ts;
  }

  await writeJson(DEDUP_FILE, pruned);
}

// ─── Status Reconciliation ──────────────────────────────────────

export async function reconcileWorkerStatuses(): Promise<void> {
  const workers = await getAllWorkers();
  const now = Date.now();
  let changed = false;

  for (const worker of workers) {
    const lastBeat = new Date(worker.lastHeartbeatAt).getTime();
    const elapsed = now - lastBeat;

    if (worker.status === "offline" || worker.status === "error") continue;

    if (elapsed > 5 * 60 * 1000) {
      worker.status = "offline";
      changed = true;
    } else if (elapsed > 2 * 60 * 1000 && worker.status === "online") {
      worker.status = "idle";
      changed = true;
    }
  }

  if (changed) await writeJson(WORKERS_FILE, workers);
}
