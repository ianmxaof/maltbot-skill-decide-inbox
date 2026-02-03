import { NextRequest, NextResponse } from 'next/server';
import { getSkillForge } from '@/lib/skill-forge';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { inputs } = await req.json();
    const forge = getSkillForge();
    const execution = await forge.executeSkill(params.id, inputs || {});

    return NextResponse.json({
      success: execution.status === 'success',
      execution: {
        id: execution.id,
        status: execution.status,
        outputs: execution.outputs,
        error: execution.error,
        durationMs: execution.completedAt
          ? execution.completedAt.getTime() - execution.startedAt.getTime()
          : null,
      },
    });
  } catch (error) {
    console.error('[SKILL EXECUTE ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Skill execution failed' },
      { status: 500 }
    );
  }
}
