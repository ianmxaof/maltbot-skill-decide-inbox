// HTTP client for communicating with The Nightly Build platform.
// Handles registration, heartbeats, config pulls, and ingestion.

interface PlatformConfig {
  baseUrl: string;
  apiKey?: string;
}

interface RegisterPayload {
  pairId: string;
  name: string;
  aspect: string;
  hostname: string;
  platform: string;
  ollamaModel: string;
  ollamaUrl: string;
  capabilities: string[];
  version: string;
}

interface HeartbeatPayload {
  workerId: string;
  status: string;
  timestamp: string;
  activeWatchers: number;
  queueDepth: number;
  currentTask?: string;
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
  memoryUsageMb: number;
  ollamaAvailable: boolean;
  ollamaModel: string;
  uptimeSeconds: number;
}

interface IngestPayload {
  workerId: string;
  pairId: string;
  type: string;
  urgency: string;
  confidence: number;
  title: string;
  summary: string;
  detail?: string;
  sourceUrl?: string;
  sourceName: string;
  sourceType: string;
  suggestedAction?: string;
  actionRationale?: string;
  options?: { label: string; description: string; risk: string }[];
  signalKeys: string[];
  tags: string[];
  contentHash: string;
  discoveredAt: string;
}

export class PlatformClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: PlatformConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  async register(
    payload: RegisterPayload
  ): Promise<{
    worker: { id: string };
    config: { configVersion: number; watchers?: unknown[] };
  }> {
    const res = await fetch(`${this.baseUrl}/api/workers/register`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Registration failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  async heartbeat(payload: HeartbeatPayload): Promise<{
    ack: boolean;
    configChanged?: boolean;
    newConfigVersion?: number;
  }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/workers/heartbeat`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.warn(`[platform] Heartbeat failed: ${res.status}`);
        return { ack: false };
      }

      return res.json();
    } catch (e) {
      console.warn(`[platform] Heartbeat error: ${(e as Error).message}`);
      return { ack: false };
    }
  }

  async pullConfig(workerId: string): Promise<unknown> {
    const res = await fetch(
      `${this.baseUrl}/api/workers/config?workerId=${workerId}`,
      { headers: this.headers() }
    );

    if (!res.ok) throw new Error(`Config pull failed: ${res.status}`);
    return res.json();
  }

  async ingest(items: IngestPayload[]): Promise<{
    results: unknown[];
    accepted: number;
    dropped: number;
  }> {
    const res = await fetch(`${this.baseUrl}/api/workers/ingest`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(items),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ingest failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/workers/heartbeat`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
