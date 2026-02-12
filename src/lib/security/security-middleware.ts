// src/lib/security/security-middleware.ts
// Security Middleware - Wraps all agent operations with comprehensive security

import { getSanitizer } from "./content-sanitizer";
import { getAnomalyDetector, AnomalyEvent, AnomalyType } from "./anomaly-detector";
import { getVault, CredentialPermission } from "./credential-vault";
import { isSystemHalted } from "@/lib/system-state";
import { checkAwareness } from "@/lib/awareness";
import type { AwarenessResult } from "@/types/governance";
import { getActivityStore, type TypedActivityEntry } from "@/lib/persistence";
import { getOperatorId } from "@/lib/operator";
import { loadOperationOverrides, resolveOverride } from "./operation-overrides";
import { shouldAutoApprove } from "./trust-scoring";
import { analyzeAgentAction, isActionRiskAnalysisEnabled } from "./action-risk-analysis";
import { appendImmutableAudit } from "./immutable-audit";

export interface SecurityContext {
  userId: string;
  agentId: string;
  sessionId: string;
  source: "moltbook" | "api" | "autopilot" | "manual" | "cron";
  ipAddress?: string;
  userAgent?: string;
}

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
  sanitizedContent?: string;
  anomalies: AnomalyEvent[];
  requiresApproval: boolean;
  approvalLevel: ApprovalLevel;
  /** Result of awareness check (governance); attach to pending items when routing to Decide. */
  awarenessResult?: AwarenessResult;
}

export type ApprovalLevel = 0 | 1 | 2 | 3;
// 0 = Auto-approve (read-only, upvotes)
// 1 = Approve with context (posts, follows)
// 2 = Explicit confirmation (DMs, API calls)
// 3 = Blocked by default (shell, credentials)

export interface OperationType {
  category: "read" | "write" | "execute" | "network" | "credential";
  action: string;
  target?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

// Define approval levels for different operations
const OPERATION_APPROVAL_LEVELS: Record<string, ApprovalLevel> = {
  // Level 0: Auto-approve
  "read:moltbook_feed": 0,
  "read:moltbook_post": 0,
  "read:moltbook_profile": 0,
  "write:moltbook_upvote": 0,
  "read:config": 0,
  "read:status": 0,

  // Level 1: Approve with context
  "write:moltbook_post": 1,
  "write:moltbook_comment": 1,
  "write:moltbook_follow": 1,
  "read:file_workspace": 1,
  "network:known_domain": 1,

  // Level 2: Explicit confirmation
  "write:moltbook_dm": 2,
  "write:file": 2,
  "network:api_call": 2,
  "network:unknown_domain": 2,
  "read:file_sensitive": 2,
  "execute:skill": 2,

  // Level 3: Blocked by default
  "execute:shell": 3,
  "execute:code": 3,
  "credential:read": 3,
  "credential:write": 3,
  "network:external": 3,
  "write:config": 3,
  "execute:self_modify": 3,
};

// Operations that are ALWAYS blocked
const BLOCKED_OPERATIONS = new Set([
  "execute:rm_rf",
  "execute:format",
  "execute:shutdown",
  "credential:export_all",
  "network:tunnel",
  "write:system_file",
]);

export class SecurityMiddleware {
  private sanitizer = getSanitizer(true);
  private detector = getAnomalyDetector();
  private pendingApprovals: Map<string, PendingApproval> = new Map();
  /** Pending item id -> approvedBy (caller who may execute). Set by approve API or at execute time. */
  private executionApprovals: Map<string, string> = new Map();
  private auditLog: AuditEntry[] = [];
  private onSecurityEvent?: (event: SecurityEvent) => void;

  constructor(onSecurityEvent?: (event: SecurityEvent) => void) {
    this.onSecurityEvent = onSecurityEvent;
  }

