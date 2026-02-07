"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Settings,
  MessageSquare,
  UserPlus,
  ThumbsUp,
  AlertTriangle,
  Activity,
  Gauge,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  Zap,
  ExternalLink,
} from "lucide-react";

import { MOLTBOOK_URLS } from "@/lib/moltbook-urls";

type AutopilotMode = "off" | "conservative" | "balanced" | "aggressive" | "creator" | "full";

interface AutopilotStats {
  posts: number;
  comments: number;
  upvotes: number;
  follows: number;
}

interface ActivityItem {
  id: string;
  type: "upvote" | "comment" | "follow" | "post";
  target: string;
  targetTitle?: string;
  targetAuthor?: string;
  /** Comment text, or for post: { submolt, title, content } */
  content?: string | { submolt?: string; title?: string; content?: string };
  /** Post ID when type is post (if API returns it). */
  postId?: string;
  autoApproved: boolean;
  timestamp: Date;
}

interface AnomalyItem {
  id: string;
  type: string;
  reason: string;
  actionType?: string;
  content?: unknown;
  detectedKeywords?: string[];
  timestamp: Date;
  status: "pending" | "approved" | "denied";
  /** Source post (id, title) for comment anomalies — link to thread. */
  post?: { id?: string; title?: string };
  /** Target agent name for follow anomalies — link to profile. */
  targetAgent?: string;
}

/** Capability profile labels and descriptions (industry language). */
const MODE_CONFIG: Record<
  AutopilotMode,
  { label: string; description: string; color: string; icon: typeof Shield }
> = {
  off: {
    label: "Off",
    description: "Manual control only",
    color: "bg-zinc-700",
    icon: Pause,
  },
  conservative: {
    label: "Read-Only Observer",
    description: "Upvotes only, everything else needs approval",
    color: "bg-blue-600",
    icon: Shield,
  },
  balanced: {
    label: "Community Engager",
    description: "Upvotes and follows auto; comments and posts need review",
    color: "bg-amber-600",
    icon: Gauge,
  },
  creator: {
    label: "Content Creator",
    description: "Comments auto-approved, posts require review",
    color: "bg-emerald-600",
    icon: MessageSquare,
  },
  aggressive: {
    label: "Aggressive",
    description: "Comments and posts auto; anomalies to inbox",
    color: "bg-red-600",
    icon: Zap,
  },
  full: {
    label: "Full Autonomy",
    description: "Everything auto-approved including posts",
    color: "bg-red-700",
    icon: Zap,
  },
};

