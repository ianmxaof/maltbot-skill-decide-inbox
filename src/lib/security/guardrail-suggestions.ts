/**
 * Learning loop: suggest guardrails from persisted activity (operation_blocked, operation_approved, etc.).
 * Surface in dashboard; Apply updates operation overrides or anomaly detector safe lists.
 */

import type { TypedActivityEntry } from "@/lib/persistence/activity-store";
import { getActivityStore } from "@/lib/persistence";
import { getAnomalyDetector } from "./anomaly-detector";
import { addOperationOverride, type OperationOverride } from "./operation-overrides";
import { getOperatorId } from "@/lib/operator";

export interface SuggestedRule {
  id: string;
  type: "allowlist" | "trust";
  description: string;
  /** Payload for apply (path for allowlist, target/operation for trust). */
  payload: { path?: string; target?: string; operation?: string };
}

const BLOCKED_THRESHOLD = 5;
const APPROVED_THRESHOLD = 5;

/**
 * Analyze typed activity entries and return suggested rules (e.g. add path to safe list, auto-approve agent).
 */
export function suggestGuardrails(entries: TypedActivityEntry[]): SuggestedRule[] {
  const suggestions: SuggestedRule[] = [];
  const seen = new Set<string>();

  const blockedByTarget = new Map<string, number>();
  const approvedByTarget = new Map<string, number>();
  const blockedByOperation = new Map<string, Map<string, number>>();

  for (const e of entries) {
    if (e.type === "operation_blocked") {
      const key = `${e.operation}\t${e.target}`;
      blockedByTarget.set(key, (blockedByTarget.get(key) ?? 0) + 1);
      if (!blockedByOperation.has(e.operation)) {
        blockedByOperation.set(e.operation, new Map());
      }
      const opTargets = blockedByOperation.get(e.operation)!;
      opTargets.set(e.target, (opTargets.get(e.target) ?? 0) + 1);
    } else if (e.type === "operation_approved") {
      const key = e.target ? `${e.operation}\t${e.target}` : e.operation;
      approvedByTarget.set(key, (approvedByTarget.get(key) ?? 0) + 1);
    }
  }

  // Repeatedly blocked same path/target -> suggest allowlist (for file paths) or override allow (for operations)
  for (const [key, count] of Array.from(blockedByTarget.entries())) {
    if (count < BLOCKED_THRESHOLD) continue;
    const [operation, target] = key.split("\t");
    const targetStr = target ?? "";
    const suggestionId = `allow-${key.replace(/\t/g, "_").replace(/[^a-zA-Z0-9_]/g, "_")}`;
    if (seen.has(suggestionId)) continue;
    seen.add(suggestionId);
    if (operation?.includes("file") || targetStr.startsWith("/")) {
      suggestions.push({
        id: suggestionId,
        type: "allowlist",
        description: `Agent frequently accessed "${targetStr}" (blocked ${count} times). Add to safe paths?`,
        payload: { path: targetStr },
      });
    } else {
      suggestions.push({
        id: suggestionId,
        type: "trust",
        description: `Operation "${operation}" on "${targetStr}" blocked ${count} times. Always allow for this target?`,
        payload: { operation: operation ?? "", target: targetStr },
      });
    }
  }

  // Frequent interaction with same target -> suggest auto-approve (trust)
  for (const [key, count] of Array.from(approvedByTarget.entries())) {
    if (count < APPROVED_THRESHOLD) continue;
    const parts = key.split("\t");
    const operation = parts[0];
    const targetStr = parts.length > 1 ? parts.slice(1).join("\t") : "";
    if (!targetStr) continue;
    const suggestionId = `trust-${key.replace(/\t/g, "_").replace(/[^a-zA-Z0-9_]/g, "_")}`;
    if (seen.has(suggestionId)) continue;
    seen.add(suggestionId);
    suggestions.push({
      id: suggestionId,
      type: "trust",
      description: `You frequently engage with "${targetStr}" (${count} approvals). Auto-approve interactions?`,
      payload: { operation, target: targetStr },
    });
  }

  return suggestions;
}

/**
 * Fetch recent activity and return suggested rules (e.g. last 24h).
 */
export async function getSuggestedGuardrails(hoursBack: number = 24): Promise<SuggestedRule[]> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const entries = await getActivityStore().query({ since, limit: 5000 });
  return suggestGuardrails(entries);
}

/**
 * Apply a suggested rule by id or by payload (updates detector safe list or operation overrides).
 */
export async function applySuggestedRule(suggestion: SuggestedRule): Promise<void> {
  if (suggestion.type === "allowlist" && suggestion.payload.path) {
    getAnomalyDetector().addKnownPath(suggestion.payload.path);
    return;
  }
  if (suggestion.type === "trust" && suggestion.payload.operation) {
    const override: OperationOverride = {
      operation: suggestion.payload.operation,
      target: suggestion.payload.target,
      action: "allow",
      reason: `Applied from suggestion: ${suggestion.description}`,
      operatorId: getOperatorId(),
      visibility: "private",
    };
    await addOperationOverride(override);
  }
}