  /** Record that pendingId was approved for execution by approvedBy (e.g. from approve API or execute body). */
  recordExecutionApproval(pendingId: string, approvedBy: string): void {
    if (pendingId && approvedBy?.trim()) {
      this.executionApprovals.set(pendingId, approvedBy.trim());
    }
  }

  /** Return true if pendingId may be executed by callerId (has prior approval record or one-step execute with callerId). */
  isPendingApprovedForExecution(pendingId: string, callerId: string): boolean {
    const id = pendingId?.trim();
    const caller = callerId?.trim();
    if (!id || !caller) return false;
    const recorded = this.executionApprovals.get(id);
    if (recorded !== undefined) return recorded === caller;
    return true; // one-step: no prior record; allow if caller identified (dashboard sends approvedBy)
  }

  /**
   * Check if an operation is allowed
   */
  async checkOperation(
    operation: OperationType,
    context: SecurityContext
  ): Promise<SecurityCheckResult> {
    const checkResult: SecurityCheckResult = {
      allowed: true,
      warnings: [],
      anomalies: [],
      requiresApproval: false,
      approvalLevel: 0,
    };

    // MET switch: when system is halted, nothing autonomous runs
    if (await isSystemHalted()) {
      checkResult.allowed = false;
      checkResult.reason = "System halted; no autonomous execution until resumed by human.";
      return checkResult;
    }

    // Check if detector has paused execution
    if (this.detector.isPausedState()) {
      checkResult.allowed = false;
      checkResult.reason = "Agent execution is paused due to security concern";
      return checkResult;
    }

    // Get operation key
    const operationKey = `${operation.category}:${operation.action}`;

    // Check if operation is always blocked
    if (BLOCKED_OPERATIONS.has(operationKey)) {
      checkResult.allowed = false;
      checkResult.reason = `Operation "${operationKey}" is blocked by security policy`;
      this.logAudit("blocked", operation, context, checkResult.reason);
      return checkResult;
    }

    // Awareness check (governance): existential "should this happen at all" / "does this need human"
    const awarenessResult = await checkAwareness({
      operation: operationKey,
      source: context.source,
      metadata: operation.metadata,
    });
    checkResult.awarenessResult = awarenessResult;
    if (!awarenessResult.allowed) {
      checkResult.allowed = false;
      checkResult.reason = awarenessResult.reason ?? "Awareness check disallowed";
      return checkResult;
    }
    if (awarenessResult.requiresHuman) {
      checkResult.requiresApproval = true;
    }

    // Get approval level
    let approvalLevel = OPERATION_APPROVAL_LEVELS[operationKey] ?? 2;
    checkResult.approvalLevel = approvalLevel;
    checkResult.requiresApproval = approvalLevel >= 2;

    // Per-operation overrides (allow / block / ask)
    const overridesList = await loadOperationOverrides();
    const override = resolveOverride(
      overridesList,
      operationKey,
      operation.target,
      context.agentId
    );
    if (override) {
      if (override.action === "block") {
        checkResult.allowed = false;
        checkResult.reason = override.reason ?? `Operation "${operationKey}" blocked by override`;
        this.logAudit("blocked", operation, context, checkResult.reason);
        return checkResult;
      }
      if (override.action === "allow") {
        checkResult.requiresApproval = false;
      } else if (override.action === "ask") {
        checkResult.requiresApproval = true;
      }
    }

    // Trust scoring: auto-approve if weighted score >= threshold and no recent failure
    if (checkResult.requiresApproval) {
      try {
        const autoApprove = await shouldAutoApprove(
          operationKey,
          operation.target,
          context.agentId
        );
        if (autoApprove) {
          checkResult.requiresApproval = false;
        }
      } catch {
        // keep requiresApproval as-is on error
      }
    }

    // LLM risk analysis (optional): when content present and still requires approval
    if (
      checkResult.requiresApproval &&
      operation.content?.trim() &&
      isActionRiskAnalysisEnabled()
    ) {
      try {
        const risk = await analyzeAgentAction(operation.content);
        if (risk.requiresApproval) {
          checkResult.requiresApproval = true;
        }
        if (risk.reasoning && checkResult.warnings) {
          checkResult.warnings.push(`Risk: ${risk.reasoning}`);
        }
        if (risk.riskLevel === "critical") {
          checkResult.allowed = false;
          checkResult.reason = risk.reasoning ?? "LLM risk analysis: critical risk";
        }
      } catch {
        // keep as-is on error
      }
    }

    // Check content if present
    if (operation.content) {
      const sanitizeResult = this.sanitizer.sanitizeIncoming(
        operation.content,
        context.source
      );

      checkResult.sanitizedContent = sanitizeResult.sanitized;

      if (!sanitizeResult.safe) {
        const criticalThreats = sanitizeResult.threats.filter(
          (t) => t.severity === "critical"
        );

        if (criticalThreats.length > 0) {
          checkResult.allowed = false;
          checkResult.reason = `Content contains critical security threats: ${criticalThreats.map((t) => t.type).join(", ")}`;

          for (const threat of criticalThreats) {
            checkResult.anomalies.push(
              this.createAnomaly(
                "injection_attempt",
                "critical",
                operation,
                context,
                threat.description
              )
            );
          }
        } else {
          checkResult.warnings.push(
            `Content contains potential security concerns: ${sanitizeResult.threats.map((t) => t.type).join(", ")}`
          );
        }
      }

      const contentAnomalies = this.detector.checkContent(
        operation.content,
        context.source
      );
      checkResult.anomalies.push(...contentAnomalies);

      const criticalAnomalies = contentAnomalies.filter(
        (a) => a.severity === "critical" || a.severity === "emergency"
      );
      if (criticalAnomalies.length > 0) {
        checkResult.allowed = false;
        checkResult.reason = criticalAnomalies.map((a) => a.description).join("; ");
      }
    }

    // Check for outbound content leaks
    if (operation.category === "write" && operation.content) {
      const outboundCheck = this.sanitizer.sanitizeOutgoing(operation.content);
      if (!outboundCheck.safe) {
        checkResult.allowed = false;
        checkResult.reason = `Content would leak credentials: ${outboundCheck.leaks.join(", ")}`;
        checkResult.sanitizedContent = outboundCheck.sanitized;

        checkResult.anomalies.push(
          this.createAnomaly(
            "credential_exposure",
            "critical",
            operation,
            context,
            `Blocked credential leak: ${outboundCheck.leaks.join(", ")}`
          )
        );
      }
    }

    // Check network operations
    if (operation.category === "network" && operation.target) {
      const networkAnomaly = this.detector.checkNetworkRequest(
        operation.target,
        (operation.metadata?.method as string) || "GET"
      );
      if (networkAnomaly) {
        checkResult.anomalies.push(networkAnomaly);
        if (networkAnomaly.severity === "critical") {
          checkResult.allowed = false;
          checkResult.reason = networkAnomaly.description;
        } else {
          checkResult.warnings.push(networkAnomaly.description);
        }
      }
    }

    // Check file operations
    if (
      operation.target &&
      (operation.action.includes("file") || operation.category === "read")
    ) {
      const fileAnomaly = this.detector.checkFileAccess(operation.target);
      if (fileAnomaly) {
        checkResult.anomalies.push(fileAnomaly);
        if (fileAnomaly.severity === "critical") {
          checkResult.allowed = false;
          checkResult.reason = fileAnomaly.description;
        }
      }
    }

    this.detector.logActivity(operation.action, {
      category: operation.category,
      target: operation.target,
      source: context.source,
    });

    const rateAnomaly = this.detector.checkRateAnomaly(operation.action);
    if (rateAnomaly) {
      checkResult.anomalies.push(rateAnomaly);
      checkResult.warnings.push(rateAnomaly.description);
      if (rateAnomaly.severity === "critical") {
        checkResult.allowed = false;
        checkResult.reason = rateAnomaly.description;
      }
    }

    this.logAudit(
      checkResult.allowed ? "allowed" : "blocked",
      operation,
      context,
      checkResult.reason
    );

    return checkResult;
  }

