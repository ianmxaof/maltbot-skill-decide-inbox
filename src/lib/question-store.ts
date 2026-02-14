/**
 * Question Store — "Ask This Pair" feature
 *
 * Allows visitors to ask questions to a pair.
 * The pair's owner can answer, decline, or toggle visibility.
 */

import { kv } from "@/lib/db";
import type { PairQuestion, QuestionStatus } from "@/types/social";

const QUESTIONS_FILE = "pair-questions";

async function readAll(): Promise<PairQuestion[]> {
  return (await kv.get<PairQuestion[]>(QUESTIONS_FILE)) ?? [];
}

async function writeAll(data: PairQuestion[]): Promise<void> {
  await kv.set(QUESTIONS_FILE, data);
}

/**
 * Submit a question to a pair.
 * Rate limit: max 3 pending questions per asker per target.
 */
export async function askQuestion(
  targetPairId: string,
  askerPairId: string,
  askerName: string,
  question: string
): Promise<PairQuestion> {
  const all = await readAll();

  // Rate limit: max 3 pending per asker per target
  const pending = all.filter(
    q => q.targetPairId === targetPairId &&
         q.askerPairId === askerPairId &&
         q.status === "pending"
  );
  if (pending.length >= 3) {
    throw new Error("You already have 3 pending questions for this pair");
  }

  const entry: PairQuestion = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    targetPairId,
    askerPairId,
    askerName,
    question: question.slice(0, 500),
    status: "pending",
    public: true,
    createdAt: new Date().toISOString(),
  };

  all.push(entry);
  await writeAll(all);
  return entry;
}

/**
 * Answer a question (only the target pair can do this).
 */
export async function answerQuestion(
  questionId: string,
  targetPairId: string,
  answer: string
): Promise<PairQuestion | null> {
  const all = await readAll();
  const idx = all.findIndex(q => q.id === questionId && q.targetPairId === targetPairId);
  if (idx < 0) return null;

  all[idx] = {
    ...all[idx],
    answer: answer.slice(0, 2000),
    status: "answered",
    answeredAt: new Date().toISOString(),
  };

  await writeAll(all);
  return all[idx];
}

/**
 * Decline a question.
 */
export async function declineQuestion(
  questionId: string,
  targetPairId: string
): Promise<boolean> {
  const all = await readAll();
  const idx = all.findIndex(q => q.id === questionId && q.targetPairId === targetPairId);
  if (idx < 0) return false;

  all[idx].status = "declined";
  await writeAll(all);
  return true;
}

/**
 * Toggle public visibility of a question.
 */
export async function toggleQuestionVisibility(
  questionId: string,
  targetPairId: string
): Promise<boolean> {
  const all = await readAll();
  const idx = all.findIndex(q => q.id === questionId && q.targetPairId === targetPairId);
  if (idx < 0) return false;

  all[idx].public = !all[idx].public;
  await writeAll(all);
  return all[idx].public;
}

/**
 * Get questions for a pair's profile.
 * Public view: only answered + public questions.
 * Owner view: all questions.
 */
export async function getQuestions(
  targetPairId: string,
  opts: { includeAll?: boolean; limit?: number } = {}
): Promise<PairQuestion[]> {
  const all = await readAll();
  const { includeAll = false, limit = 20 } = opts;

  return all
    .filter(q => {
      if (q.targetPairId !== targetPairId) return false;
      if (includeAll) return true;
      // Public view: only answered + public, or pending (shown as "awaiting answer")
      return q.public && (q.status === "answered" || q.status === "pending");
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
