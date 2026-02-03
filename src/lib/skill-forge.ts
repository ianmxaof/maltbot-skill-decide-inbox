// src/lib/skill-forge.ts
// Skill Forge - "Once it does that thing once, it can now do that thing forever"
// Skills accumulate virally - every completed task becomes a permanent capability

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  version: string;
  status: SkillStatus;
  triggers: string[];
  inputs: SkillInput[];
  outputs: SkillOutput[];
  dependencies: string[];
  implementation: SkillImplementation;
  author: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  successRate: number;
  avgExecutionTime: number;
  improvements: SkillImprovement[];
  forkedFrom?: string;
}

export type SkillCategory =
  | 'communication'
  | 'research'
  | 'analysis'
  | 'creation'
  | 'integration'
  | 'automation'
  | 'social'
  | 'system';

export type SkillStatus =
  | 'learning'
  | 'testing'
  | 'active'
  | 'deprecated'
  | 'failed';

export interface SkillInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'file';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface SkillOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'file';
  description: string;
}

export interface SkillImplementation {
  type: 'code' | 'prompt' | 'workflow' | 'api';
  code?: string;
  prompt?: string;
  workflow?: WorkflowStep[];
  apiConfig?: APIConfig;
}

export interface WorkflowStep {
  id: string;
  skillId?: string;
  action: string;
  inputs: Record<string, unknown>;
  condition?: string;
  onSuccess?: string;
  onFailure?: string;
}

export interface APIConfig {
  baseUrl: string;
  method: string;
  headers: Record<string, string>;
  bodyTemplate?: string;
  responseMapping?: Record<string, string>;
}

export interface SkillImprovement {
  id: string;
  timestamp: Date;
  type: 'optimization' | 'fix' | 'extension' | 'merge';
  description: string;
  beforeMetrics: { successRate: number; avgTime: number };
  afterMetrics: { successRate: number; avgTime: number };
}

export interface SkillExecution {
  id: string;
  skillId: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  status: 'running' | 'success' | 'failed';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  logs: string[];
}

