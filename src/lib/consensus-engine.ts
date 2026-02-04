// src/lib/consensus-engine.ts
// Multi-Model Consensus Engine - "Society of Minds"
// Have Claude, GPT, Gemini, and Grok collaborate on problems

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  model: string;
  apiKey?: string;
  enabled: boolean;
  strengths: string[];
}

export interface ConsensusRequest {
  task: string;
  context?: string;
  requireUnanimity?: boolean;
  maxRounds?: number;
  timeout?: number;
}

export interface ModelResponse {
  modelId: string;
  modelName: string;
  response: string;
  confidence: number;
  reasoning: string;
  timestamp: Date;
  latencyMs: number;
}

export interface ConsensusResult {
  task: string;
  rounds: ConsensusRound[];
  finalConsensus: string | null;
  consensusReached: boolean;
  dissent: ModelResponse[];
  recommendations: string[];
  totalTimeMs: number;
}

export interface ConsensusRound {
  roundNumber: number;
  responses: ModelResponse[];
  synthesis: string;
  agreement: number; // 0-1
}

// Default model configurations
export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'claude',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    model: 'claude-opus-4-5-20250514',
    enabled: true,
    strengths: ['reasoning', 'nuance', 'safety', 'long-form'],
  },
  {
    id: 'gpt',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    enabled: true,
    strengths: ['coding', 'broad knowledge', 'creativity'],
  },
  {
    id: 'gemini',
    name: 'Gemini 2.0',
    provider: 'google',
    model: 'gemini-2.0-flash',
    enabled: true,
    strengths: ['multimodal', 'google integration', 'speed'],
  },
  {
    id: 'grok',
    name: 'Grok 3',
    provider: 'xai',
    model: 'grok-3',
    enabled: false, // Enable when API key available
    strengths: ['real-time data', 'X integration', 'unfiltered'],
  },
];

export class ConsensusEngine {
  private enabledModels: ModelConfig[];
  private onUpdate?: (update: ConsensusUpdate) => void;

  constructor(
    models: ModelConfig[] = DEFAULT_MODELS,
    onUpdate?: (update: ConsensusUpdate) => void
  ) {
    this.onUpdate = onUpdate;
    this.enabledModels = models.filter((model) => {
      const key = this.getEnvApiKey(model.provider);
      if (!key) {
        console.warn(
          `[ConsensusEngine] ${model.name} disabled: missing ${model.provider.toUpperCase()}_API_KEY`
        );
        return false;
      }
      return model.enabled !== false;
    });
    if (this.enabledModels.length === 0) {
      console.error('[ConsensusEngine] No models available! Check API keys.');
    }
  }

  async runConsensus(request: ConsensusRequest): Promise<ConsensusResult> {
    const startTime = Date.now();
    const rounds: ConsensusRound[] = [];
    const maxRounds = request.maxRounds || 3;

    let currentTask = request.task;
    let consensusReached = false;

    for (let round = 1; round <= maxRounds && !consensusReached; round++) {
      this.emit({ type: 'round_start', round, task: currentTask });

      const responses = await this.queryAllModels(currentTask, request.context, rounds);
      const agreement = this.calculateAgreement(responses);
      const synthesis = await this.synthesizeResponses(responses, currentTask);

      const roundResult: ConsensusRound = {
        roundNumber: round,
        responses,
        synthesis,
        agreement,
      };
      rounds.push(roundResult);

      this.emit({ type: 'round_complete', round, agreement, synthesis });

      if (agreement >= 0.8 || (request.requireUnanimity && agreement === 1)) {
        consensusReached = true;
      } else if (round < maxRounds) {
        currentTask = this.prepareNextRound(request.task, synthesis, responses);
      }
    }

    const finalRound = rounds[rounds.length - 1];
    const dissent = finalRound.responses.filter((r) => r.confidence < 0.7);

    return {
      task: request.task,
      rounds,
      finalConsensus: consensusReached ? finalRound.synthesis : null,
      consensusReached,
      dissent,
      recommendations: this.extractRecommendations(rounds),
      totalTimeMs: Date.now() - startTime,
    };
  }

  private async queryAllModels(
    task: string,
    context: string | undefined,
    previousRounds: ConsensusRound[]
  ): Promise<ModelResponse[]> {
    const previousContext =
      previousRounds.length > 0
        ? `\n\nPrevious discussion:\n${previousRounds.map((r) => r.synthesis).join('\n\n')}`
        : '';

    const prompt = `${context || ''}\n\nTask: ${task}${previousContext}

Please provide:
1. Your response to the task
2. Your confidence level (0-100)
3. Brief reasoning for your approach

Format your response as:
RESPONSE: [your response]
CONFIDENCE: [0-100]
REASONING: [your reasoning]`;

    const promises = this.enabledModels.map(async (model) => {
      const startTime = Date.now();
      try {
        const response = await this.queryModel(model, prompt);
        return {
          modelId: model.id,
          modelName: model.name,
          ...this.parseResponse(response),
          timestamp: new Date(),
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          modelId: model.id,
          modelName: model.name,
          response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
          reasoning: 'Model query failed',
          timestamp: new Date(),
          latencyMs: Date.now() - startTime,
        };
      }
    });

    return Promise.all(promises);
  }

