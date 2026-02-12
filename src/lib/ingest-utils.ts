// src/lib/ingest-utils.ts
// Pure helper functions extracted from the ingest route for testability.

import type { IngestItem, IngestItemType } from "@/types/worker";
import type { NetworkActivityType } from "@/types/social";

/**
 * Decide whether an ingested item should land in the Decide Inbox.
 * Routing rules: critical/high urgency, high confidence, medium+confident,
 * escalation suggestion, or threat/bug type.
 */
export function shouldRouteToDecideInbox(item: IngestItem): boolean {
  if (item.urgency === "critical" || item.urgency === "high") return true;
  if (item.confidence >= 0.7) return true;
  if (item.urgency === "medium" && item.confidence >= 0.5) return true;
  if (item.suggestedAction === "escalate") return true;
  if (item.type === "threat" || item.type === "bug") return true;
  return false;
}

/**
 * Map an ingest item type to a network activity type for the social feed.
 */
export function mapIngestTypeToActivityType(type: IngestItemType): NetworkActivityType {
  switch (type) {
    case "opportunity":
    case "collaboration":
      return "signal";
    case "threat":
    case "bug":
      return "agent_action";
    case "release":
    case "trend":
      return "context_change";
    case "discussion":
    case "content_idea":
    case "competitor":
      return "signal";
    default:
      return "agent_action";
  }
}

/**
 * Build a human-readable activity summary string for an ingested item.
 */
export function buildActivitySummary(item: IngestItem): string {
  const actionVerb: Record<string, string> = {
    opportunity: "Discovered opportunity",
    threat: "Flagged threat",
    trend: "Detected trend",
    discussion: "Found discussion",
    release: "Noticed release",
    bug: "Detected vulnerability",
    content_idea: "Found content inspiration",
    competitor: "Spotted competitive signal",
    collaboration: "Found collaboration opportunity",
  };
  return `${actionVerb[item.type] ?? "Surfaced item"}: ${item.title}`;
}
