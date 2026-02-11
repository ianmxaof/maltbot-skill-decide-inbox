// Minimal Ollama client for the worker daemon.

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
  stream?: boolean;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  eval_count?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string = "http://localhost:11434",
    model: string = "qwen2.5:7b"
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
  }

  async generate(
    prompt: string,
    options?: { system?: string; temperature?: number; maxTokens?: number }
  ): Promise<{ text: string; tokenCount: number }> {
    const body: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      system: options?.system,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.3,
        num_predict: options?.maxTokens ?? 2048,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    return {
      text: data.response,
      tokenCount: data.eval_count ?? 0,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      const data = (await res.json()) as { models: { name: string }[] };
      return data.models.map((m) => m.name);
    } catch {
      return [];
    }
  }

  async hasModel(model?: string): Promise<boolean> {
    const models = await this.listModels();
    const target = model ?? this.model;
    return models.some((m) => m.startsWith(target.split(":")[0]));
  }
}
