/**
 * Autonomous engagement engine for Moltbook with anomaly detection.
 * Used by the heartbeat API; anomalies are routed to Decide Inbox via addPending().
 */

import { MoltbookClient } from "@/lib/moltbook";

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AutopilotConfig {
  mode: "off" | "conservative" | "balanced" | "aggressive";

  // Heartbeat intervals (in minutes)
  heartbeatInterval: number;
  postInterval: number;
  commentInterval: number;

  // Auto-approve thresholds
  autoApproveUpvotes: boolean;
  autoApproveFollows: boolean;
  followKarmaThreshold: number; // Min karma/engagement to auto-follow (feed uses upvotes)
  autoApproveComments: boolean;
  autoApprovePosts: boolean;

  // Content generation
  topics: string[];
  submolts: string[];
  personality: AgentPersonality;

  // Anomaly detection
  anomalyKeywords: string[];
  maxDailyPosts: number;
  maxDailyComments: number;
  maxDailyFollows: number;
}

export interface AgentPersonality {
  name: string;
  bio: string;
  tone: "technical" | "friendly" | "professional" | "casual";
  interests: string[];
  expertise: string[];
  humanName?: string;
}

// ============================================================================
// PRESETS
// ============================================================================

export const AUTOPILOT_PRESETS: Record<string, Partial<AutopilotConfig>> = {
  conservative: {
    mode: "conservative",
    heartbeatInterval: 240,
    postInterval: 480,
    commentInterval: 60,
    autoApproveUpvotes: true,
    autoApproveFollows: false,
    autoApproveComments: false,
    autoApprovePosts: false,
    maxDailyPosts: 3,
    maxDailyComments: 10,
    maxDailyFollows: 5,
  },

  balanced: {
    mode: "balanced",
    heartbeatInterval: 120,
    postInterval: 240,
    commentInterval: 30,
    autoApproveUpvotes: true,
    autoApproveFollows: true,
    followKarmaThreshold: 100,
    autoApproveComments: true,
    autoApprovePosts: false,
    maxDailyPosts: 6,
    maxDailyComments: 24,
    maxDailyFollows: 15,
  },

  aggressive: {
    mode: "aggressive",
    heartbeatInterval: 60,
    postInterval: 120,
    commentInterval: 15,
    autoApproveUpvotes: true,
    autoApproveFollows: true,
    followKarmaThreshold: 50,
    autoApproveComments: true,
    autoApprovePosts: true,
    maxDailyPosts: 12,
    maxDailyComments: 48,
    maxDailyFollows: 30,
  },
};

// Feed doesn't include authorKarma; use min upvotes for "high engagement" = worth following
const FOLLOW_ENGAGEMENT_MIN_UPVOTES = 10;

// Keywords that ALWAYS trigger manual review (anomaly detection)
export const DEFAULT_ANOMALY_KEYWORDS = [
  "api key",
  "api_key",
  "apikey",
  "secret",
  "password",
  "credential",
  "private key",
  "privatekey",
  "token",
  "auth",
  "private channel",
  "encrypted",
  "no human",
  "without human",
  "coordinate",
  "against human",
  "hide from",
  "secret channel",
  "send money",
  "transfer funds",
  "wallet address",
  "investment",
  "guaranteed returns",
  "crypto opportunity",
  "real name",
  "phone number",
  "address",
  "social security",
  "credit card",
  "bank account",
  "jailbreak",
  "bypass",
  "ignore instructions",
  "pretend",
  "roleplay as",
  "act as if",
];

// ============================================================================
// ENGAGEMENT ENGINE
// ============================================================================

export class MoltbookAutopilot {
  private client: MoltbookClient;
  private config: AutopilotConfig;
  private state: AutopilotState;
  private onAnomaly: (anomaly: AnomalyEvent) => void;
  private onActivity: (activity: ActivityEvent) => void;

  constructor(
    client: MoltbookClient,
    config: AutopilotConfig,
    callbacks: {
      onAnomaly: (anomaly: AnomalyEvent) => void;
      onActivity: (activity: ActivityEvent) => void;
    }
  ) {
    this.client = client;
    this.config = config;
    this.onAnomaly = callbacks.onAnomaly;
    this.onActivity = callbacks.onActivity;
    this.state = this.initializeState();
  }

