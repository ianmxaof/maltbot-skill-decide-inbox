"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Loader2, MessageSquare, AlertCircle, Key, Play, CheckCircle } from "lucide-react";

/** Gateway not running / connection closed — show one-step fix */
function isGatewayDownError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes("gateway closed") ||
    lower.includes("gateway agent failed") ||
    lower.includes("1006") ||
    lower.includes("abnormal closure") ||
    lower.includes("econnrefused") ||
    lower.includes("gateway not running")
  );
}

/** Any API key, auth, token, or credential error — show one-step fix */
function isAuthRelatedError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes("oauth") ||
    lower.includes("token") ||
    lower.includes("auth") ||
    lower.includes("credential") ||
    lower.includes("api key") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("refresh") ||
    lower.includes("expired") ||
    (lower.includes("invalid") && (lower.includes("key") || lower.includes("token"))) ||
    lower.includes("failover") ||
    lower.includes("usage limit") ||
    lower.includes("credits")
  );
}

type GatewayStatus = "unknown" | "starting" | "checking" | "running" | "error";

export default function CommandPage() {
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; stdout?: string; error?: string } | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>("unknown");
  const [gatewayMsg, setGatewayMsg] = useState<string | null>(null);

  const handleCheckGateway = async () => {
    setGatewayStatus("starting");
    setGatewayMsg("Checking...");
    try {
      const res = await fetch("/api/openclaw/gateway/status");
      const data = await res.json();
      if (data.running) {
        setGatewayStatus("running");
        setGatewayMsg("Gateway is running. You can send your command now.");
      } else {
        setGatewayStatus("error");
        setGatewayMsg("Gateway is not responding. Start it manually: openclaw gateway --port 18789");
      }
    } catch {
      setGatewayStatus("error");
      setGatewayMsg("Could not check Gateway status.");
    }
  };

  const handleStartGateway = async () => {
    setGatewayStatus("starting");
    setGatewayMsg("Starting Gateway... this may take a few seconds.");
    try {
      const res = await fetch("/api/openclaw/gateway/start", { method: "POST" });
      const data = await res.json();
      if (data.alreadyRunning) {
        setGatewayStatus("running");
        setGatewayMsg("Gateway is already running. Try sending your command now.");
      } else if (data.success && data.verified) {
        setGatewayStatus("running");
        setGatewayMsg("Gateway started and verified. Send your command now.");
      } else if (data.success && !data.verified) {
        setGatewayStatus("unknown");
        setGatewayMsg("Spawn attempted but couldn't verify. Use Retry Command if the gateway started, or run manually in a terminal.");
      } else {
        setGatewayStatus("error");
        setGatewayMsg(data.error ?? "Failed to start Gateway. Try manually: openclaw gateway --port 18789");
      }
    } catch (e) {
      setGatewayStatus("error");
      setGatewayMsg(e instanceof Error ? e.message : "Failed to start Gateway.");
    }
  };

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
      const text = await res.text();
      let data: { success?: boolean; stdout?: string; raw?: string; error?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setResult({ success: false, error: `Server error (${res.status}): ${text || res.statusText}` });
        return;
      }

      if (data.success) {
        setResult({ success: true, stdout: data.stdout ?? data.raw ?? "" });
      } else {
        setResult({ success: false, error: data.error ?? `Request failed (${res.status})` });
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
            <>
              <pre className="text-sm text-rose-400 whitespace-pre-wrap break-words overflow-x-auto max-h-64 overflow-y-auto font-sans p-3 rounded bg-rose-950/30 border border-rose-900/50">
                {result.error}
              </pre>
              {result.error && isAuthRelatedError(result.error) && (
                <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-zinc-300">
                    <AlertCircle className="w-4 h-4 inline-block mr-1.5 align-middle text-amber-400" />
                    API key or OAuth issue. OpenClaw is trying to use expired credentials. Add your API key in Settings, restart the Gateway, then retry.
                  </p>
                  <Link
                    href="/settings"
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 text-sm"
                  >
                    <Key className="w-4 h-4" />
                    Fix in Settings
                  </Link>
                </div>
              )}
              {result.error && !isAuthRelatedError(result.error) && isGatewayDownError(result.error) && (
                <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-3">
                  <p className="text-sm text-zinc-300">
                    <Play className="w-4 h-4 inline-block mr-1.5 align-middle text-amber-400" />
                    Gateway isn&apos;t running. Click below to start it, then retry your command.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleStartGateway}
                      disabled={gatewayStatus === "starting" || gatewayStatus === "checking"}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 text-sm disabled:opacity-50"
                    >
                      {gatewayStatus === "starting" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Starting…
                        </>
                      ) : gatewayStatus === "running" ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Gateway Started
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Start Gateway
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckGateway}
                      disabled={gatewayStatus === "starting" || gatewayStatus === "checking"}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700/50 text-zinc-300 font-medium hover:bg-zinc-700 text-sm disabled:opacity-50"
                    >
                      {gatewayStatus === "checking" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking…
                        </>
                      ) : (
                        "Check Gateway"
                      )}
                    </button>
                    {(gatewayStatus === "running" || gatewayStatus === "unknown") && message.trim() && (
                      <button
                        type="button"
                        onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                        disabled={running}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-medium hover:bg-amber-500/30 text-sm disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        Retry Command
                      </button>
                    )}
                  </div>
                  {gatewayMsg && (
                    <p
                      className={`text-xs ${
                        gatewayStatus === "error"
                          ? "text-rose-400"
                          : gatewayStatus === "running"
                            ? "text-emerald-400"
                            : "text-zinc-400"
                      }`}
                    >
                      {gatewayMsg}
                    </p>
                  )}
                  {(gatewayStatus === "error" || gatewayStatus === "unknown") && (
                    <p className="text-xs text-zinc-500 mt-2">
                      Or run in a terminal: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">openclaw gateway --port 18789</code>
                    </p>
                  )}
                </div>
              )}
            </>
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
