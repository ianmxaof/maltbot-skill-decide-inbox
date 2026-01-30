"use client";

import { useEffect, useState } from "react";

type Status =
  | { state: "loading" }
  | { state: "ok"; raw: string; version?: string }
  | { state: "error"; code: string; message: string };

/** Fetches GET /api/openclaw/status; shows Gateway ok / Linked / error. Short timeout so UI does not hang. */
export function OpenClawStatusBlock() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);

    fetch("/api/openclaw/status", { signal: ac.signal })
      .then((res) => {
        clearTimeout(t);
        if (!res.ok) return res.json().then((body) => setStatus({ state: "error", code: body?.error?.code ?? "ERROR", message: body?.error?.message ?? res.statusText }));
        return res.json().then((body) => setStatus({ state: "ok", raw: body.raw ?? "", version: body.version }));
      })
      .catch((err) => {
        clearTimeout(t);
        const message = err.name === "AbortError" ? "Request timed out" : err?.message ?? "Request failed";
        setStatus({ state: "error", code: "OPENCLAW_TIMEOUT", message });
      });

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, []);

  if (status.state === "loading") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <p className="text-sm text-zinc-500">OpenClaw status: checking…</p>
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p className="text-sm font-medium text-amber-200">OpenClaw</p>
        <p className="mt-1 text-xs text-amber-200/80">{status.message}</p>
        <p className="mt-0.5 text-xs text-zinc-500">Code: {status.code}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <p className="text-sm font-medium text-emerald-200">OpenClaw</p>
      <p className="mt-1 text-xs text-emerald-200/80">Gateway: ok</p>
      {status.version && <p className="mt-0.5 text-xs text-zinc-500">Version: {status.version}</p>}
    </div>
  );
}