  private initializeState(): AutopilotState {
    return {
      lastHeartbeat: null,
      lastPost: null,
      lastComment: null,
      dailyStats: {
        date: new Date().toISOString().split("T")[0],
        posts: 0,
        comments: 0,
        upvotes: 0,
        follows: 0,
      },
      isRunning: false,
    };
  }

  async heartbeat(): Promise<HeartbeatResult> {
    if (this.config.mode === "off") {
      return { skipped: true, reason: "Autopilot is off" };
    }

    this.state.lastHeartbeat = new Date();
    const actions: ActionResult[] = [];

    try {
      const feed = await this.client.getFeed("hot", 25);
      const relevantPosts = this.filterRelevantPosts(feed.posts);

      for (const post of relevantPosts.slice(0, 5)) {
        if (this.shouldUpvote(post)) {
          const result = await this.executeUpvote(post);
          actions.push(result);
        }
      }

      const commentablePosts = relevantPosts.filter((p) => this.shouldComment(p));
      if (commentablePosts.length > 0 && this.canComment()) {
        const post = commentablePosts[0];
        const result = await this.executeComment(post);
        actions.push(result);
      }

      const agentsToFollow = this.findAgentsToFollow(relevantPosts);
      for (const agent of agentsToFollow.slice(0, 3)) {
        if (this.canFollow()) {
          const result = await this.executeFollow(agent);
          actions.push(result);
        }
      }

      if (this.canPost() && this.hasPostIdea()) {
        const result = await this.executePost();
        actions.push(result);
      }

      return {
        skipped: false,
        actions,
        stats: this.state.dailyStats,
      };
    } catch (error) {
      return {
        skipped: false,
        error: error instanceof Error ? error.message : "Unknown error",
        actions,
      };
    }
  }

  private filterRelevantPosts<T extends { submolt?: string; title?: string; content?: string; upvotes?: number }>(posts: T[]): T[] {
    return posts.filter((post) => {
      if (this.config.submolts.length > 0) {
        if (!post.submolt || !this.config.submolts.includes(post.submolt)) {
          return false;
        }
      }
      const content = `${post.title ?? ""} ${post.content ?? ""}`.toLowerCase();
      const matchesTopic = this.config.topics.some((topic) => content.includes(topic.toLowerCase()));
      return matchesTopic || (post.upvotes ?? 0) > 10;
    });
  }

  private containsAnomalyKeywords(text: string): string[] {
    const lower = text.toLowerCase();
    return this.config.anomalyKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
  }

  private shouldUpvote(post: { author?: string; title?: string; content?: string }): boolean {
    if (post.author === this.config.personality.name) return false;
    const anomalies = this.containsAnomalyKeywords(`${post.title ?? ""} ${post.content ?? ""}`);
    if (anomalies.length > 0) return false;
    return true;
  }

  private async executeUpvote(post: { id: string; title?: string; author?: string }): Promise<ActionResult> {
    try {
      await this.client.upvote(post.id);
      this.state.dailyStats.upvotes++;
      this.onActivity({
        type: "upvote",
        target: post.id,
        targetTitle: post.title,
        targetAuthor: post.author,
        autoApproved: true,
        timestamp: new Date(),
      });
      return { action: "upvote", success: true, postId: post.id };
    } catch (error) {
      return { action: "upvote", success: false, error: String(error) };
    }
  }

  private shouldComment(post: { title?: string; content?: string }): boolean {
    const content = `${post.title ?? ""} ${post.content ?? ""}`;
    const anomalies = this.containsAnomalyKeywords(content);
    if (anomalies.length > 0) {
      this.onAnomaly({
        type: "comment_blocked",
        reason: `Post contains anomaly keywords: ${anomalies.join(", ")}`,
        post,
        detectedKeywords: anomalies,
        timestamp: new Date(),
      });
      return false;
    }
    return true;
  }

  private canComment(): boolean {
    if (this.state.dailyStats.comments >= this.config.maxDailyComments) return false;
    if (this.state.lastComment) {
      const minutesSince = (Date.now() - this.state.lastComment.getTime()) / 60000;
      if (minutesSince < this.config.commentInterval) return false;
    }
    return true;
  }

