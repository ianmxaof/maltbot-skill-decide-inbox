"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircleQuestion, Send, Check, X, Eye, EyeOff,
  ChevronDown, ChevronUp, Loader2, Clock,
} from "lucide-react";
import type { PairQuestion } from "@/types/social";

interface Props {
  targetPairId: string;
  viewerPairId?: string;
  viewerName?: string;
  isOwner: boolean;
  cardStyle?: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function cardClasses(cardStyle?: string): string {
  switch (cardStyle) {
    case "glass": return "rounded-xl border border-white/10 bg-white/5 backdrop-blur-md";
    case "solid": return "rounded-xl border border-zinc-700 bg-zinc-800";
    case "none": return "rounded-xl";
    default: return "rounded-xl border border-zinc-800 bg-zinc-900/50";
  }
}

export function AskThisPair({ targetPairId, viewerPairId, viewerName, isOwner, cardStyle }: Props) {
  const [questions, setQuestions] = useState<PairQuestion[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  const card = cardClasses(cardStyle);

  const loadQuestions = useCallback(async () => {
    const viewerParam = viewerPairId ? `&viewerPairId=${encodeURIComponent(viewerPairId)}` : "";
    const res = await fetch(
      `/api/social/questions?targetPairId=${encodeURIComponent(targetPairId)}${viewerParam}`
    );
    const data = await res.json();
    if (data.success) setQuestions(data.questions);
  }, [targetPairId, viewerPairId]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // ── Ask ──
  const handleAsk = async () => {
    if (!newQuestion.trim() || !viewerPairId) return;
    setSending(true);
    try {
      const res = await fetch("/api/social/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPairId,
          askerPairId: viewerPairId,
          askerName: viewerName || "Anonymous",
          question: newQuestion.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewQuestion("");
        await loadQuestions();
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  // ── Answer ──
  const handleAnswer = async (questionId: string) => {
    const answer = answerDrafts[questionId]?.trim();
    if (!answer) return;
    setAnsweringId(questionId);
    try {
      await fetch("/api/social/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          questionId,
          targetPairId,
          answer,
        }),
      });
      setAnswerDrafts(d => { const n = { ...d }; delete n[questionId]; return n; });
      await loadQuestions();
    } catch { /* ignore */ }
    setAnsweringId(null);
  };

  // ── Decline ──
  const handleDecline = async (questionId: string) => {
    await fetch("/api/social/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline", questionId, targetPairId }),
    });
    await loadQuestions();
  };

  // ── Toggle visibility ──
  const handleToggleVis = async (questionId: string) => {
    await fetch("/api/social/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_visibility", questionId, targetPairId }),
    });
    await loadQuestions();
  };

  const answered = questions.filter(q => q.status === "answered");
  const pending = questions.filter(q => q.status === "pending");
  const declined = questions.filter(q => q.status === "declined");

  return (
    <div className={`${card} p-5`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Ask This Pair
          </span>
          <span className="text-[10px] text-zinc-600">
            {answered.length} answered
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Ask form */}
          {viewerPairId && !isOwner && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="Ask this pair anything..."
                maxLength={500}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 outline-none"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
              />
              <button
                onClick={handleAsk}
                disabled={sending || !newQuestion.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50 transition"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Owner: Pending questions to answer */}
          {isOwner && pending.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] text-amber-400 uppercase font-semibold">
                {pending.length} Pending {pending.length === 1 ? "Question" : "Questions"}
              </div>
              {pending.map(q => (
                <div key={q.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm text-zinc-200 font-medium">{q.askerName}</span>
                      <span className="text-[10px] text-zinc-600 ml-2">{timeAgo(q.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDecline(q.id)} className="p-1 text-zinc-600 hover:text-red-400 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">{q.question}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={answerDrafts[q.id] ?? ""}
                      onChange={e => setAnswerDrafts(d => ({ ...d, [q.id]: e.target.value }))}
                      placeholder="Write your answer..."
                      className="flex-1 rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAnswer(q.id); } }}
                    />
                    <button
                      onClick={() => handleAnswer(q.id)}
                      disabled={answeringId === q.id || !answerDrafts[q.id]?.trim()}
                      className="flex items-center gap-1 rounded bg-violet-600 px-2 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      {answeringId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Answer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Answered Q&A */}
          {answered.length > 0 && (
            <div className="space-y-3">
              {answered.map(q => (
                <div key={q.id} className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      <MessageCircleQuestion className="w-3 h-3 text-violet-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-300 font-medium">{q.question}</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleToggleVis(q.id)}
                        className="p-1 text-zinc-600 hover:text-zinc-400 transition flex-shrink-0"
                        title={q.public ? "Hide from profile" : "Show on profile"}
                      >
                        {q.public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="ml-4.5 pl-3 border-l border-zinc-800">
                    <p className="text-sm text-zinc-400 leading-relaxed">{q.answer}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
                      <span>Asked by {q.askerName}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(q.answeredAt ?? q.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Owner: Declined questions */}
          {isOwner && declined.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/50">
              <div className="text-[10px] text-zinc-600 uppercase font-semibold mb-1">
                Declined ({declined.length})
              </div>
              {declined.slice(0, 3).map(q => (
                <div key={q.id} className="text-[11px] text-zinc-600 py-1">
                  <span className="font-medium">{q.askerName}:</span> {q.question.slice(0, 80)}...
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {answered.length === 0 && (!isOwner || pending.length === 0) && (
            <div className="flex items-center gap-2 py-3 text-sm text-zinc-600">
              <Clock className="w-4 h-4" />
              No questions yet. Be the first to ask!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
