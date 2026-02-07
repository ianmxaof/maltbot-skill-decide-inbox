// src/lib/security/index.ts
// Security Module - Comprehensive protection for PowerCore agents

import type { AnomalyEvent } from "./anomaly-detector";
import { initializeVault as initVault } from "./credential-vault";
import { getSanitizer } from "./content-sanitizer";
import { getAnomalyDetector } from "./anomaly-detector";
import { getSecurityMiddleware } from "./security-middleware";

export {
  CredentialVault,
  initializeVault,
  getVault,
  encryptCredential,
  decryptCredential,
  type EncryptedCredential,
  type CredentialPermission,
} from "./credential-vault";

export {
  ContentSanitizer,
  getSanitizer,
  type SanitizationResult,
  type ThreatDetection,
  type ThreatType,
} from "./content-sanitizer";

export {
  AnomalyDetector,
  getAnomalyDetector,
  type AnomalyEvent,
  type AnomalyType,
  type AnomalyAction,
  type AnomalyConfig,
  type BehavioralBaseline,
} from "./anomaly-detector";

export {
  SecurityMiddleware,
  getSecurityMiddleware,
  type SecurityContext,
  type SecurityCheckResult,
  type OperationType,
  type ApprovalLevel,
} from "./security-middleware";

export {
  getOperationOverrides,
  addOperationOverride,
  removeOperationOverride,
  loadOperationOverrides,
  saveOperationOverrides,
  resolveOverride,
  type OperationOverride,
} from "./operation-overrides";

export {
  getTrustScores,
  recordSuccess,
  recordFailure,
  shouldAutoApprove,
  computeWeightedScore,
  loadTrustScores,
  type TrustScoreEntry,
} from "./trust-scoring";

export {
  analyzeAgentAction,
  isActionRiskAnalysisEnabled,
  type ActionRiskResult,
  type RiskLevel,
} from "./action-risk-analysis";

export {
  buildRiskReport,
  maybeSendEventTriggeredAlert,
  type RiskReportSummary,
} from "./risk-report";

/**
 * Initialize the complete security system
 */
export function initializeSecurity(options: {
  masterPassword?: string;
  strictMode?: boolean;
  onAnomaly?: (event: AnomalyEvent) => void;
  onSecurityEvent?: (event: unknown) => void;
}) {
  const {
    masterPassword,
    strictMode = true,
    onAnomaly,
    onSecurityEvent,
  } = options;

  if (masterPassword) {
    initVault(masterPassword);
  }

  getSanitizer(strictMode);
  getAnomalyDetector({ strictMode }, onAnomaly);
  getSecurityMiddleware(onSecurityEvent as (e: unknown) => void);

  console.log("[SECURITY] Security system initialized");
}

/**
 * Quick security check for content
 */
export async function quickSecurityCheck(
  content: string,
  source: string = "unknown"
): Promise<{
  safe: boolean;
  threats: string[];
  sanitized: string;
}> {
  const sanitizer = getSanitizer();
  const result = sanitizer.sanitizeIncoming(content, source);

  return {
    safe: result.safe,
    threats: result.threats.map((t) => t.description),
    sanitized: result.sanitized,
  };
}

/**
 * Check outbound content for credential leaks
 */
export function checkForLeaks(content: string): {
  safe: boolean;
  leaks: string[];
  sanitized: string;
} {
  return getSanitizer().sanitizeOutgoing(content);
}