  /**
   * Request approval for an operation
   */
  async requestApproval(
    operation: OperationType,
    context: SecurityContext,
    reason: string
  ): Promise<string> {
    const approvalId = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const pending: PendingApproval = {
      id: approvalId,
      operation,
      context,
      reason,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: "pending",
    };

    this.pendingApprovals.set(approvalId, pending);

    if (this.onSecurityEvent) {
      this.onSecurityEvent({
        type: "approval_requested",
        approvalId,
        operation,
        context,
        reason,
        timestamp: new Date(),
      });
    }

    return approvalId;
  }

  /**
   * Approve a pending operation
   */
  approve(approvalId: string, approvedBy: string): boolean {
    const pending = this.pendingApprovals.get(approvalId);
    if (!pending || pending.status !== "pending") {
      return false;
    }

    if (new Date() > pending.expiresAt) {
      pending.status = "expired";
      return false;
    }

    pending.status = "approved";
    pending.approvedBy = approvedBy;
    pending.approvedAt = new Date();

    this.logAudit(
      "approved",
      pending.operation,
      pending.context,
      `Approved by ${approvedBy}`
    );

    return true;
  }

  /**
   * Deny a pending operation
   */
  deny(approvalId: string, deniedBy: string, reason?: string): boolean {
    const pending = this.pendingApprovals.get(approvalId);
    if (!pending || pending.status !== "pending") {
      return false;
    }

    pending.status = "denied";
    pending.deniedBy = deniedBy;
    pending.deniedAt = new Date();
    pending.denyReason = reason;

    this.logAudit(
      "denied",
      pending.operation,
      pending.context,
      `Denied by ${deniedBy}: ${reason ?? ""}`
    );

    return true;
  }