  private async queryModel(model: ModelConfig, prompt: string): Promise<string> {
    const apiKey = model.apiKey || this.getEnvApiKey(model.provider);

    switch (model.provider) {
      case 'anthropic':
        return this.queryAnthropic(model.model, prompt, apiKey);
      case 'openai':
        return this.queryOpenAI(model.model, prompt, apiKey);
      case 'google':
        return this.queryGoogle(model.model, prompt, apiKey);
      case 'xai':
        return this.queryXAI(model.model, prompt, apiKey);
      default:
        throw new Error(`Unknown provider: ${model.provider}`);
    }
  }

  private async queryAnthropic(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async queryOpenAI(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async queryGoogle(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async queryXAI(model: string, prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private parseResponse(raw: string): { response: string; confidence: number; reasoning: string } {
    const responseMatch = raw.match(/RESPONSE:\s*([\s\S]*?)(?=CONFIDENCE:|$)/i);
    const confidenceMatch = raw.match(/CONFIDENCE:\s*(\d+)/i);
    const reasoningMatch = raw.match(/REASONING:\s*([\s\S]*?)$/i);

    return {
      response: responseMatch?.[1]?.trim() || raw,
      confidence: Math.min(100, Math.max(0, parseInt(confidenceMatch?.[1] || '50'))) / 100,
      reasoning: reasoningMatch?.[1]?.trim() || 'No explicit reasoning provided',
    };
  }

  private calculateAgreement(responses: ModelResponse[]): number {
    if (responses.length < 2) return 1;

    const validResponses = responses.filter((r) => r.confidence > 0.3);
    if (validResponses.length < 2) return 0.5;

    const avgConfidence =
      validResponses.reduce((sum, r) => sum + r.confidence, 0) / validResponses.length;

    const keywords = validResponses.map((r) =>
      new Set(r.response.toLowerCase().split(/\s+/).filter((w) => w.length > 4))
    );

    let totalOverlap = 0;
    let comparisons = 0;
    for (let i = 0; i < keywords.length; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        const intersection = new Set(Array.from(keywords[i]).filter((x) => keywords[j].has(x)));
        const union = new Set([...Array.from(keywords[i]), ...Array.from(keywords[j])]);
        totalOverlap += intersection.size / union.size;
        comparisons++;
      }
    }

    const semanticAgreement = comparisons > 0 ? totalOverlap / comparisons : 0.5;
    return (avgConfidence + semanticAgreement) / 2;
  }

  private async synthesizeResponses(
    responses: ModelResponse[],
    task: string
  ): Promise<string> {
    const responseSummary = responses
      .map((r) => `${r.modelName} (confidence: ${Math.round(r.confidence * 100)}%):\n${r.response}`)
      .join('\n\n---\n\n');

    const synthesisPrompt = `You are synthesizing responses from multiple AI models on this task:

${task}

Here are their responses:

${responseSummary}

Please synthesize these into a unified response that:
1. Captures the best insights from each model
2. Notes any significant disagreements
3. Provides a coherent final answer

Keep it concise but comprehensive.`;

    const synthesizer = this.enabledModels[0];
    if (!synthesizer) return 'No models available to synthesize.';
    return this.queryModel(synthesizer, synthesisPrompt);
  }

  private prepareNextRound(
    originalTask: string,
    synthesis: string,
    responses: ModelResponse[]
  ): string {
    const lowConfidence = responses.filter((r) => r.confidence < 0.6);
    const concerns = lowConfidence.map((r) => r.reasoning).join('; ');

    return `Original task: ${originalTask}

Previous synthesis: ${synthesis}

${concerns ? `Some models expressed concerns: ${concerns}` : ''}

Please reconsider your response, taking into account the synthesis and any concerns. 
If you agree with the synthesis, explain why.
If you disagree, explain your specific objections.`;
  }

  private extractRecommendations(rounds: ConsensusRound[]): string[] {
    const recommendations: string[] = [];
    const finalSynthesis = rounds[rounds.length - 1]?.synthesis || '';
    const actionMatches = finalSynthesis.match(/(?:should|recommend|suggest|consider)[^.]+\./gi);
    if (actionMatches) {
      recommendations.push(...actionMatches.map((m) => m.trim()));
    }
    return recommendations.slice(0, 5);
  }

  private getEnvApiKey(provider: string): string {
    const envKeys: Record<string, string> = {
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
      xai: process.env.XAI_API_KEY || '',
    };
    return envKeys[provider] || '';
  }

  private emit(update: ConsensusUpdate) {
    if (this.onUpdate) {
      this.onUpdate(update);
    }
  }
}

export interface ConsensusUpdate {
  type: 'round_start' | 'round_complete' | 'model_response';
  round?: number;
  task?: string;
  agreement?: number;
  synthesis?: string;
  modelId?: string;
  response?: string;
}

export default ConsensusEngine;
