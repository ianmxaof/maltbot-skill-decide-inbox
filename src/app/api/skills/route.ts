import { NextRequest, NextResponse } from 'next/server';
import { getSkillForge } from '@/lib/skill-forge';

export async function GET(req: NextRequest) {
  const forge = getSkillForge();
  const skills = forge.getAllSkills();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  let filtered = skills;
  if (category) {
    filtered = filtered.filter((s) => s.category === category);
  }
  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }

  return NextResponse.json({
    skills: filtered.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      status: s.status,
      triggers: s.triggers,
      usageCount: s.usageCount,
      successRate: s.successRate,
      avgExecutionTime: s.avgExecutionTime,
      createdAt: s.createdAt.toISOString(),
      lastUsed: s.lastUsed?.toISOString(),
    })),
    total: filtered.length,
    categories: Array.from(new Set(skills.map((s) => s.category))),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { description, inputs, steps, output } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const forge = getSkillForge();
    const skill = await forge.learnFromTask({
      description,
      inputs: inputs || {},
      steps: steps || [],
      output: output || {},
    });

    return NextResponse.json({
      success: true,
      skill: {
        id: skill.id,
        name: skill.name,
        status: skill.status,
      },
    });
  } catch (error) {
    console.error('[SKILL LEARN ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to learn skill' },
      { status: 500 }
    );
  }
}