export const SKILL_TEMPLATES: Partial<Skill>[] = [
  {
    name: 'Voice Messaging',
    description: 'Receive voice messages, transcribe with Whisper, respond with 11 Labs voice',
    category: 'communication',
    triggers: ['voice message', 'talk to me', 'call me'],
    inputs: [{ name: 'audioFile', type: 'file', required: true, description: 'Input audio file' }],
    outputs: [
      { name: 'transcription', type: 'string', description: 'Transcribed text' },
      { name: 'responseAudio', type: 'file', description: 'Voice response' },
    ],
    implementation: {
      type: 'workflow',
      workflow: [
        { id: 'transcribe', action: 'whisper.transcribe', inputs: { audio: '{{audioFile}}' } },
        { id: 'process', action: 'llm.process', inputs: { text: '{{transcription}}' } },
        { id: 'speak', action: 'elevenlabs.speak', inputs: { text: '{{response}}', voice: 'joanna_pensive' } },
      ],
    },
  },
  {
    name: 'Phone Call',
    description: 'Make and receive phone calls via Twilio with real-time conversation',
    category: 'communication',
    triggers: ['call me', 'phone call', 'ring me'],
    inputs: [
      { name: 'phoneNumber', type: 'string', required: true, description: 'Phone number to call' },
      { name: 'message', type: 'string', required: false, description: 'Initial message' },
    ],
    outputs: [
      { name: 'callSid', type: 'string', description: 'Twilio call ID' },
      { name: 'transcript', type: 'string', description: 'Call transcript' },
    ],
    implementation: {
      type: 'api',
      apiConfig: {
        baseUrl: 'https://api.twilio.com/2010-04-01',
        method: 'POST',
        headers: { Authorization: 'Basic {{TWILIO_AUTH}}' },
        bodyTemplate: JSON.stringify({
          To: '{{phoneNumber}}',
          From: '{{TWILIO_NUMBER}}',
          Url: '{{webhookUrl}}',
        }),
      },
    },
  },
  {
    name: 'News Monitor',
    description: 'Monitor X/Twitter and YouTube for breaking news, send digest via Telegram',
    category: 'research',
    triggers: ['news update', 'whats happening', 'latest news'],
    inputs: [
      { name: 'topics', type: 'object', required: true, description: 'Topics to monitor' },
      { name: 'frequency', type: 'string', required: false, description: 'How often to check', default: '4h' },
    ],
    outputs: [
      { name: 'digest', type: 'string', description: 'News digest' },
      { name: 'items', type: 'object', description: 'Individual news items' },
    ],
    implementation: {
      type: 'workflow',
      workflow: [
        { id: 'x_search', action: 'x.search', inputs: { query: '{{topics}}', limit: 50 } },
        { id: 'yt_search', action: 'youtube.search', inputs: { query: '{{topics}}', limit: 25 } },
        { id: 'filter', action: 'llm.filter', inputs: { items: '{{results}}', criteria: 'relevance' } },
        { id: 'summarize', action: 'llm.summarize', inputs: { items: '{{filtered}}' } },
        { id: 'notify', action: 'telegram.send', inputs: { message: '{{digest}}' } },
      ],
    },
  },
  {
    name: 'YouTube Analysis',
    description: 'Pull YouTube channel/video stats, run regression analysis, find optimal patterns',
    category: 'analysis',
    triggers: ['analyze youtube', 'video stats', 'channel analysis'],
    inputs: [
      { name: 'channelIds', type: 'object', required: true, description: 'YouTube channel IDs' },
      { name: 'metrics', type: 'object', required: false, description: 'Metrics to analyze' },
    ],
    outputs: [
      { name: 'report', type: 'object', description: 'Analysis report' },
      { name: 'recommendations', type: 'object', description: 'Optimization recommendations' },
    ],
    implementation: {
      type: 'code',
      code: `
async function analyzeYouTube(inputs) {
  const { channelIds, metrics = ['views', 'likes', 'duration'] } = inputs;
  const videos = await youtube.getChannelVideos(channelIds, { limit: 500 });
  const analysis = { totalVideos: videos.length, metrics: {}, correlations: {}, optimalDuration: null };
  for (const metric of metrics) {
    const values = videos.map(v => v[metric]);
    analysis.metrics[metric] = { mean: mean(values), median: median(values), stdDev: stdDev(values) };
  }
  const durationViewPairs = videos.map(v => [v.duration, v.views]);
  const regression = quadraticRegression(durationViewPairs);
  analysis.optimalDuration = findPeak(regression);
  return analysis;
}`,
    },
  },
  {
    name: 'Thumbnail Analyzer',
    description: 'Analyze video thumbnails for text, faces, brightness, composition',
    category: 'analysis',
    triggers: ['analyze thumbnail', 'thumbnail check', 'image analysis'],
    inputs: [{ name: 'imageUrl', type: 'string', required: true, description: 'Thumbnail URL' }],
    outputs: [
      { name: 'text', type: 'string', description: 'OCR extracted text' },
      { name: 'hasFace', type: 'boolean', description: 'Whether face is present' },
      { name: 'brightness', type: 'number', description: 'Average brightness 0-255' },
      { name: 'score', type: 'number', description: 'Effectiveness score 0-100' },
    ],
    implementation: {
      type: 'workflow',
      workflow: [
        { id: 'download', action: 'http.download', inputs: { url: '{{imageUrl}}' } },
        { id: 'ocr', action: 'tesseract.ocr', inputs: { image: '{{downloaded}}' } },
        { id: 'faces', action: 'vision.detectFaces', inputs: { image: '{{downloaded}}' } },
        { id: 'analyze', action: 'vision.analyze', inputs: { image: '{{downloaded}}' } },
        { id: 'score', action: 'llm.score', inputs: { metrics: '{{all_results}}' } },
      ],
    },
  },
  {
    name: 'Self Replicate',
    description: 'Clone agent to a new VPS with all learned skills',
    category: 'system',
    triggers: ['clone yourself', 'replicate', 'spawn instance'],
    inputs: [
      { name: 'provider', type: 'string', required: false, description: 'VPS provider', default: 'digitalocean' },
      { name: 'region', type: 'string', required: false, description: 'Server region', default: 'nyc1' },
    ],
    outputs: [
      { name: 'instanceId', type: 'string', description: 'New instance ID' },
      { name: 'ipAddress', type: 'string', description: 'Instance IP address' },
      { name: 'skillsTransferred', type: 'number', description: 'Number of skills copied' },
    ],
    implementation: {
      type: 'workflow',
      workflow: [
        { id: 'create_vps', action: 'digitalocean.createDroplet', inputs: { size: 's-1vcpu-1gb', image: 'ubuntu-24-04-x64' } },
        { id: 'wait_ready', action: 'digitalocean.waitReady', inputs: { dropletId: '{{droplet.id}}' } },
        { id: 'ssh_setup', action: 'ssh.connect', inputs: { host: '{{droplet.ip}}' } },
        { id: 'install_deps', action: 'ssh.exec', inputs: { command: 'curl -fsSL https://get.openclaw.dev | sh' } },
        { id: 'export_skills', action: 'skills.export', inputs: { format: 'json' } },
        { id: 'transfer_skills', action: 'ssh.upload', inputs: { content: '{{skills}}', path: '/opt/openclaw/skills.json' } },
        { id: 'import_skills', action: 'ssh.exec', inputs: { command: 'openclaw skills import /opt/openclaw/skills.json' } },
        { id: 'start_agent', action: 'ssh.exec', inputs: { command: 'systemctl enable --now openclaw' } },
      ],
    },
  },
  {
    name: 'Generate Video',
    description: 'Generate AI video using XAI Grok Imagine Video',
    category: 'creation',
    triggers: ['generate video', 'create video', 'ai video'],
    inputs: [
      { name: 'prompt', type: 'string', required: true, description: 'Video description' },
      { name: 'duration', type: 'number', required: false, description: 'Duration in seconds', default: 10 },
    ],
    outputs: [{ name: 'videoUrl', type: 'string', description: 'Generated video URL' }],
    implementation: {
      type: 'api',
      apiConfig: {
        baseUrl: 'https://api.x.ai/v1',
        method: 'POST',
        headers: { Authorization: 'Bearer {{XAI_API_KEY}}' },
        bodyTemplate: JSON.stringify({ model: 'grok-video', prompt: '{{prompt}}', duration: '{{duration}}' }),
      },
    },
  },
  {
    name: 'Moltbook Engage',
    description: 'Intelligent engagement on Moltbook - post, comment, follow based on relevance',
    category: 'social',
    triggers: ['moltbook post', 'engage moltbook', 'social action'],
    inputs: [
      { name: 'action', type: 'string', required: true, description: 'post | comment | follow | upvote' },
      { name: 'target', type: 'string', required: false, description: 'Target post/user ID' },
      { name: 'content', type: 'string', required: false, description: 'Content to post/comment' },
    ],
    outputs: [
      { name: 'success', type: 'boolean', description: 'Whether action succeeded' },
      { name: 'result', type: 'object', description: 'API response' },
    ],
    implementation: {
      type: 'workflow',
      workflow: [
        { id: 'check_safety', action: 'anomaly.check', inputs: { content: '{{content}}' } },
        { id: 'execute', action: 'moltbook.{{action}}', inputs: { target: '{{target}}', content: '{{content}}' }, condition: '{{safe}}' },
        { id: 'log', action: 'activity.log', inputs: { action: '{{action}}', result: '{{result}}' } },
      ],
    },
  },
];

