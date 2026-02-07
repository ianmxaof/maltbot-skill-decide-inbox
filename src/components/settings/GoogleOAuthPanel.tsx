"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";

interface VaultCredential {
  id: string;
  service: string;
  label: string;
  createdAt: string;
  lastUsed?: string;
  permissions: string[];
}

export function GoogleOAuthPanel() {
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [jsonPaste, setJsonPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/security/vault");
      const d = await r.json();
      if (Array.isArray(d.credentials)) setCredentials(d.credentials);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    const message = params.get("message");
    if (google === "connected") {
      setSuccess("Google account connected.");
      load();
      window.history.replaceState({}, "", "/settings");
    } else if (google === "error" && message) {
      setError(decodeURIComponent(message));
      window.history.replaceState({}, "", "/settings");
    }
  }, [load]);

  const hasClient = credentials.some((c) => c.service === "google_oauth_client");
  const hasToken = credentials.some((c) => c.service === "google");

  const handleSaveClient = async () => {
    let client_id = clientId.trim();
    let client_secret = clientSecret.trim();
    if (jsonPaste.trim()) {
      try {
        const obj = JSON.parse(jsonPaste) as { client_id?: string; client_secret?: string; installed?: { client_id?: string; client_secret?: string }; web?: { client_id?: string; client_secret?: string } };
        client_id = obj.client_id ?? obj.installed?.client_id ?? obj.web?.client_id ?? "";
        client_secret = obj.client_secret ?? obj.installed?.client_secret ?? obj.web?.client_secret ?? "";
      } catch {
        setError("Invalid JSON. Paste client_secret.json or provide client_id and client_secret.");
        return;
      }
    }
    if (!client_id || !client_secret) {
      setError("Provide client_id and client_secret, or paste JSON.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const value = JSON.stringify({ client_id, client_secret });
      const res = await fetch("/api/security/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "google_oauth_client",
          label: "Google OAuth Client",
          value,
          permissions: ["google:oauth"],
        }),
      });
      const data = await res.json();
      if (data.ok || data.id) {
        setSuccess("OAuth client saved. Click Connect with Google to authorize.");
        setClientId("");
        setClientSecret("");
        setJsonPaste("");
        load();
      } else {
        setError(data.error ?? "Failed to save. Is VAULT_MASTER_PASSWORD set?");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/openclaw/google/oauth/url");
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Failed to get OAuth URL");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Connect a dedicated Google account for the bot (Calendar, Drive, Gmail, Docs, Sheets, Slides). Use a separate Gmail and share only what the bot needs.
      </p>

      <div>
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300"
        >
          {showInstructions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Setup instructions (GCP project, APIs, OAuth client)
        </button>
        {showInstructions && (
          <ul className="mt-2 space-y-1 text-xs text-zinc-500 list-disc list-inside">
            <li>Create a dedicated Gmail for the bot.</li>
            <li>Share calendar/files with the bot&apos;s email as needed.</li>
            <li>Google Cloud Console → Create project → APIs & Services → Enable Gmail API, Calendar API, Drive API, Docs API, Sheets API, Slides API.</li>
            <li>Configure OAuth consent screen (external), add test users if needed.</li>
            <li>Create OAuth 2.0 Client (Desktop or Web). Download JSON or copy client_id and client_secret.</li>
            <li>For Web client, set redirect URI to: <code className="bg-zinc-800 px-1 rounded">{"{origin}/api/openclaw/google/oauth/callback"}</code></li>
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-emerald-400">{success}</p>}

      <div className="rounded border border-zinc-700 bg-zinc-800/50 p-3 space-y-3">
        <h4 className="text-xs font-medium text-zinc-400">OAuth client (client_id + client_secret)</h4>
        <div className="grid gap-2">
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID"
            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none w-full"
          />
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Client secret"
            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none w-full"
          />
          <textarea
            value={jsonPaste}
            onChange={(e) => setJsonPaste(e.target.value)}
            placeholder="Or paste client_secret.json content here"
            rows={3}
            className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none w-full font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveClient}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save client
          </button>
          {hasClient && <span className="text-xs text-zinc-500">Client saved</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleConnect}
          disabled={!hasClient || connecting}
          className="inline-flex items-center gap-2 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
          Connect with Google
        </button>
        {hasToken && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Google connected
          </span>
        )}
      </div>
    </div>
  );
}
