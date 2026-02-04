import { NextRequest, NextResponse } from 'next/server';
import { getResearchEngine } from '@/lib/overnight-research';

export async function POST(req: NextRequest) {
  try {
    const { title, description, deliverables, deadlineHours, notifyEmail, notifyMoltbook } =
      await req.json();

    if (!title || !notifyEmail) {
      return NextResponse.json(
        { error: 'Title and notifyEmail are required' },
        { status: 400 }
      );
    }

    const engine = getResearchEngine();
    const deadline = new Date(Date.now() + (deadlineHours || 8) * 60 * 60 * 1000);

    const task = await engine.createTask({
      title,
      description: description || title,
      deliverables: deliverables || ['Comprehensive analysis', 'Key findings', 'Recommendations'],
      deadline,
      notifyEmail,
      notifyMoltbook: notifyMoltbook || false,
    });

    engine.startTask(task.id).catch(console.error);

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        deadline: task.deadline.toISOString(),
      },
    });
  } catch (error) {
    console.error('[RESEARCH ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create research task' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const engine = getResearchEngine();
  const tasks = engine.getAllTasks();

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      progress: {
        phase: t.progress.currentPhase,
        completed: t.progress.phasesCompleted,
        total: t.progress.totalPhases,
      },
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString(),
    })),
  });
}