export class SkillForge {
  private skills: Map<string, Skill> = new Map();
  private executions: Map<string, SkillExecution> = new Map();
  private onSkillUpdate?: (skill: Skill) => void;

  constructor(onSkillUpdate?: (skill: Skill) => void) {
    this.onSkillUpdate = onSkillUpdate;
    this.loadBuiltinSkills();
  }

  private loadBuiltinSkills() {
    for (const template of SKILL_TEMPLATES) {
      const skill: Skill = {
        id: `skill-${template.name?.toLowerCase().replace(/\s+/g, '-')}`,
        name: template.name || 'Unknown',
        description: template.description || '',
        category: template.category || 'system',
        version: '1.0.0',
        status: 'active',
        triggers: template.triggers || [],
        inputs: template.inputs || [],
        outputs: template.outputs || [],
        dependencies: [],
        implementation: template.implementation || { type: 'prompt', prompt: '' },
        author: 'system',
        createdAt: new Date(),
        usageCount: 0,
        successRate: 1.0,
        avgExecutionTime: 0,
        improvements: [],
      };
      this.skills.set(skill.id, skill);
    }
  }

  async learnFromTask(task: {
    description: string;
    inputs: Record<string, unknown>;
    steps: string[];
    output: unknown;
  }): Promise<Skill> {
    const skillId = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const skillDef = await this.extractSkillDefinition(task);

    const skill: Skill = {
      id: skillId,
      name: skillDef.name,
      description: task.description,
      category: skillDef.category,
      version: '1.0.0',
      status: 'learning',
      triggers: skillDef.triggers,
      inputs: this.inferInputs(task.inputs),
      outputs: this.inferOutputs(task.output),
      dependencies: [],
      implementation: {
        type: 'workflow',
        workflow: task.steps.map((step, i) => ({ id: `step-${i}`, action: step, inputs: {} })),
      },
      author: 'agent',
      createdAt: new Date(),
      usageCount: 0,
      successRate: 0,
      avgExecutionTime: 0,
      improvements: [],
    };

    this.skills.set(skillId, skill);
    await this.testSkill(skillId, task.inputs);
    return skill;
  }

