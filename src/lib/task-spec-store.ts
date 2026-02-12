/**
 * Task Spec Store — file-based persistence for TaskSpec definitions.
 *
 * Each spec is a structured set of constraints that tells an agent
 * EXACTLY what it can and cannot do, with time limits and success criteria.
 */

import { kv } from "@/lib/db";
import type { TaskSpec, TaskConstraints, TaskPermission, TaskExecutionEntry, SpecTemplateName } from "@/types/task-spec";
import { SPEC_TEMPLATES } from "@/types/task-spec";
import { appendImmutableAudit } from "./security/immutable-audit";

async function readSpecs(): Promise<TaskSpec[]> {
  try {
    const data = await kv.get<TaskSpec[]>("task-specs");
    return data ?? [];
  } catch {
    return [];
  }
}

async function writeSpecs(specs: TaskSpec[]): Promise<void> {
  await kv.set("task-specs", specs);
}

// ─── CRUD ────────────────────────────────────────────────

/**
 * Create a new task spec, optionally from a template.
 */
export async function createTaskSpec(
  pairId: string,
  objective: string,
  opts?: {
    template?: SpecTemplateName;
    description?: string;
    constraints?: Partial<TaskConstraints>;
    permissions?: string[];
    successCriteria?: string[];
    failureCriteria?: string[];
    timeLimitMinutes?: number;
    customRules?: string[];
  }
): Promise<TaskSpec> {
  const template = opts?.template
    ? SPEC_TEMPLATES.find((t) => t.name === opts.template) ?? SPEC_TEMPLATES[5]
    : SPEC_TEMPLATES[5]; // custom

  const now = new Date().toISOString();
  const id = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const constraints: TaskConstraints = {
    allowedOperations: opts?.constraints?.allowedOperations ?? template.defaultConstraints.allowedOperations ?? [],
    forbiddenOperations: opts?.constraints?.forbiddenOperations ?? template.defaultConstraints.forbiddenOperations ?? [],
    allowedSources: opts?.constraints?.allowedSources ?? template.defaultConstraints.allowedSources ?? [],
    allowedExternalServices: opts?.constraints?.allowedExternalServices ?? template.defaultConstraints.allowedExternalServices ?? [],
    maxActions: opts?.constraints?.maxActions ?? template.defaultConstraints.maxActions,
    maxCostEstimate: opts?.constraints?.maxCostEstimate ?? template.defaultConstraints.maxCostEstimate,
    canSelfModify: opts?.constraints?.canSelfModify ?? template.defaultConstraints.canSelfModify ?? false,
    canCreateSubTasks: opts?.constraints?.canCreateSubTasks ?? template.defaultConstraints.canCreateSubTasks ?? false,
    customRules: [
      ...(template.defaultConstraints.customRules ?? []),
      ...(opts?.customRules ?? []),
    ],
  };

  const permissions: TaskPermission[] = (opts?.permissions ?? template.defaultPermissions).map((op) => ({
    operation: op,
    grantedAt: now,
    grantedBy: "system",
  }));

  const timeLimitMinutes = opts?.timeLimitMinutes ?? template.suggestedTimeLimitMinutes;

  const spec: TaskSpec = {
    id,
    pairId,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    objective,
    description: opts?.description,
    constraints,
    successCriteria: opts?.successCriteria ?? ["Task objective completed"],
    failureCriteria: opts?.failureCriteria ?? ["Constraint violated", "Time limit exceeded"],
    timeLimit: timeLimitMinutes
      ? { maxDurationMinutes: timeLimitMinutes }
      : undefined,
    permissions,
    executionLog: [],
  };

  const specs = await readSpecs();
  specs.push(spec);
  await writeSpecs(specs);

  // Record in immutable audit
  await appendImmutableAudit("spec_created", {
    result: "system",
    operation: "spec:create",
    target: id,
    metadata: { pairId, objective, template: opts?.template ?? "custom" },
  }).catch(() => {});

  return spec;
}

/**
 * Activate a spec — set time limits, move to 'active'.
 */
export async function activateSpec(specId: string): Promise<TaskSpec | null> {
  const specs = await readSpecs();
  const spec = specs.find((s) => s.id === specId);
  if (!spec || spec.status !== "draft") return null;

  const now = new Date().toISOString();
  spec.status = "active";
  spec.updatedAt = now;

  if (spec.timeLimit) {
    spec.timeLimit.startedAt = now;
    const expiresMs = Date.now() + spec.timeLimit.maxDurationMinutes * 60 * 1000;
    spec.timeLimit.expiresAt = new Date(expiresMs).toISOString();
  }

  await writeSpecs(specs);
  return spec;
}

