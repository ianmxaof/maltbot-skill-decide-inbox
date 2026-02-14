"use client";

import { useState, useCallback, useEffect } from "react";
import { BookOpen, Send, EyeOff, Trash2, MessageCircle } from "lucide-react";
import type { GuestbookEntry } from "@/types/social";

interface GuestbookProps {
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
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function cardClasses(cardStyle?: string): string {
  switch (cardStyle) {
    case "glass": return "rounded-xl border border-white/10 bg-white/5 backdrop-blur-md";
    case "solid": return "rounded-xl border border-zinc-700 bg-zinc-800";
    case "none": return "rounded-xl";
    default: return "rounded-xl border border-zinc-800 bg-zinc-900/50";
  }
}

export function Guestbook({ targetPairId, viewerPairId, viewerName, isOwner, cardStyle }: GuestbookProps) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch entries
  useEffect(() => {
    const viewerParam = viewerPairId ? `&viewerPairId=${encodeURIComponent(viewerPairId)}` : "";
    fetch(`/api/social/guestbook?targetPairId=${encodeURIComponent(targetPairId)}${viewerParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setEntries(data.entries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetPairId, viewerPairId]);

  const submitEntry = useCallback(async () => {
    if (!viewerPairId || !viewerName || !message.trim() || sending) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/social/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPairId,
          authorPairId: viewerPairId,
          authorName: viewerName,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.entry) {
        setEntries(prev => [data.entry, ...prev]);
        setMessage("");
      } else {
        setError(data.error ?? "Failed to post");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }, [targetPairId, viewerPairId, viewerName, message, sending]);

  const handleModerate = useCallback(async (entryId: string, action: "hide" | "delete") => {
    try {
      await fetch("/api/social/guestbook", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, targetPairId, action }),
      });
      if (action === "delete") {
        setEntries(prev => prev.filter(e => e.id !== entryId));
      } else {
        setEntries(prev =>
          prev.map(e => (e.id === entryId ? { ...e, hidden: !e.hidden } : e))
        );
      }
    } catch {
      // silent
    }
  }, [targetPairId]);

  const card = cardClasses(cardStyle);

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-zinc-500" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Guestbook
        </span>
        {entries.length > 0 && (
          <span className="text-[10px] text-zinc-600">({entries.length})</span>
        )}
      </div>

      {/* New entry form */}
      {viewerPairId && viewerPairId !== targetPairId && (
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              onKeyDown={(e) => e.key === "Enter" && submitEntry()}
              placeholder="Leave a message..."
              disabled={sending}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition disabled:opacity-50"
            />
            <button
              onClick={submitEntry}
              disabled={sending || !message.trim()}
              className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-zinc-600">{message.length}/280</span>
            {error && <span className="text-[10px] text-red-400">{error}</span>}
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="text-sm text-zinc-600 py-3">Loading guestbook...</div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-zinc-600">
          <MessageCircle className="w-6 h-6 mb-2 text-zinc-700" />
          <span className="text-sm">No messages yet. Be the first to sign!</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
          {entries.map(entry => (
            <div
              key={entry.id}
              className={`group relative px-3 py-2.5 rounded-lg transition ${
                entry.hidden ? "opacity-40 bg-zinc-800/20" : "bg-zinc-800/30 hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold text-zinc-300">
                  {entry.authorName}
                </span>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {timeAgo(entry.createdAt)}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{entry.message}</p>

              {/* Owner moderation controls */}
              {isOwner && (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleModerate(entry.id, "hide")}
                    className="p-1 rounded text-zinc-600 hover:text-amber-400 transition"
                    title={entry.hidden ? "Show" : "Hide"}
                  >
                    <EyeOff className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleModerate(entry.id, "delete")}
                    className="p-1 rounded text-zinc-600 hover:text-red-400 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              {entry.hidden && (
                <span className="text-[9px] text-amber-500/60 mt-1 inline-block">Hidden</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
