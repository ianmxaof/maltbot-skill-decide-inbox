/**
 * Agent lifecycle hooks: chainable async handlers for prompt, before/after tool execution,
 * and response. Security middleware implements the checks; this layer is the formal contract.
 * Handlers can short-circuit the chain; metrics can be captured at each step.
 */

import type { SecurityContext, OperationType } from "@/lib/security/security-middleware";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

export type HookContext = {
  operation?: OperationType;
  securityContext?: SecurityContext;
  /** For execute_pending: id of the pending item being executed */
  pendingId?: string;
  /** Caller who requested execution (e.g. approvedBy); must be set for execute to be authorized */
  callerId?: string;
  content?: string;
  sanitizedContent?: string;
};

export type HookResult = 
  | { shortCircuit: false }
  | { shortCircuit: true; allowed: boolean; reason?: string };

export type AsyncHookHandler = (ctx: HookContext) => Promise<HookResult>;

/** Pipeline of handlers per hook point; runs in order until one short-circuits or all complete */
async function runPipeline(handlers: AsyncHookHandler[], ctx: HookContext): Promise<HookResult> {
  for (const handler of handlers) {
    const result = await handler(ctx);
    if (result.shortCircuit) return result;
  }
  return { shortCircuit: false };
}

// --- Hook registries (arrays of handlers) ---
const onPromptReceivedHandlers: AsyncHookHandler[] = [];
const beforeToolExecutionHandlers: AsyncHookHandler[] = [];
const afterToolExecutionHandlers: AsyncHookHandler[] = [];
const onOperationCompleteHandlers: AsyncHookHandler[] = [];
const onResponseGeneratedHandlers: AsyncHookHandler[] = [];

// --- Default handler: execute-route authorization ---
beforeToolExecutionHandlers.push(async (ctx): Promise<HookResult> => {
  if (ctx.pendingId && ctx.operation?.action === "execute_pending") {
    if (!ctx.callerId?.trim()) {
      return { shortCircuit: true, allowed: false, reason: "Execute requires caller authorization (approvedBy or session)" };
    }
    const middleware = getSecurityMiddleware();
    const isApproved = middleware.isPendingApprovedForExecution(ctx.pendingId, ctx.callerId);
    if (!isApproved) {
      return { shortCircuit: true, allowed: false, reason: "Pending action not approved by this caller" };
    }
  }
  return { shortCircuit: false };
});

// --- Default handler: permission check via security middleware ---
beforeToolExecutionHandlers.push(async (ctx): Promise<HookResult> => {
  if (ctx.operation && ctx.securityContext) {
    const middleware = getSecurityMiddleware();
    const check = await middleware.checkOperation(ctx.operation, ctx.securityContext);
    if (!check.allowed) {
      return { shortCircuit: true, allowed: false, reason: check.reason };
    }
  }
  return { shortCircuit: false };
});

// --- Public API ---

export function registerOnPromptReceived(handler: AsyncHookHandler): void {
  onPromptReceivedHandlers.push(handler);
}

export function registerBeforeToolExecution(handler: AsyncHookHandler): void {
  beforeToolExecutionHandlers.push(handler);
}

export function registerAfterToolExecution(handler: AsyncHookHandler): void {
  afterToolExecutionHandlers.push(handler);
}

export function registerOnOperationComplete(handler: AsyncHookHandler): void {
  onOperationCompleteHandlers.push(handler);
}

export function registerOnResponseGenerated(handler: AsyncHookHandler): void {
  onResponseGeneratedHandlers.push(handler);
}

export async function runOnPromptReceived(ctx: HookContext): Promise<HookResult> {
  return runPipeline(onPromptReceivedHandlers, ctx);
}

export async function runBeforeToolExecution(ctx: HookContext): Promise<HookResult> {
  return runPipeline(beforeToolExecutionHandlers, ctx);
}

export async function runAfterToolExecution(ctx: HookContext): Promise<HookResult> {
  return runPipeline(afterToolExecutionHandlers, ctx);
}

export async function runOnOperationComplete(ctx: HookContext): Promise<HookResult> {
  return runPipeline(onOperationCompleteHandlers, ctx);
}

export async function runOnResponseGenerated(ctx: HookContext): Promise<HookResult> {
  return runPipeline(onResponseGeneratedHandlers, ctx);
}
