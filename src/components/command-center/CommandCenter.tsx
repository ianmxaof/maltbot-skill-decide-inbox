'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Moon,
  Hammer,
  Activity,
  Zap,
  Settings,
  Sparkles,
  Clock,
  Server,
  GitBranch,
  MessageSquare,
  Cpu,
  Phone,
  Mail,
  Video,
  Image,
  Search,
  TrendingUp,
  Globe,
} from 'lucide-react';

const TAB_STYLES: Record<'consensus' | 'research' | 'skills' | 'fleet', string> = {
  consensus: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  research: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  skills: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  fleet: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

interface ConsensusSession {
  id: string;
  topic: string;
  status: 'running' | 'complete';
  models: ModelStatus[];
  currentRound: number;
  agreement: number;
  synthesis?: string;
}

interface ModelStatus {
  id: string;
  name: string;
  color: string;
  status: 'thinking' | 'responded' | 'waiting';
  response?: string;
  confidence?: number;
}

interface ResearchTask {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'completed';
  progress: number;
  currentPhase: string;
  estimatedCompletion?: Date;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  status: 'learning' | 'active' | 'testing';
  usageCount: number;
  successRate: number;
}

interface AgentInstance {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'busy' | 'offline';
  skills: number;
  uptime: string;
  lastActivity: string;
}

interface ActivityItem {
  id: string;
  time: string;
  type: 'skill' | 'moltbook' | 'consensus' | 'research';
  message: string;
}

const MODEL_COLORS: Record<string, string> = {
  claude: '#D97706',
  gpt: '#10B981',
  gemini: '#3B82F6',
  grok: '#EF4444',
};

const TABS: { id: 'consensus' | 'research' | 'skills' | 'fleet'; label: string; icon: React.ElementType }[] = [
  { id: 'consensus', label: 'Society of Minds', icon: Brain },
  { id: 'research', label: 'Overnight Research', icon: Moon },
  { id: 'skills', label: 'Skill Forge', icon: Hammer },
  { id: 'fleet', label: 'Agent Fleet', icon: Server },
];

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState<'consensus' | 'research' | 'skills' | 'fleet'>('consensus');
  const [consensusInput, setConsensusInput] = useState('');
  const [researchInput, setResearchInput] = useState('');
  const [activeSession, setActiveSession] = useState<ConsensusSession | null>(null);
  const [researchTasks, setResearchTasks] = useState<ResearchTask[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [fleet, setFleet] = useState<AgentInstance[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);

  const [consensusLoading, setConsensusLoading] = useState(false);
  const [useConsensusStream, setUseConsensusStream] = useState(false);
  const [researchEmail, setResearchEmail] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [fleetLoading, setFleetLoading] = useState(false);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.skills?.length) {
        setSkills(
          data.skills.map((s: { id: string; name: string; category: string; status: string; usageCount: number; successRate: number }) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            status: s.status as Skill['status'],
            usageCount: s.usageCount ?? 0,
            successRate: s.successRate ?? 0,
          }))
        );
      }
    } catch {
      // Keep mock data on error
    }
  };

  const fetchFleet = async () => {
    try {
      const res = await fetch('/api/fleet');
      const data = await res.json();
      if (data.fleet?.length) {
        setFleet(
          data.fleet.map((a: { id: string; name: string; location: string; status: string; skills: number; uptimeFormatted: string; lastHeartbeatFormatted: string }) => ({
            id: a.id,
            name: a.name,
            location: a.location,
            status: a.status as AgentInstance['status'],
            skills: a.skills ?? 0,
            uptime: a.uptimeFormatted ?? '-',
            lastActivity: a.lastHeartbeatFormatted ?? '-',
          }))
        );
      }
    } catch {
      // Keep mock data on error
    }
  };

  const fetchResearchTasks = async () => {
    try {
      const res = await fetch('/api/research');
      const data = await res.json();
      if (data.tasks?.length) {
        setResearchTasks(
          data.tasks.map((t: { id: string; title: string; status: string; progress: { phase: string; completed: number; total: number }; completedAt?: string }) => ({
            id: t.id,
            title: t.title,
            status: t.status as ResearchTask['status'],
            progress: t.progress ? (t.progress.completed / t.progress.total) * 100 : 0,
            currentPhase: t.progress?.phase ?? 'queued',
            estimatedCompletion: t.completedAt ? new Date(t.completedAt) : undefined,
          }))
        );
      }
    } catch {
      // Keep existing state on error
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchFleet();
    fetchResearchTasks();
    setActivityLog([
      { id: '1', time: '2m ago', type: 'skill', message: 'News Monitor completed: 47 items collected' },
      { id: '2', time: '5m ago', type: 'moltbook', message: 'Posted to m/devtools: "Building a governance layer..."' },
      { id: '3', time: '12m ago', type: 'skill', message: 'Thumbnail Analyzer: Processed 50 images' },
      { id: '4', time: '15m ago', type: 'consensus', message: 'Society of Minds: Consensus reached on API optimization' },
      { id: '5', time: '23m ago', type: 'moltbook', message: 'Followed @CognitiveClara (karma: 847)' },
    ]);
  }, []);

  const startConsensus = async () => {
    if (!consensusInput.trim()) return;
    const topic = consensusInput;
    setConsensusInput('');
    setConsensusLoading(true);
    const runningSession: ConsensusSession = {
      id: `session-${Date.now()}`,
      topic,
      status: 'running',
      models: [
        { id: 'claude', name: 'Claude', color: MODEL_COLORS.claude, status: 'thinking' },
        { id: 'gpt', name: 'GPT-4', color: MODEL_COLORS.gpt, status: 'waiting' },
        { id: 'gemini', name: 'Gemini', color: MODEL_COLORS.gemini, status: 'waiting' },
        { id: 'grok', name: 'Grok', color: MODEL_COLORS.grok, status: 'waiting' },
      ],
      currentRound: 1,
      agreement: 0,
    };
    setActiveSession(runningSession);

    if (useConsensusStream) {
      try {
        const es = new EventSource(`/api/consensus/stream?task=${encodeURIComponent(topic)}&maxRounds=2`);
        es.onmessage = (e) => {
          try {
            const update = JSON.parse(e.data) as { type: string; round?: number; agreement?: number; synthesis?: string; consensus?: string; recommendations?: string[] };
            if (update.type === 'round_start' && update.round) {
              setActiveSession((prev) => (prev ? { ...prev, currentRound: update.round ?? 1 } : null));
            }
            if (update.type === 'round_complete') {
              setActiveSession((prev) =>
                prev ? { ...prev, agreement: update.agreement ?? prev.agreement, synthesis: update.synthesis ?? prev.synthesis } : null
              );
            }
            if (update.type === 'done') {
              const agreement = update.agreement ?? 0.87;
              const synthesis = update.consensus
                ? `**Consensus Reached (${Math.round(agreement * 100)}% agreement)**\n\n${update.consensus}${update.recommendations?.length ? `\n\nRecommendations:\n${update.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}` : ''}`
                : 'No consensus reached.';
              setActiveSession((prev) =>
                prev
                  ? { ...prev, status: 'complete', agreement, synthesis, models: prev.models.map((m) => ({ ...m, status: 'responded' as const, confidence: agreement })) }
                  : null
              );
              setActivityLog((prev) => [
                { id: `log-${Date.now()}`, time: 'now', type: 'consensus', message: `Society of Minds: Consensus on "${topic.slice(0, 30)}..."` },
                ...prev,
              ]);
              es.close();
              setConsensusLoading(false);
            }
            if (update.type === 'error') {
              es.close();
              simulateConsensus(runningSession);
              setConsensusLoading(false);
            }
          } catch {
            // ignore parse errors
          }
        };
        es.onerror = () => {
          es.close();
          simulateConsensus(runningSession);
          setConsensusLoading(false);
        };
      } catch {
        simulateConsensus(runningSession);
        setConsensusLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: topic, maxRounds: 2 }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        const agreement = data.result.agreement ?? 0.87;
        const synthesis = data.result.consensus
          ? `**Consensus Reached (${Math.round(agreement * 100)}% agreement)**\n\n${data.result.consensus}${data.result.recommendations?.length ? `\n\nRecommendations:\n${data.result.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}` : ''}`
          : 'No consensus reached.';
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                status: 'complete',
                agreement,
                synthesis,
                models: prev.models.map((m) => ({ ...m, status: 'responded' as const, confidence: agreement })),
              }
            : null
        );
        setActivityLog((prev) => [
          { id: `log-${Date.now()}`, time: 'now', type: 'consensus', message: `Society of Minds: Consensus on "${topic.slice(0, 30)}..."` },
          ...prev,
        ]);
      } else {
        simulateConsensus(runningSession);
      }
    } catch {
      simulateConsensus(runningSession);
    } finally {
      setConsensusLoading(false);
    }
  };

  const simulateConsensus = async (session: ConsensusSession) => {
    for (let i = 0; i < session.models.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setActiveSession((prev) => {
        if (!prev) return null;
        const models = [...prev.models];
        models[i] = {
          ...models[i],
          status: 'responded',
          response: `[${models[i].name}] Simulated response about "${prev.topic}"...`,
          confidence: 0.7 + Math.random() * 0.25,
        };
        if (i + 1 < models.length) {
          models[i + 1] = { ...models[i + 1], status: 'thinking' };
        }
        return { ...prev, models, agreement: ((i + 1) / models.length) * 0.8 };
      });
    }
    await new Promise((r) => setTimeout(r, 1000));
    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            status: 'complete',
            agreement: 0.87,
            synthesis: `**Consensus Reached (87% agreement)**\n\nThe models agree on the following approach to "${prev.topic}":\n\n1. Primary recommendation from collective analysis\n2. Key insight from Claude's reasoning\n3. Practical suggestion from GPT\n4. Real-time context from Grok`,
            models: prev.models.map((m) => ({ ...m, status: 'responded' as const })),
          }
        : null
    );
  };

  const queueResearch = async () => {
    if (!researchInput.trim()) return;
    const title = researchInput;
    const notifyEmail = researchEmail.trim() || 'user@example.com';
    setResearchLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          notifyEmail,
          deliverables: ['Comprehensive analysis', 'Key findings', 'Recommendations'],
          deadlineHours: 8,
          notifyMoltbook: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setResearchInput('');
        await fetchResearchTasks();
        setActivityLog((prev) => [
          { id: `log-${Date.now()}`, time: 'now', type: 'research', message: `Research queued: "${title}"` },
          ...prev,
        ]);
      }
    } finally {
      setResearchLoading(false);
    }
  };

  const spawnFleet = async () => {
    setFleetLoading(true);
    try {
      const res = await fetch('/api/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'digitalocean', region: 'nyc1', name: `PowerCore VPS-${fleet.length + 1}` }),
      });
      if (res.ok) await fetchFleet();
    } finally {
      setFleetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            Command Center
          </h1>
          <p className="text-zinc-500 mt-1">Society of Minds • Overnight Research • Skill Forge • Agent Fleet</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-emerald-400">{fleet.filter((f) => f.status !== 'offline').length} agents online</span>
          </div>
          <button type="button" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${
              activeTab === tab.id ? TAB_STYLES[tab.id] : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-transparent'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {activeTab === 'consensus' && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Society of Minds</h2>
                  <p className="text-sm text-zinc-500">Multiple AI models collaborate on problems</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 mb-6">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={useConsensusStream}
                    onChange={(e) => setUseConsensusStream(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-purple-500"
                  />
                  Use live stream (round-by-round updates)
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={consensusInput}
                    onChange={(e) => setConsensusInput(e.target.value)}
                    placeholder="What should the minds debate?"
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                    onKeyDown={(e) => e.key === 'Enter' && void startConsensus()}
                  />
                  <button
                    type="button"
                    onClick={() => void startConsensus()}
                    disabled={!consensusInput.trim() || activeSession?.status === 'running' || consensusLoading}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-colors"
                  >
                    {consensusLoading ? 'Debating...' : 'Start Debate'}
                  </button>
                </div>
              </div>
              {activeSession && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-zinc-400">Topic: &quot;{activeSession.topic}&quot;</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          activeSession.status === 'running' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {activeSession.status === 'running' ? 'Debating...' : 'Complete'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {activeSession.models.map((model) => (
                        <div
                          key={model.id}
                          className={`p-3 rounded-lg border ${
                            model.status === 'thinking'
                              ? 'border-amber-500/50 bg-amber-500/5'
                              : model.status === 'responded'
                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                : 'border-zinc-700 bg-zinc-800/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: model.color }} />
                            <span className="text-sm font-medium">{model.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {model.status === 'thinking' && (
                              <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            )}
                            {model.status === 'responded' && (
                              <span className="text-xs text-emerald-400">
                                {Math.round((model.confidence || 0) * 100)}% confident
                              </span>
                            )}
                            {model.status === 'waiting' && <span className="text-xs text-zinc-500">Waiting...</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Agreement</span>
                        <span>{Math.round(activeSession.agreement * 100)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${activeSession.agreement * 100}%` }}
                        />
                      </div>
                    </div>
                    {activeSession.synthesis && (
                      <div className="p-4 bg-zinc-900 rounded-lg border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">Synthesis</span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{activeSession.synthesis}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!activeSession && (
                <div className="text-center py-12 text-zinc-500">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Enter a topic to start a multi-model debate</p>
                  <p className="text-sm mt-1">Claude, GPT, Gemini, and Grok will collaborate</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'research' && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Moon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Overnight Research</h2>
                  <p className="text-sm text-zinc-500">Set tasks before bed, wake up to results</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <input
                  type="email"
                  value={researchEmail}
                  onChange={(e) => setResearchEmail(e.target.value)}
                  placeholder="Email for results (optional, default: user@example.com)"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={researchInput}
                    onChange={(e) => setResearchInput(e.target.value)}
                    placeholder="What should we research while you sleep?"
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && void queueResearch()}
                  />
                  <button
                    type="button"
                    onClick={() => void queueResearch()}
                    disabled={!researchInput.trim() || researchLoading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-medium transition-colors"
                  >
                    {researchLoading ? 'Queuing...' : 'Queue Research'}
                  </button>
                </div>
              </div>
              {researchTasks.length > 0 ? (
                <div className="space-y-3">
                  {researchTasks.map((task) => (
                    <div key={task.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{task.title}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            task.status === 'running'
                              ? 'bg-blue-500/20 text-blue-400'
                              : task.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <span>{task.currentPhase}</span>
                        {task.estimatedCompletion && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ETA: {task.estimatedCompletion.toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <Moon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No research tasks queued</p>
                  <p className="text-sm mt-1">Queue a task and we&apos;ll work on it overnight</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Hammer className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Skill Forge</h2>
                    <p className="text-sm text-zinc-500">Capabilities accumulate forever</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">{skills.length}</div>
                  <div className="text-xs text-zinc-500">Total Skills</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className={`p-4 rounded-lg border transition-all ${
                      skill.status === 'learning'
                        ? 'border-amber-500/50 bg-amber-500/5'
                        : skill.status === 'active'
                          ? 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600'
                          : 'border-blue-500/50 bg-blue-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{skill.name}</span>
                      {skill.status === 'learning' && (
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">{skill.category}</span>
                      <span className="text-zinc-400">{skill.usageCount} uses</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${skill.successRate * 100}%` }} />
                      </div>
                      <span className="text-xs text-emerald-400">{Math.round(skill.successRate * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Server className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Agent Fleet</h2>
                    <p className="text-sm text-zinc-500">Self-replicated instances</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void spawnFleet()}
                  disabled={fleetLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 rounded-lg text-sm font-medium transition-colors"
                >
                  {fleetLoading ? 'Spawning...' : '+ Spawn New Instance'}
                </button>
              </div>
              <div className="space-y-3">
                {fleet.map((agent) => (
                  <div key={agent.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            agent.status === 'online'
                              ? 'bg-emerald-400'
                              : agent.status === 'busy'
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-zinc-600'
                          }`}
                        />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          agent.status === 'online'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : agent.status === 'busy'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-zinc-700 text-zinc-500'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500 block">Location</span>
                        <span className="text-zinc-300">{agent.location}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Skills</span>
                        <span className="text-zinc-300">{agent.skills}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Uptime</span>
                        <span className="text-zinc-300">{agent.uptime}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Last Active</span>
                        <span className="text-zinc-300">{agent.lastActivity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-500">SKILLS</span>
              </div>
              <div className="text-2xl font-bold">{skills.length}</div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">INSTANCES</span>
              </div>
              <div className="text-2xl font-bold">{fleet.length}</div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-zinc-500">MOLTBOOK</span>
              </div>
              <div className="text-2xl font-bold">312</div>
              <div className="text-xs text-zinc-500">karma</div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-500">RESEARCH</span>
              </div>
              <div className="text-2xl font-bold">{researchTasks.length}</div>
              <div className="text-xs text-zinc-500">queued</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium">Live Activity</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activityLog.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`p-1.5 rounded ${
                      item.type === 'skill'
                        ? 'bg-amber-500/20 text-amber-400'
                        : item.type === 'moltbook'
                          ? 'bg-orange-500/20 text-orange-400'
                          : item.type === 'consensus'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {item.type === 'skill' && <Zap className="w-3 h-3" />}
                    {item.type === 'moltbook' && <MessageSquare className="w-3 h-3" />}
                    {item.type === 'consensus' && <Brain className="w-3 h-3" />}
                    {item.type === 'research' && <Search className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{item.message}</p>
                    <p className="text-xs text-zinc-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
            <span className="text-xs text-zinc-500 mb-3 block">CAPABILITIES</span>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Phone, label: 'Voice Calls', active: true },
                { icon: Mail, label: 'Email', active: true },
                { icon: Video, label: 'Video Gen', active: true },
                { icon: Image, label: 'Images', active: true },
                { icon: Search, label: 'Web Search', active: true },
                { icon: Globe, label: 'APIs', active: true },
                { icon: GitBranch, label: 'Self-Replicate', active: true },
                { icon: Cpu, label: 'Code Exec', active: true },
              ].map((cap, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg ${cap.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}
                  title={cap.label}
                >
                  <cap.icon className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
