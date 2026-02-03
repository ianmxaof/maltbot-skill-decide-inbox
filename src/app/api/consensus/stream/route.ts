import { NextRequest } from 'next/server';
import { ConsensusEngine } from '@/lib/consensus-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const task = searchParams.get('task') || '';
  const context = searchParams.get('context') || undefined;
  const maxRounds = Math.min(5, Math.max(1, parseInt(searchParams.get('maxRounds') || '2', 10)));

  if (!task) {
    return new Response(JSON.stringify({ error: 'task query is required' }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const engine = new ConsensusEngine(undefined, (update) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
        } catch {
          // Client may have closed
        }
      });

      try {
        const result = await engine.runConsensus({
          task,
          context,
          maxRounds,
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', consensus: result.finalConsensus, agreement: result.rounds[result.rounds.length - 1]?.agreement, recommendations: result.recommendations })}\n\n`
          )
        );
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : 'Consensus failed' })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
