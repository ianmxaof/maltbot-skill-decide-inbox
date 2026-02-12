"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

interface DigestSubscription {
  pairId: string;
  email: string;
  enabled: boolean;
  frequency: "daily" | "weekly";
  lastSentAt?: string;
}

export function DigestEmailPanel({ pairId }: { pairId: string }) {
  const [sub, setSub] = useState<DigestSubscription | null>(null);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSub = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/digest/email?pairId=${encodeURIComponent(pairId)}`
      );
      const data = await res.json();
      if (data.subscription) {
        setSub(data.subscription);
        setEmail(data.subscription.email);
        setFrequency(data.subscription.frequency);
      }
    } catch {
      // no subscription
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  const subscribe = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/digest/email?subscribe=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, email: email.trim(), frequency }),
      });
      const data = await res.json();
      if (data.subscription) {
        setSub(data.subscription);
        setMessage("Subscribed to morning briefing");
      }
    } catch {
      setMessage("Failed to subscribe");
    } finally {
      setSaving(false);
    }
  };

  const unsubscribe = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await fetch("/api/digest/email?unsubscribe=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId }),
      });
      setSub(null);
      setMessage("Unsubscribed");
    } catch {
      setMessage("Failed to unsubscribe");
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/digest/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId }),
      });
      const data = await res.json();
      setMessage(data.sent ? "Digest email sent" : data.error ?? "Failed to send");
    } catch {
      setMessage("Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400">
        Receive a morning briefing email with your agent&apos;s overnight activity,
        security events, and action items. Sent daily at 8 AM UTC.
      </p>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
        />
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
          className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <div className="flex gap-2">
        {sub?.enabled ? (
          <>
            <button
              type="button"
              onClick={subscribe}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition disabled:opacity-50 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Update
            </button>
            <button
              type="button"
              onClick={unsubscribe}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              Unsubscribe
            </button>
            <button
              type="button"
              onClick={sendNow}
              disabled={sending}
              className="text-xs px-3 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition disabled:opacity-50 flex items-center gap-1"
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
              Send Now
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={subscribe}
            disabled={saving || !email.trim()}
            className="text-xs px-3 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/30 transition disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
            Subscribe
          </button>
        )}
      </div>

      {message && (
        <p className="text-xs text-zinc-400">{message}</p>
      )}

      {sub?.lastSentAt && (
        <p className="text-[10px] text-zinc-600">
          Last sent: {new Date(sub.lastSentAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