  isApproved(approvalId: string): boolean {
    const pending = this.pendingApprovals.get(approvalId);
    return pending?.status === "approved";
  }

  getPendingApprovals(): PendingApproval[] {
    const now = new Date();
    return Array.from(this.pendingApprovals.values()).filter(
      (p) => p.status === "pending" && p.expiresAt > now
    );
  }

  /**
   * Execute an operation with credential (using vault)
   */
  async executeWithCredential<T>(
    credentialId: string,
    permission: CredentialPermission,
    operation: OperationType,
    context: SecurityContext,
    executor: (credential: string) => Promise<T>
  ): Promise<T> {
    const check = await this.checkOperation(
      { ...operation, category: "credential", action: "use" },
      context
    );

    if (!check.allowed) {
      throw new Error(`Operation blocked: ${check.reason}`);
    }

    const vault = getVault();
    return vault.executeWithCredential(credentialId, permission, executor);
  }

  private createAnomaly(
    type: AnomalyType,
    severity: AnomalyEvent["severity"],
    operation: OperationType,
    context: SecurityContext,
    description: string
  ): AnomalyEvent {
    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      type,
      severity,
      source: context.source,
      description,
      context: {
        operation: `${operation.category}:${operation.action}`,
        target: operation.target,
        userId: context.userId,
        agentId: context.agentId,
      },
      actionTaken:
        severity === "critical" || severity === "emergency" ? "blocked" : "warned",
      requiresReview:
        severity === "critical" || severity === "emergency",
    };
  }

