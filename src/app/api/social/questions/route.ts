/**
 * GET    /api/social/questions?targetPairId=xxx               — Get questions for a pair
 * POST   /api/social/questions                                — Ask a question
 * PATCH  /api/social/questions                                — Answer/decline/toggle
 */

import { NextRequest, NextResponse } from "next/server";
import {
  askQuestion,
  answerQuestion,
  declineQuestion,
  toggleQuestionVisibility,
  getQuestions,
} from "@/lib/question-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const targetPairId = url.searchParams.get("targetPairId")?.trim();
    const viewerPairId = url.searchParams.get("viewerPairId")?.trim();

    if (!targetPairId) {
      return NextResponse.json({ success: false, error: "targetPairId required" }, { status: 400 });
    }

    const isOwner = viewerPairId === targetPairId;
    const questions = await getQuestions(targetPairId, { includeAll: isOwner });
    return NextResponse.json({ success: true, questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get questions";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetPairId, askerPairId, askerName, question } = body;

    if (!targetPairId || !askerPairId || !question?.trim()) {
      return NextResponse.json(
        { success: false, error: "targetPairId, askerPairId, and question required" },
        { status: 400 }
      );
    }

    if (targetPairId === askerPairId) {
      return NextResponse.json(
        { success: false, error: "Cannot ask yourself a question" },
        { status: 400 }
      );
    }

    const entry = await askQuestion(
      targetPairId,
      askerPairId,
      askerName || "Anonymous",
      question.trim()
    );
    return NextResponse.json({ success: true, question: entry });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to ask question";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, questionId, targetPairId, answer } = body;

    if (!questionId || !targetPairId) {
      return NextResponse.json(
        { success: false, error: "questionId and targetPairId required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "answer": {
        if (!answer?.trim()) {
          return NextResponse.json({ success: false, error: "Answer required" }, { status: 400 });
        }
        const q = await answerQuestion(questionId, targetPairId, answer.trim());
        return NextResponse.json({ success: !!q, question: q });
      }
      case "decline": {
        const ok = await declineQuestion(questionId, targetPairId);
        return NextResponse.json({ success: ok });
      }
      case "toggle_visibility": {
        const isPublic = await toggleQuestionVisibility(questionId, targetPairId);
        return NextResponse.json({ success: true, public: isPublic });
      }
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use: answer, decline, toggle_visibility" },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update question";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
