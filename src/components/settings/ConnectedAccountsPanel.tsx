"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Flame, Music, Github, MessageSquare, Cloud, Globe,
  BookMarked, Highlighter, MessageCircle,
  Plus, Check, X, Loader2, ExternalLink, Unplug,
  ChevronDown, ChevronUp, Eye, EyeOff,
} from "lucide-react";
import type {
  IntegrationProvider,
  ConnectedIntegration,
  IntegrationProviderId,
} from "@/types/integration";

interface Props {
  pairId: string;
}

// ── Icon map ──
const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Flame, Music, Github, MessageSquare, Cloud, Globe,
  BookMarked, Highlighter, MessageCircle,
};

type ConnectionState = "idle" | "connecting" | "validating" | "success" | "error";

export function ConnectedAccountsPanel({ pairId }: Props) {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connected, setConnected] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<IntegrationProviderId | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [connectionError, setConnectionError] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Fetch providers and connected integrations
  const loadData = useCallback(async () => {
    try {
      const [provRes, connRes] = await Promise.all([
        fetch("/api/integrations?providers=true").then(r => r.json()),
        fetch(`/api/integrations?pairId=${encodeURIComponent(pairId)}`).then(r => r.json()),
      ]);
      if (provRes.success) setProviders(provRes.providers);
      if (connRes.success) setConnected(connRes.integrations);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => { loadData(); }, [loadData]);

  const isConnected = (providerId: IntegrationProviderId) =>
    connected.some(c => c.providerId === providerId && c.active);

  const getConnection = (providerId: IntegrationProviderId) =>
    connected.find(c => c.providerId === providerId);

  // ── Connect flow ──

  const handleConnect = async (provider: IntegrationProvider) => {
    setConnectionState("validating");
    setConnectionError("");

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId,
          providerId: provider.id,
          connectionData: fieldValues,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectionState("success");
        setFieldValues({});
        await loadData();
        setTimeout(() => {
          setConnectionState("idle");
          setExpandedProvider(null);
        }, 1500);
      } else {
        setConnectionState("error");
        setConnectionError(data.error ?? "Connection failed");
      }
    } catch {
      setConnectionState("error");
      setConnectionError("Network error");
    }
  };

  // ── Disconnect flow ──

  const handleDisconnect = async (providerId: IntegrationProviderId) => {
    try {
      await fetch("/api/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId, providerId }),
      });
      await loadData();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading integrations...
      </div>
    );
  }

  // Separate available from connected
  const connectedProviders = providers.filter(p => isConnected(p.id));
  const availableProviders = providers.filter(p => !isConnected(p.id));

  return (
    <div className="space-y-4">
      {/* ── Connected integrations ── */}
      {connectedProviders.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Connected
          </div>
          {connectedProviders.map(provider => {
            const conn = getConnection(provider.id)!;
            const Icon = PROVIDER_ICONS[provider.icon] ?? Globe;

            return (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: provider.color + "20" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: provider.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{provider.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        {conn.displayName}
                      </span>
                      {conn.lastSyncAt && (
                        <span className="text-zinc-700">&middot; synced {timeAgo(conn.lastSyncAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDisconnect(provider.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 rounded hover:bg-red-500/10 transition"
                  >
                    <Unplug className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Available integrations ── */}
      {availableProviders.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Available
          </div>
          {availableProviders.map(provider => {
            const Icon = PROVIDER_ICONS[provider.icon] ?? Globe;
            const isExpanded = expandedProvider === provider.id;
            const isOAuth = provider.authMethod === "oauth2";

            return (
              <div
                key={provider.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden transition-all"
              >
                {/* Provider header */}
                <button
                  onClick={() => {
                    setExpandedProvider(isExpanded ? null : provider.id);
                    setFieldValues({});
                    setConnectionState("idle");
                    setConnectionError("");
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 hover:bg-zinc-800/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: provider.color + "15" }}
                    >
                      <Icon className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-zinc-300">{provider.name}</div>
                      <div className="text-[11px] text-zinc-600">{provider.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOAuth && provider.id === "spotify" && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded cursor-pointer transition"
                        style={{ backgroundColor: provider.color + "20", color: provider.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/api/integrations/spotify/connect?pairId=${encodeURIComponent(pairId)}`;
                        }}
                      >
                        Connect with Spotify
                      </span>
                    )}
                    {isOAuth && provider.id !== "spotify" && (
                      <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
                        Coming Soon
                      </span>
                    )}
                    {!isOAuth && (
                      isExpanded
                        ? <ChevronUp className="w-4 h-4 text-zinc-600" />
                        : <ChevronDown className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                </button>

                {/* Connection form */}
                {isExpanded && !isOAuth && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
                    <div className="space-y-3">
                      {provider.connectionFields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs text-zinc-400 mb-1">{field.label}</label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={fieldValues[field.key] ?? ""}
                            onChange={e =>
                              setFieldValues(v => ({ ...v, [field.key]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none"
                          />
                          {field.helpText && (
                            <p className="text-[10px] text-zinc-600 mt-1">{field.helpText}</p>
                          )}
                        </div>
                      ))}

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-1.5">
                        {provider.capabilities.map(cap => (
                          <span
                            key={cap}
                            className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded"
                          >
                            {cap.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>

                      {/* Connect button */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleConnect(provider)}
                          disabled={connectionState === "validating"}
                          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition"
                        >
                          {connectionState === "validating" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : connectionState === "success" ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          {connectionState === "validating" ? "Connecting..." :
                           connectionState === "success" ? "Connected!" : "Connect"}
                        </button>
                        {connectionState === "error" && (
                          <span className="text-xs text-red-400">{connectionError}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
