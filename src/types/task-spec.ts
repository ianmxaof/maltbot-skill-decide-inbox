/**
 * Task Spec — Structured constraint definitions for agent tasks.
 *
 * From the transcript: "Precision of instruction matters immensely."
 * A TaskSpec defines EXACTLY what an agent can and cannot do for a given task,
 * including boundaries, forbidden actions, success criteria, and time limits.
 */

export interface TaskSpec {
  id: string;
  pairId: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "active" | "completed" | "expired" | "cancelled";

  // What the agent should do
  objective: string;
  description?: string;

  // Boundaries & constraints
  constraints: TaskConstraints;

  // Success / exit criteria
  successCriteria: string[];
  failureCriteria: string[];

  // Time limits
  timeLimit?: {
    maxDurationMinutes: number;
    startedAt?: string;
    expiresAt?: string;
  };

  // Permissions granted for this specific task
  permissions: TaskPermission[];

  // Execution history
  executionLog: TaskExecutionEntry[];

  // Result
  result?: {
    status: "success" | "failure" | "timeout" | "cancelled";
    summary: string;
    completedAt: string;
  };
}

export interface TaskConstraints {
  /** Operations the agent is allowed to perform */
  allowedOperations: string[];
  /** Operations explicitly forbidden */
  forbiddenOperations: string[];
  /** Data sources the agent can read from */
  allowedSources: string[];
  /** External services the agent can call */
  allowedExternalServices: string[];
  /** Maximum number of actions before requiring re-approval */
  maxActions?: number;
  /** Maximum cost in API calls / tokens (soft limit) */
  maxCostEstimate?: number;
  /** Whether the agent can modify its own spec (always false by default) */
  canSelfModify: boolean;
  /** Whether the agent can create sub-tasks */
  canCreateSubTasks: boolean;
  /** Custom constraints (free text, displayed to user) */
  customRules: string[];
}

export interface TaskPermission {
  operation: string;
  target?: string;
  expiresAt?: string;       // ISO 8601 — if set, auto-revokes after this time
  grantedAt: string;
  grantedBy: string;        // userId who approved
}

export interface TaskExecutionEntry {
  timestamp: string;
  action: string;
  result: "success" | "failure" | "blocked";
  detail?: string;
}

/** Predefined spec templates for common task types */
export type SpecTemplateName =
  | "research"
  | "content_creation"
  | "social_posting"
  | "code_review"
  | "monitoring"
  | "custom";

export interface SpecTemplate {
  name: SpecTemplateName;
  label: string;
  description: string;
  defaultConstraints: Partial<TaskConstraints>;
  defaultPermissions: string[];
  suggestedTimeLimitMinutes: number;
}

export const SPEC_TEMPLATES: SpecTemplate[] = [
  {
    name: "research",
    label: "Research Task",
    description: "Agent researches a topic and reports findings",
    defaultConstraints: {
      allowedOperations: ["read:rss", "read:github", "read:web"],
      forbiddenOperations: ["write:*", "execute:*", "credential:*"],
      allowedSources: ["rss", "github", "web"],
      allowedExternalServices: [],
      canSelfModify: false,
      canCreateSubTasks: false,
      customRules: ["Report only — no actions taken"],
    },
    defaultPermissions: ["read:rss", "read:github"],
    suggestedTimeLimitMinutes: 60,
  },
  {
    name: "content_creation",
    label: "Content Creation",
    description: "Agent drafts content for human review",
    defaultConstraints: {
      allowedOperations: ["read:rss", "read:github", "write:draft"],
      forbiddenOperations: ["write:publish", "execute:*", "credential:*"],
      allowedSources: ["rss", "github"],
      allowedExternalServices: [],
      canSelfModify: false,
      canCreateSubTasks: false,
      customRules: ["All content must be reviewed before publishing"],
    },
    defaultPermissions: ["read:rss", "write:draft"],
    suggestedTimeLimitMinutes: 120,
  },
  {
    name: "social_posting",
    label: "Social Posting",
    description: "Agent posts to Moltbook (requires approval per post)",
    defaultConstraints: {
      allowedOperations: ["read:rss", "write:moltbook_post", "write:moltbook_comment"],
      forbiddenOperations: ["write:moltbook_follow", "credential:*", "execute:self_modify"],
      allowedSources: ["rss", "moltbook"],
      allowedExternalServices: ["moltbook"],
      maxActions: 5,
      canSelfModify: false,
      canCreateSubTasks: false,
      customRules: ["Each post requires explicit human approval"],
    },
    defaultPermissions: ["read:rss", "write:moltbook_post"],
    suggestedTimeLimitMinutes: 30,
  },
  {
    name: "code_review",
    label: "Code Review",
    description: "Agent reviews code changes and provides feedback",
    defaultConstraints: {
      allowedOperations: ["read:github", "write:comment"],
      forbiddenOperations: ["write:merge", "write:approve_pr", "execute:*", "credential:*"],
      allowedSources: ["github"],
      allowedExternalServices: ["github"],
      canSelfModify: false,
      canCreateSubTasks: false,
      customRules: ["Review only — cannot merge or approve PRs"],
    },
    defaultPermissions: ["read:github", "write:comment"],
    suggestedTimeLimitMinutes: 45,
  },
  {
    name: "monitoring",
    label: "Monitoring Watch",
    description: "Agent monitors sources and flags items of interest",
    defaultConstraints: {
      allowedOperations: ["read:rss", "read:github", "read:web", "write:notification"],
      forbiddenOperations: ["write:*", "execute:*", "credential:*"],
      allowedSources: ["rss", "github", "web"],
      allowedExternalServices: [],
      canSelfModify: false,
      canCreateSubTasks: false,
      customRules: ["Flag only — no autonomous actions"],
    },
    defaultPermissions: ["read:rss", "read:github", "write:notification"],
    suggestedTimeLimitMinutes: 480,
  },
  {
    name: "custom",
    label: "Custom Task",
    description: "Define custom constraints from scratch",
    defaultConstraints: {
      allowedOperations: [],
      forbiddenOperations: ["execute:self_modify", "credential:export_all"],
      allowedSources: [],
      allowedExternalServices: [],
      canSelfModify: false,
      canCreateSubTasks: false,
      customRules: [],
    },
    defaultPermissions: [],
    suggestedTimeLimitMinutes: 60,
  },
];