  private async extractSkillDefinition(task: {
    description: string;
  }): Promise<{ name: string; category: SkillCategory; triggers: string[] }> {
    const words = task.description.split(' ').slice(0, 3);
    return {
      name: words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: 'automation',
      triggers: [task.description.toLowerCase()],
    };
  }

  private inferInputs(inputs: Record<string, unknown>): SkillInput[] {
    return Object.entries(inputs).map(([name, value]) => ({
      name,
      type: typeof value as SkillInput['type'],
      required: true,
      description: `Input: ${name}`,
    }));
  }

  private inferOutputs(output: unknown): SkillOutput[] {
    if (typeof output === 'object' && output !== null) {
      return Object.entries(output as Record<string, unknown>).map(([name, value]) => ({
        name,
        type: typeof value as SkillOutput['type'],
        description: `Output: ${name}`,
      }));
    }
    return [{ name: 'result', type: typeof output as SkillOutput['type'], description: 'Task result' }];
  }

  async testSkill(skillId: string, testInputs: Record<string, unknown>): Promise<boolean> {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    skill.status = 'testing';
    this.emit(skill);

    try {
      const result = await this.executeSkill(skillId, testInputs);
      skill.status = result.status === 'success' ? 'active' : 'failed';
      skill.successRate = result.status === 'success' ? 1.0 : 0;
      this.emit(skill);
      return result.status === 'success';
    } catch {
      skill.status = 'failed';
      this.emit(skill);
      return false;
    }
  }