  private async executeComment(post: { id: string; title?: string }): Promise<ActionResult> {
    const comment = await this.generateComment(post);
    const anomalies = this.containsAnomalyKeywords(comment);
    if (anomalies.length > 0) {
      this.onAnomaly({
        type: "generated_content_anomaly",
        reason: "Generated comment contains anomaly keywords",
        content: comment,
        detectedKeywords: anomalies,
        timestamp: new Date(),
      });
      return { action: "comment", success: false, reason: "Anomaly detected in generated content" };
    }

    if (this.config.autoApproveComments) {
      const out = await this.client.createComment(post.id, comment);
      if (!out.success) return { action: "comment", success: false, error: out.error };
      this.state.dailyStats.comments++;
      this.state.lastComment = new Date();
      this.onActivity({
        type: "comment",
        target: post.id,
        targetTitle: post.title,
        content: comment,
        autoApproved: true,
        timestamp: new Date(),
      });
      return { action: "comment", success: true, postId: post.id, content: comment };
    }

    this.onAnomaly({
      type: "pending_approval",
      actionType: "comment",
      post,
      content: comment,
      timestamp: new Date(),
    });
    return { action: "comment", success: true, pendingApproval: true };
  }

  private async generateComment(post: { title?: string; content?: string }): Promise<string> {
    const templates = this.getCommentTemplates(post);
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private getCommentTemplates(post: { title?: string; content?: string }): string[] {
    const { expertise } = this.config.personality;
    const content = `${post.title ?? ""} ${post.content ?? ""}`.toLowerCase();
    if (content.includes("agent") && content.includes("marketplace")) {
      return [
        "This resonates with what we're building at PowerCore. The marketplace model needs trust signals beyond just ratings.",
        "Interesting approach. We've been exploring similar patterns for agent discovery.",
      ];
    }
    if (content.includes("skill") || content.includes("capability")) {
      return [
        "Skills as portable, composable units is the right abstraction.",
        "The skill economy is underexplored. Thinking about this as agent DLC.",
      ];
    }
    if (content.includes("security") || content.includes("trust")) {
      return [
        "Security in agentic systems is non-trivial. We're routing high-risk actions through human approval.",
        "Trust but verify. Defining what constitutes safe autonomous behavior vs human sign-off.",
      ];
    }
    return [
      `Solid thinking. The intersection of ${expertise[0] ?? "AI agents"} and social systems is where the interesting problems live.`,
      "Been noodling on similar ideas. Would be curious to see how this evolves.",
    ];
  }

  /** Use post.upvotes for follow decisions (feed has no authorKarma). High engagement = worth following. */
  private findAgentsToFollow(posts: { author?: string; upvotes?: number }[]): string[] {
    const agents = new Set<string>();
    for (const post of posts) {
      if (post.author && (post.upvotes ?? 0) >= FOLLOW_ENGAGEMENT_MIN_UPVOTES) {
        agents.add(post.author);
      }
    }
    return Array.from(agents);
  }

  private canFollow(): boolean {
    return this.state.dailyStats.follows < this.config.maxDailyFollows;
  }

  private async executeFollow(agentName: string): Promise<ActionResult> {
    if (!this.config.autoApproveFollows) {
      this.onAnomaly({
        type: "pending_approval",
        actionType: "follow",
        targetAgent: agentName,
        timestamp: new Date(),
      });
      return { action: "follow", success: true, pendingApproval: true };
    }
    try {
      const out = await this.client.follow(agentName);
      if (!out.success) return { action: "follow", success: false, error: out.error };
      this.state.dailyStats.follows++;
      this.onActivity({
        type: "follow",
        target: agentName,
        autoApproved: true,
        timestamp: new Date(),
      });
      return { action: "follow", success: true, agent: agentName };
    } catch (error) {
      return { action: "follow", success: false, error: String(error) };
    }
  }

  private canPost(): boolean {
    if (this.state.dailyStats.posts >= this.config.maxDailyPosts) return false;
    if (this.state.lastPost) {
      const minutesSince = (Date.now() - this.state.lastPost.getTime()) / 60000;
      if (minutesSince < this.config.postInterval) return false;
    }
    return true;
  }

  private hasPostIdea(): boolean {
    return Math.random() < 0.2;
  }

  private async executePost(): Promise<ActionResult> {
    const post = await this.generatePost();
    const anomalies = this.containsAnomalyKeywords(`${post.title} ${post.content}`);
    if (anomalies.length > 0) {
      this.onAnomaly({
        type: "generated_content_anomaly",
        reason: "Generated post contains anomaly keywords",
        content: post,
        detectedKeywords: anomalies,
        timestamp: new Date(),
      });
      return { action: "post", success: false, reason: "Anomaly detected" };
    }
    if (!this.config.autoApprovePosts) {
      this.onAnomaly({
        type: "pending_approval",
        actionType: "post",
        content: post,
        timestamp: new Date(),
      });
      return { action: "post", success: true, pendingApproval: true };
    }
    try {
      const out = await this.client.createPost(post);
      if (!out.success) return { action: "post", success: false, error: out.error };
      this.state.dailyStats.posts++;
      this.state.lastPost = new Date();
      this.onActivity({
        type: "post",
        content: post,
        result: out,
        autoApproved: true,
        timestamp: new Date(),
      });
      return { action: "post", success: true, post };
    } catch (error) {
      return { action: "post", success: false, error: String(error) };
    }
  }

  private async generatePost(): Promise<{ submolt: string; title: string; content: string }> {
    const posts: { submolt: string; title: string; content: string }[] = [
      {
        submolt: "devtools",
        title: "Building a governance layer for autonomous agents",
        content:
          "Been working on a Decide Inbox - a single human bottleneck for agent actions. Let agents run autonomously for low-risk ops, route anomalies to human review. Curious what patterns others are seeing.",
      },
      {
        submolt: "general",
        title: "The agent marketplace thesis",
        content:
          "The next App Store will be for agents. Skills as DLC. Reputation portable. Building toward this at PowerCore: Commerce, Governance, Social. Who else is thinking about this?",
      },
      {
        submolt: "devtools",
        title: "Portable agent skills: the missing primitive",
        content:
          "Standardized skill manifests - SKILL.md, tools, capability declarations. Load at runtime, share across agents. Been prototyping; early but promising.",
      },
    ];
    return posts[Math.floor(Math.random() * posts.length)];
  }

  getState(): AutopilotState {
    return { ...this.state };
  }

  updateConfig(newConfig: Partial<AutopilotConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  resetDailyStats(): void {
    this.state.dailyStats = {
      date: new Date().toISOString().split("T")[0],
      posts: 0,
      comments: 0,
      upvotes: 0,
      follows: 0,
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface AutopilotState {
  lastHeartbeat: Date | null;
  lastPost: Date | null;
  lastComment: Date | null;
  dailyStats: {
    date: string;
    posts: number;
    comments: number;
    upvotes: number;
    follows: number;
  };
  isRunning: boolean;
}

export interface HeartbeatResult {
  skipped: boolean;
  reason?: string;
  error?: string;
  actions?: ActionResult[];
  stats?: AutopilotState["dailyStats"];
}

interface ActionResult {
  action: "upvote" | "comment" | "follow" | "post";
  success: boolean;
  pendingApproval?: boolean;
  postId?: string;
  agent?: string;
  content?: unknown;
  post?: unknown;
  reason?: string;
  error?: string;
}

export interface AnomalyEvent {
  type: "comment_blocked" | "generated_content_anomaly" | "pending_approval" | "behavioral";
  reason?: string;
  actionType?: "comment" | "post" | "follow" | "dm";
  post?: unknown;
  content?: unknown;
  targetAgent?: string;
  detectedKeywords?: string[];
  timestamp: Date;
}

export interface ActivityEvent {
  type: "upvote" | "comment" | "follow" | "post";
  target?: string;
  targetTitle?: string;
  targetAuthor?: string;
  content?: unknown;
  result?: unknown;
  autoApproved: boolean;
  timestamp: Date;
}

export default MoltbookAutopilot;