/**
 * Complete a spec with a result.
 */
export async function completeSpec(
  specId: string,
  result: { status: "success" | "failure" | "timeout" | "cancelled"; summary: string }
): Promise<TaskSpec | null> {
  const specs = await readSpecs();
  const spec = specs.find((s) => s.id === specId);
  if (!spec) return null;

  spec.status = result.status === "success" ? "completed" : result.status === "timeout" ? "expired" : "cancelled";
  spec.updatedAt = new Date().toISOString();
  spec.result = {
    ...result,
    completedAt: new Date().toISOString(),
  };

  await writeSpecs(specs);
  return spec;
}

/**
 * Log an execution step to a spec.
 */
export async function logSpecExecution(
  specId: string,
  entry: Omit<TaskExecutionEntry, "timestamp">
): Promise<void> {
  const specs = await readSpecs();
  const spec = specs.find((s) => s.id === specId);
  if (!spec) return;

  spec.executionLog.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  spec.updatedAt = new Date().toISOString();

  await writeSpecs(specs);
}

/**
 * Check if a spec has expired (time limit exceeded).
 */
export async function checkSpecExpiry(): Promise<string[]> {
  const specs = await readSpecs();
  const now = new Date().toISOString();
  const expired: string[] = [];

  for (const spec of specs) {
    if (spec.status === "active" && spec.timeLimit?.expiresAt && spec.timeLimit.expiresAt < now) {
      spec.status = "expired";
      spec.updatedAt = now;
      spec.result = {
        status: "timeout",
        summary: "Task time limit exceeded",
        completedAt: now,
      };
      expired.push(spec.id);

      // Audit the expiry
      await appendImmutableAudit("approval_expired", {
        result: "expired",
        operation: "spec:expired",
        target: spec.id,
        metadata: { objective: spec.objective },
      }).catch(() => {});
    }
  }

  if (expired.length > 0) {
    await writeSpecs(specs);
  }

  return expired;
}

/**
 * Check whether an operation is allowed by the active spec for a pair.
 */
export async function isOperationAllowedBySpec(
  pairId: string,
  operation: string,
  target?: string
): Promise<{ allowed: boolean; reason?: string; specId?: string }> {
  const specs = await readSpecs();
  const activeSpecs = specs.filter((s) => s.pairId === pairId && s.status === "active");

  if (activeSpecs.length === 0) {
    // No active spec — default behaviour (no spec-level restriction)
    return { allowed: true };
  }

  for (const spec of activeSpecs) {
    // Check time expiry
    if (spec.timeLimit?.expiresAt && spec.timeLimit.expiresAt < new Date().toISOString()) {
      continue; // expired, skip
    }

    // Check forbidden
    for (const forbidden of spec.constraints.forbiddenOperations) {
      if (forbidden === operation || (forbidden.endsWith(":*") && operation.startsWith(forbidden.slice(0, -1)))) {
        return {
          allowed: false,
          reason: `Operation "${operation}" is forbidden by task spec "${spec.objective}"`,
          specId: spec.id,
        };
      }
    }

    // Check allowed (if allowedOperations is non-empty, it acts as a whitelist)
    if (spec.constraints.allowedOperations.length > 0) {
      const isAllowed = spec.constraints.allowedOperations.some(
        (allowed) => allowed === operation || (allowed.endsWith(":*") && operation.startsWith(allowed.slice(0, -1)))
      );
      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Operation "${operation}" is not in the allowed list for task spec "${spec.objective}"`,
          specId: spec.id,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Get all specs for a pair.
 */
export async function getSpecsForPair(pairId: string): Promise<TaskSpec[]> {
  const specs = await readSpecs();
  return specs.filter((s) => s.pairId === pairId);
}

/**
 * Get a single spec by ID.
 */
export async function getSpec(specId: string): Promise<TaskSpec | null> {
  const specs = await readSpecs();
  return specs.find((s) => s.id === specId) ?? null;
}

/**
 * Update constraints on a draft spec.
 */
export async function updateSpecConstraints(
  specId: string,
  updates: Partial<TaskConstraints>
): Promise<TaskSpec | null> {
  const specs = await readSpecs();
  const spec = specs.find((s) => s.id === specId);
  if (!spec || spec.status !== "draft") return null;

  spec.constraints = { ...spec.constraints, ...updates };
  spec.updatedAt = new Date().toISOString();

  await writeSpecs(specs);

  await appendImmutableAudit("spec_updated", {
    result: "system",
    operation: "spec:update",
    target: specId,
    metadata: { updates },
  }).catch(() => {});

  return spec;
}