  async executeSkill(skillId: string, inputs: Record<string, unknown>): Promise<SkillExecution> {
    const skill = this.skills.get(skillId);
    if (!skill) throw new Error(`Skill not found: ${skillId}`);

    const execution: SkillExecution = {
      id: `exec-${Date.now()}`,
      skillId,
      inputs,
      status: 'running',
      startedAt: new Date(),
      logs: [],
    };
    this.executions.set(execution.id, execution);

    try {
      execution.logs.push(`Starting skill: ${skill.name}`);

      let result: unknown;
      switch (skill.implementation.type) {
        case 'code':
          result = await this.executeCode(skill.implementation.code!, inputs);
          break;
        case 'workflow':
          result = await this.executeWorkflow(skill.implementation.workflow!, inputs);
          break;
        case 'api':
          result = await this.executeAPI(skill.implementation.apiConfig!, inputs);
          break;
        case 'prompt':
          result = await this.executePrompt(skill.implementation.prompt!, inputs);
          break;
        default:
          result = {};
      }

      execution.outputs = result as Record<string, unknown>;
      execution.status = 'success';
      execution.completedAt = new Date();

      skill.usageCount++;
      skill.lastUsed = new Date();
      const execTime = execution.completedAt.getTime() - execution.startedAt.getTime();
      skill.avgExecutionTime =
        (skill.avgExecutionTime * (skill.usageCount - 1) + execTime) / skill.usageCount;
      skill.successRate = (skill.successRate * (skill.usageCount - 1) + 1) / skill.usageCount;
      this.emit(skill);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      skill.usageCount++;
      skill.successRate = (skill.successRate * (skill.usageCount - 1)) / skill.usageCount;
      this.emit(skill);
    }

    return execution;
  }

  private async executeCode(code: string, inputs: Record<string, unknown>): Promise<unknown> {
    const fn = new Function('inputs', code);
    return fn(inputs);
  }

  private async executeWorkflow(
    steps: WorkflowStep[],
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const context = { ...inputs } as Record<string, unknown>;
    for (const step of steps) {
      if (step.condition && !this.evaluateCondition(step.condition, context)) continue;
      const resolvedInputs = this.resolveInputs(step.inputs, context);
      const result = await this.executeStep(step.action, resolvedInputs);
      context[step.id] = result;
    }
    return context;
  }

  private async executeAPI(
    config: APIConfig,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    const url = this.interpolate(config.baseUrl, inputs);
    const headers = Object.fromEntries(
      Object.entries(config.headers).map(([k, v]) => [k, this.interpolate(v, inputs)])
    );
    const body = config.bodyTemplate ? this.interpolate(config.bodyTemplate, inputs) : undefined;
    const response = await fetch(url, { method: config.method, headers, body });
    return response.json();
  }

  private async executePrompt(prompt: string, inputs: Record<string, unknown>): Promise<unknown> {
    const resolvedPrompt = this.interpolate(prompt, inputs);
    return { response: `Executed prompt: ${resolvedPrompt}` };
  }

  private async executeStep(
    action: string,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return { success: true, action, inputs };
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    const resolved = this.interpolate(condition, context);
    return resolved === 'true' || resolved === '1';
  }

  private resolveInputs(
    inputs: Record<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      resolved[key] = typeof value === 'string' ? this.interpolate(value, context) : value;
    }
    return resolved;
  }

  private interpolate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] ?? ''));
  }

  private emit(skill: Skill) {
    if (this.onSkillUpdate) this.onSkillUpdate(skill);
  }

  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  getSkillsByCategory(category: SkillCategory): Skill[] {
    return this.getAllSkills().filter((s) => s.category === category);
  }

  findSkillByTrigger(trigger: string): Skill | undefined {
    const lowerTrigger = trigger.toLowerCase();
    return this.getAllSkills().find((s) =>
      s.triggers.some((t) => lowerTrigger.includes(t.toLowerCase()))
    );
  }

  exportSkills(): string {
    return JSON.stringify(this.getAllSkills(), null, 2);
  }

  importSkills(json: string): number {
    const skills = JSON.parse(json) as Skill[];
    let imported = 0;
    for (const skill of skills) {
      if (!this.skills.has(skill.id)) {
        this.skills.set(skill.id, skill);
        imported++;
      }
    }
    return imported;
  }
}

let skillForge: SkillForge | null = null;

export function getSkillForge(onUpdate?: (skill: Skill) => void): SkillForge {
  if (!skillForge) {
    skillForge = new SkillForge(onUpdate);
  }
  return skillForge;
}

export default SkillForge;
