import { NextRequest, NextResponse } from 'next/server';
import { ConsensusEngine } from '@/lib/consensus-engine';

export async function POST(req: NextRequest) {
  try {
    const { task, context, maxRounds } = await req.json();

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    const engine = new ConsensusEngine();
    const result = await engine.runConsensus({
      task,
      context,
      maxRounds: maxRounds || 2,
    });

    return NextResponse.json({
      success: true,
      result: {
        consensus: result.finalConsensus,
        consensusReached: result.consensusReached,
        agreement: result.rounds[result.rounds.length - 1]?.agreement,
        rounds: result.rounds.length,
        recommendations: result.recommendations,
        totalTimeMs: result.totalTimeMs,
      },
    });
  } catch (error) {
    console.error('[CONSENSUS ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Consensus failed' },
      { status: 500 }
    );
  }
}