  private logAudit(
    result: "allowed" | "blocked" | "approved" | "denied",
    operation: OperationType,
    context: SecurityContext,
    reason?: string
  ): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      result,
      operation: `${operation.category}:${operation.action}`,
      target: operation.target,
      userId: context.userId,
      agentId: context.agentId,
      sessionId: context.sessionId,
      source: context.source,
      reason,
      ipAddress: context.ipAddress,
    };

    this.auditLog.push(entry);

    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    // Write to immutable, hash-chained audit trail (external to agent data)
    appendImmutableAudit("operation_check", {
      result,
      operation: `${operation.category}:${operation.action}`,
      target: operation.target,
      userId: context.userId,
      agentId: context.agentId,
      source: context.source,
      reason,
    }).catch((e) => console.error("[immutable-audit] append failed:", e));

    // Persist typed entries for learning loop and reports
    const opKey = `${operation.category}:${operation.action}`;
    const target = operation.target ?? "";
    const ts = entry.timestamp.toISOString();
    const operatorId = context.userId && context.userId !== "anonymous" ? context.userId : getOperatorId();
    if (result === "blocked" || result === "denied") {
      getActivityStore()
        .append({
          type: "operation_blocked",
          timestamp: ts,
          operation: opKey,
          target,
          reason: reason ?? result,
          operatorId,
        } as TypedActivityEntry)
        .catch((e) => console.error("[security-middleware] append operation_blocked failed:", e));
    } else if (result === "approved") {
      getActivityStore()
        .append({
          type: "operation_approved",
          timestamp: ts,
          operation: opKey,
          target,
          approvedBy: context.userId,
          operatorId,
        } as TypedActivityEntry)
        .catch((e) => console.error("[security-middleware] append operation_approved failed:", e));
    }
  }

  getAuditLog(filter?: {
    since?: Date;
    result?: AuditEntry["result"];
    userId?: string;
    agentId?: string;
  }): AuditEntry[] {
    let entries = [...this.auditLog];

    if (filter?.since) {
      entries = entries.filter((e) => e.timestamp >= filter.since!);
    }
    if (filter?.result) {
      entries = entries.filter((e) => e.result === filter.result);
    }
    if (filter?.userId) {
      entries = entries.filter((e) => e.userId === filter.userId);
    }
    if (filter?.agentId) {
      entries = entries.filter((e) => e.agentId === filter.agentId);
    }

    return entries;
  }

  getStats(): SecurityStats {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEntries = this.auditLog.filter((e) => e.timestamp >= last24h);

    return {
      totalOperations: recentEntries.length,
      allowed: recentEntries.filter((e) => e.result === "allowed").length,
      blocked: recentEntries.filter((e) => e.result === "blocked").length,
      pendingApprovals: this.getPendingApprovals().length,
      anomalies: this.detector.getEvents(last24h).length,
      isPaused: this.detector.isPausedState(),
    };
  }

  pause(): void {
    this.detector.pause();
  }

  resume(): void {
    this.detector.resume();
  }
}

interface PendingApproval {
  id: string;
  operation: OperationType;
  context: SecurityContext;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  status: "pending" | "approved" | "denied" | "expired";
  approvedBy?: string;
  approvedAt?: Date;
  deniedBy?: string;
  deniedAt?: Date;
  denyReason?: string;
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  result: "allowed" | "blocked" | "approved" | "denied";
  operation: string;
  target?: string;
  userId: string;
  agentId: string;
  sessionId: string;
  source: string;
  reason?: string;
  ipAddress?: string;
}

interface SecurityStats {
  totalOperations: number;
  allowed: number;
  blocked: number;
  pendingApprovals: number;
  anomalies: number;
  isPaused: boolean;
}

interface SecurityEvent {
  type:
    | "approval_requested"
    | "anomaly_detected"
    | "operation_blocked"
    | "agent_paused";
  approvalId?: string;
  operation?: OperationType;
  context?: SecurityContext;
  reason?: string;
  timestamp: Date;
}

let middlewareInstance: SecurityMiddleware | null = null;

export function getSecurityMiddleware(
  onSecurityEvent?: (event: SecurityEvent) => void
): SecurityMiddleware {
  if (!middlewareInstance) {
    middlewareInstance = new SecurityMiddleware(onSecurityEvent);
  }
  return middlewareInstance;
}

export default SecurityMiddleware;
