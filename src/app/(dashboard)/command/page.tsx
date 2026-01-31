"use client";

import { useState } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";

export default function CommandPage() {
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; stdout?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || running) return;

    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/openclaw/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({ success: true, stdout: data.stdout ?? data.raw ?? "" });
      } else {
        setResult({ success: false, error: data.error ?? "Request failed" });
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Direct to Agent
        </h2>
        <p className="mt-1 text-zinc-400">
          Send instructions to your OpenClaw agent. It will interpret, reason, and execute — including
          finding high-signal feeds, integrating into the marketplace, and deploying when appropriate.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="agent-message" className="block text-xs font-medium text-zinc-500 mb-2">
            Instruction
          </label>
          <textarea
            id="agent-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Take high signal feeds you find and integrate them into the powercore agent marketplace if you think it will make this platform more powerful and monetizable"
            rows={6}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
            disabled={running}
          />
        </div>

        <button
          type="submit"
          disabled={running || !message.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send to Agent
            </>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-8 p-5 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {result.success ? "Agent Response" : "Error"}
          </h3>
          {result.success ? (
            <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono break-words max-h-96 overflow-y-auto">
              {result.stdout || "(No output)"}
            </pre>
          ) : (
            <p className="text-sm text-rose-400">{result.error}</p>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        Requires OpenClaw CLI and Gateway running. The agent runs via <code className="bg-zinc-800 px-1 rounded">openclaw agent</code> and
        uses its configured tools, skills, and workspace to execute your instruction.
      </p>
    </main>
  );
}
