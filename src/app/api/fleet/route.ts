import { NextRequest, NextResponse } from 'next/server';

// In-memory fleet store (use database in production)
interface AgentInstance {
  id: string;
  name: string;
  location: string;
  provider: 'local' | 'digitalocean' | 'vultr' | 'aws';
  status: 'online' | 'busy' | 'offline' | 'provisioning';
  ipAddress: string;
  skills: number;
  uptime: number;
  lastHeartbeat: Date;
  config: { autoUpdate: boolean; heartbeatInterval: number };
}

const fleet: AgentInstance[] = [
  {
    id: 'local-1',
    name: 'PowerCore Prime',
    location: 'Local (MacBook)',
    provider: 'local',
    status: 'online',
    ipAddress: '127.0.0.1',
    skills: 12,
    uptime: Date.now() - 3 * 24 * 60 * 60 * 1000,
    lastHeartbeat: new Date(),
    config: { autoUpdate: true, heartbeatInterval: 60 },
  },
];

function formatUptime(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

function formatTimeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  if (ms < 60000) return 'now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

export async function GET() {
  return NextResponse.json({
    fleet: fleet.map((agent) => ({
      ...agent,
      uptimeFormatted: formatUptime(Date.now() - agent.uptime),
      lastHeartbeatFormatted: formatTimeAgo(agent.lastHeartbeat),
    })),
    total: fleet.length,
    online: fleet.filter((a) => a.status === 'online').length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { provider, region, name } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const newAgent: AgentInstance = {
      id: `agent-${Date.now()}`,
      name: name || `PowerCore VPS-${fleet.length + 1}`,
      location: `${provider} ${region || 'default'}`,
      provider,
      status: 'provisioning',
      ipAddress: '0.0.0.0',
      skills: 0,
      uptime: Date.now(),
      lastHeartbeat: new Date(),
      config: { autoUpdate: true, heartbeatInterval: 60 },
    };

    fleet.push(newAgent);

    setTimeout(() => {
      const agent = fleet.find((a) => a.id === newAgent.id);
      if (agent) {
        agent.status = 'online';
        agent.ipAddress = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        agent.skills = 12;
      }
    }, 5000);

    return NextResponse.json({
      success: true,
      agent: newAgent,
    });
  } catch (error) {
    console.error('[FLEET SPAWN ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to spawn agent' },
      { status: 500 }
    );
  }
}