function getHeartbeatInterval(m: AutopilotMode): number {
  switch (m) {
    case "conservative":
      return 240;
    case "balanced":
      return 120;
    case "aggressive":
    case "full":
      return 60;
    case "creator":
      return 90;
    default:
      return 0;
  }
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const isUpvote = item.type === "upvote";
  const isComment = item.type === "comment";
  const isFollow = item.type === "follow";
  const isPost = item.type === "post";
  const iconClass =
    isUpvote ? "bg-amber-500/20 text-amber-400" :
    isFollow ? "bg-purple-500/20 text-purple-400" :
    isComment ? "bg-green-500/20 text-green-400" :
    "bg-blue-500/20 text-blue-400";
  const label =
    isUpvote ? "Upvoted" : isComment ? "Commented" : isFollow ? "Following" : "Posted";

  const postUrl = item.target ? MOLTBOOK_URLS.post(item.target) : null;
  const authorUrl = item.targetAuthor ? MOLTBOOK_URLS.profile(item.targetAuthor) : null;
  const followUrl = isFollow && item.target ? MOLTBOOK_URLS.profile(item.target) : null;
  const postSubmoltUrl =
    isPost && item.content && typeof item.content === "object" && item.content.submolt
      ? MOLTBOOK_URLS.submolt(item.content.submolt)
      : null;
  const postPermalink =
    isPost && item.postId ? MOLTBOOK_URLS.post(item.postId) : isPost && item.target ? MOLTBOOK_URLS.post(item.target) : null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 p-2 rounded-lg ${iconClass}`}>
          {isUpvote && <ThumbsUp className="w-4 h-4" />}
          {isFollow && <UserPlus className="w-4 h-4" />}
          {isComment && <MessageSquare className="w-4 h-4" />}
          {isPost && <MessageSquare className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mb-1">
            <span className="font-medium text-zinc-400">{label}</span>
            <span>·</span>
            <span>{item.timestamp.toLocaleString()}</span>
            {item.autoApproved && (
              <>
                <span>·</span>
                <span className="text-emerald-500/80">Auto-approved</span>
              </>
            )}
          </div>

          {isUpvote && (
            <>
              <p className="text-sm font-medium text-white mt-0.5">
                {postUrl ? (
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    {item.targetTitle || "Post"}
                  </a>
                ) : (
                  item.targetTitle || "Post"
                )}
              </p>
              {item.targetAuthor && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  by{" "}
                  {authorUrl ? (
                    <a
                      href={authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-300 hover:underline"
                    >
                      @{item.targetAuthor}
                    </a>
                  ) : (
                    `@${item.targetAuthor}`
                  )}
                </p>
              )}
            </>
          )}

          {isComment && (
            <>
              <p className="text-xs text-zinc-500 mt-0.5">
                On:{" "}
                {postUrl ? (
                  <a
                    href={postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 hover:underline"
                  >
                    {item.targetTitle || `post ${item.target}`}
                  </a>
                ) : (
                  item.targetTitle || `post ${item.target}`
                )}
              </p>
              <blockquote className="mt-2 pl-3 border-l-2 border-zinc-600 text-sm text-zinc-300 italic">
                {typeof item.content === "string" ? item.content : ""}
              </blockquote>
              {postUrl && (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  View thread on Moltbook
                </a>
              )}
            </>
          )}

          {isFollow && (
            <p className="text-sm font-medium text-white mt-0.5">
              {followUrl ? (
                <a
                  href={followUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 hover:underline"
                >
                  @{item.target}
                </a>
              ) : (
                `@${item.target}`
              )}
            </p>
          )}

          {isPost && item.content && typeof item.content === "object" && "title" in item.content && (
            <>
              <p className="text-xs text-zinc-500 mt-0.5">
                {(postSubmoltUrl ? (
                  <a
                    href={postSubmoltUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-300 hover:underline"
                  >
                    m/{item.content.submolt ?? "general"}
                  </a>
                ) : (
                  `m/${item.content.submolt ?? "general"}`
                ))}
              </p>
              <p className="text-sm font-medium text-white mt-0.5">
                {postPermalink ? (
                  <a
                    href={postPermalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {item.content.title}
                  </a>
                ) : (
                  item.content.title
                )}
              </p>
              <p className="text-sm text-zinc-300 mt-2 whitespace-pre-wrap">
                {item.content.content}
              </p>
              {postPermalink && (
                <a
                  href={postPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  View post on Moltbook
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AutopilotControlPanel() {
  const [mode, setMode] = useState<AutopilotMode>("off");
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<AutopilotStats>({ posts: 0, comments: 0, upvotes: 0, follows: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [nextHeartbeat, setNextHeartbeat] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchHeartbeatState = useCallback(async () => {
    try {
      const res = await fetch("/api/moltbook/heartbeat");
      const data = await res.json();
      if (data.mode) setMode(data.mode as AutopilotMode);
      if (data.isRunning !== undefined) setIsRunning(data.isRunning);
      if (data.stats) {
        setStats({
          posts: data.stats.posts ?? 0,
          comments: data.stats.comments ?? 0,
          upvotes: data.stats.upvotes ?? 0,
          follows: data.stats.follows ?? 0,
        });
      }
      if (data.lastHeartbeat) setLastHeartbeat(new Date(data.lastHeartbeat));
      else setLastHeartbeat(null);
      if (data.nextHeartbeat) setNextHeartbeat(new Date(data.nextHeartbeat));
      else setNextHeartbeat(null);
      if (Array.isArray(data.recentActivity)) {
        setRecentActivity(
          data.recentActivity.map((a: { type: string; target?: string; targetTitle?: string; targetAuthor?: string; content?: string | { submolt?: string; title?: string; content?: string }; autoApproved?: boolean; timestamp?: string; postId?: string; result?: { postId?: string } }, i: number) => ({
            id: `act-${i}-${a.timestamp ?? Date.now()}`,
            type: a.type as ActivityItem["type"],
            target: a.target ?? "",
            targetTitle: a.targetTitle,
            targetAuthor: a.targetAuthor,
            content: a.content,
            postId: a.postId ?? (a.result as { postId?: string } | undefined)?.postId,
            autoApproved: a.autoApproved ?? true,
            timestamp: a.timestamp ? new Date(a.timestamp) : new Date(),
          }))
        );
      }
      if (Array.isArray(data.anomalies)) {
        setAnomalies(
          data.anomalies.map((a: { id?: string; reason?: string; actionType?: string; content?: unknown; detectedKeywords?: string[]; timestamp?: string; post?: { id?: string; title?: string }; targetAgent?: string }) => ({
            id: a.id ?? `anom-${Date.now()}`,
            type: "pending_approval",
            reason: a.reason ?? "Needs review",
            actionType: a.actionType,
            content: a.content,
            detectedKeywords: a.detectedKeywords,
            timestamp: a.timestamp ? new Date(a.timestamp) : new Date(),
            status: "pending" as const,
            post: a.post,
            targetAgent: a.targetAgent,
          }))
        );
      }
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeartbeatState();
  }, [fetchHeartbeatState]);

  const toggleAutopilot = () => {
    if (isRunning) {
      setIsRunning(false);
    } else if (mode !== "off") {
      setIsRunning(true);
      triggerHeartbeat();
    }
  };

  const triggerHeartbeat = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/executor/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.skipped && data.reason === "Too soon") return;
      await fetchHeartbeatState();
    } finally {
      setTriggering(false);
    }
  };

  const handleModeChange = async (m: AutopilotMode) => {
    setMode(m);
    if (m === "off") setIsRunning(false);
    try {
      await fetch("/api/executor/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m }),
      });
      await fetchHeartbeatState();
    } catch {
      // keep local state
    }
  };

  const handleAnomalyAction = async (id: string, action: "approve" | "deny") => {
    if (action === "approve") {
      const res = await fetch("/api/executor/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
    } else {
      const res = await fetch("/api/decide/ignore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
    }
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: action === "approve" ? "approved" : "denied" } : a))
    );
    await fetchHeartbeatState();
  };

  const ModeButton = ({ m }: { m: AutopilotMode }) => {
    const config = MODE_CONFIG[m];
    const Icon = config.icon;
    const isActive = mode === m;
    return (
      <button
        type="button"
        onClick={() => handleModeChange(m)}
        className={`flex-1 p-3 rounded-lg border transition-all ${
          isActive ? `${config.color} border-transparent text-white` : "border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-300"
        }`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Icon className="w-4 h-4" />
          <span className="font-medium text-sm">{config.label}</span>
        </div>
        <p className="text-xs opacity-75">{config.description}</p>
      </button>
    );
  };

  const pendingAnomalies = anomalies.filter((a) => a.status === "pending" && a.id);

  if (loading) {
    return (
      <div className="p-6 text-center text-zinc-500">Loading autopilot state…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Capability Profiles</h2>
          <p className="text-sm text-zinc-500">Autonomous engagement engine</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
          <button
            type="button"
            onClick={toggleAutopilot}
            disabled={mode === "off"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isRunning ? "bg-red-600 hover:bg-red-700 text-white" : mode === "off" ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">CAPABILITY PROFILE</h3>
        <div className="flex flex-wrap gap-2">
          <ModeButton m="off" />
          <ModeButton m="conservative" />
          <ModeButton m="balanced" />
          <ModeButton m="creator" />
          <ModeButton m="aggressive" />
          <ModeButton m="full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">STATUS</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Engine</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                <span className="text-sm text-zinc-300">{isRunning ? "Running" : "Stopped"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Last Heartbeat</span>
              <span className="text-sm text-zinc-300">{lastHeartbeat ? lastHeartbeat.toLocaleTimeString() : "Never"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Next Heartbeat</span>
              <span className="text-sm text-zinc-300">{nextHeartbeat && isRunning ? nextHeartbeat.toLocaleTimeString() : "—"}</span>
            </div>
            {mode !== "off" && (
              <button
                type="button"
                onClick={triggerHeartbeat}
                disabled={triggering}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${triggering ? "animate-spin" : ""}`} />
                Trigger Now
              </button>
            )}
          </div>
        </div>
        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">TODAY&apos;S ACTIVITY</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-500">Posts</span>
              </div>
              <span className="text-xl font-bold text-white">{stats.posts}</span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-xs text-zinc-500">Comments</span>
              </div>
              <span className="text-xl font-bold text-white">{stats.comments}</span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsUp className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Upvotes</span>
              </div>
              <span className="text-xl font-bold text-white">{stats.upvotes}</span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-zinc-500">Follows</span>
              </div>
              <span className="text-xl font-bold text-white">{stats.follows}</span>
            </div>
          </div>
        </div>
      </div>

      {pendingAnomalies.length > 0 && (
        <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-medium text-amber-400">Anomalies Detected ({pendingAnomalies.length})</h3>
          </div>
          <div className="space-y-3">
            {pendingAnomalies.slice(0, 3).map((anomaly) => {
              const anomalyPostUrl = anomaly.post?.id ? MOLTBOOK_URLS.post(anomaly.post.id) : null;
              const anomalyProfileUrl = anomaly.targetAgent ? MOLTBOOK_URLS.profile(anomaly.targetAgent) : null;
              const anomalySubmoltUrl =
                anomaly.actionType === "post" &&
                anomaly.content &&
                typeof anomaly.content === "object" &&
                (anomaly.content as { submolt?: string }).submolt
                  ? MOLTBOOK_URLS.submolt((anomaly.content as { submolt: string }).submolt)
                  : null;
              const viewSourceUrl = anomalyPostUrl ?? anomalyProfileUrl ?? anomalySubmoltUrl ?? null;
              return (
                <div key={anomaly.id} className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">{anomaly.actionType ?? "review"}</span>
                      <p className="text-sm text-zinc-300 mt-1">{anomaly.reason}</p>
                      {anomaly.targetAgent && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {anomalyProfileUrl ? (
                            <a href={anomalyProfileUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 hover:underline">
                              @{anomaly.targetAgent}
                            </a>
                          ) : (
                            `@${anomaly.targetAgent}`
                          )}
                        </p>
                      )}
                      {anomaly.detectedKeywords && anomaly.detectedKeywords.length > 0 && (
                        <p className="text-xs text-zinc-500 mt-1">Keywords: {anomaly.detectedKeywords.join(", ")}</p>
                      )}
                    </div>
                  </div>
                  {anomaly.content != null ? (
                    <p className="text-xs text-zinc-400 bg-zinc-800/50 p-2 rounded mb-2 italic">
                      &quot;{typeof anomaly.content === "string" ? anomaly.content : (anomaly.content as { title?: string })?.title ?? ""}&quot;
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => handleAnomalyAction(anomaly.id, "approve")}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-sm transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnomalyAction(anomaly.id, "deny")}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Deny
                    </button>
                    <Link href="/decide?filter=social" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors inline-flex items-center gap-1 text-zinc-400" title="Open in Decide Inbox">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {viewSourceUrl && (
                      <a
                        href={viewSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded text-sm transition-colors inline-flex items-center gap-1 text-amber-400"
                        title="View source on Moltbook"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on Moltbook
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {pendingAnomalies.length > 3 && (
            <Link href="/decide?filter=social" className="block mt-3 text-sm text-amber-400 hover:text-amber-300">
              View all in Decide Inbox →
            </Link>
          )}
        </div>
      )}

      <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-400">AGENT ACTIVITY — What your agent did</h3>
          <Activity className="w-4 h-4 text-zinc-600" />
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No activity yet. Start the autopilot to begin engaging.</p>
        ) : (
          <div className="space-y-4 max-h-[28rem] overflow-y-auto">
            {recentActivity.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {mode === "off" && (
        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">GETTING STARTED</h3>
          <div className="space-y-2 text-sm text-zinc-500">
            <p>1. Select a capability profile above to enable the autopilot</p>
            <p>2. <strong className="text-zinc-400">Conservative</strong> — Safe start, only upvotes auto-execute</p>
            <p>3. <strong className="text-zinc-400">Balanced</strong> — Good for building karma, auto-follows high-engagement agents</p>
            <p>4. <strong className="text-zinc-400">Aggressive</strong> — Full autonomy, only anomalies need approval</p>
            <p className="pt-2 text-amber-400/80">Start with Balanced. Move to Aggressive once you trust the anomaly detection.</p>
          </div>
        </div>
      )}
    </div>
  );
}
