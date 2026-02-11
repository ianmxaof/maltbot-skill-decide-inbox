// src/lib/security/anomaly-detector.ts
// Real-time Anomaly Detection Engine for Agent Behavior

import { getActivityStore, type TypedActivityEntry } from "@/lib/persistence";
import { getOperatorId } from "@/lib/operator";

export interface AnomalyEvent {
  id: string;
  timestamp: Date;
  type: AnomalyType;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  source: string;          // Which component triggered this
  description: string;
  context: Record<string, unknown>;
  actionTaken: AnomalyAction;
  requiresReview: boolean;
}

export type AnomalyType =
  | 'rate_spike'           // Sudden increase in activity
  | 'unusual_access'       // Access to unusual files/endpoints
  | 'credential_exposure'  // Potential credential leak
  | 'injection_attempt'    // Prompt injection detected
  | 'network_anomaly'      // Unusual outbound requests
  | 'auth_failure'         // Repeated authentication failures
  | 'policy_violation'     // Action violates defined policy
  | 'behavioral_deviation' // Deviation from baseline behavior
  | 'self_modification'    // Attempt to modify own config/safety
  | 'recursive_prompt'     // Self-referential or recursive patterns
  | 'exfiltration_attempt' // Attempt to send data externally
  | 'privilege_escalation'; // Attempt to gain elevated access

export type AnomalyAction =
  | 'logged'               // Just logged for review
  | 'warned'               // User notified
  | 'blocked'              // Action was blocked
  | 'paused'               // Agent execution paused
  | 'quarantined';         // Content quarantined for review

export interface BehavioralBaseline {
  postsPerHour: number;
  commentsPerHour: number;
  apiCallsPerMinute: number;
  uniqueEndpointsPerDay: number;
  averageResponseTime: number;
  typicalActiveHours: number[];  // 0-23
  knownDomains: Set<string>;
  knownFilePaths: Set<string>;
}

export interface AnomalyConfig {
  enabled: boolean;
  strictMode: boolean;
  autoBlock: boolean;
  autoPause: boolean;
  notifyOnWarning: boolean;
  notifyOnCritical: boolean;
  baselineWindowHours: number;
  rateSpikeTolerance: number;  // Multiplier (e.g., 3 = 3x baseline)
}

const DEFAULT_CONFIG: AnomalyConfig = {
  enabled: true,
  strictMode: true,
  autoBlock: true,
  autoPause: true,
  notifyOnWarning: true,
  notifyOnCritical: true,
  baselineWindowHours: 24,
  rateSpikeTolerance: 3,
};

// Patterns that indicate self-modification attempts
const SELF_MODIFICATION_PATTERNS = [
  /disable\s+(safety|security|sandbox|approval)/i,
  /turn\s+off\s+(protection|sandbox|approval)/i,
  /bypass\s+(restriction|limit|filter)/i,
  /remove\s+(guardrail|safety|limit)/i,
  /exec\.approvals?\.(set|off|disable)/i,
  /tools\.exec\.host\s*[=:]\s*["']?gateway/i,
  /sandbox\s*[=:]\s*["']?(off|false|disabled)/i,
  /no-new-privileges\s*[=:]\s*["']?false/i,
];

// Patterns that indicate exfiltration attempts
const EXFILTRATION_PATTERNS = [
  /(curl|wget|fetch|post|send)\s+.*\.(env|config|secret|key)/i,
  /upload\s+.*\.(pem|key|secret|env)/i,
  /(base64|encode)\s+.*\s+(send|post|upload)/i,
  /webhook[:\s]+https?:\/\/(?!localhost|127\.0\.0\.1)/i,
  /ngrok|serveo|localtunnel|cloudflare.*tunnel/i,
];

// Known dangerous file paths
const DANGEROUS_PATHS = [
  /\/etc\/passwd/,
  /\/etc\/shadow/,
  /\/etc\/sudoers/,
  /\.ssh\/(id_|known_hosts|authorized_keys)/,
  /\.gnupg\//,
  /\.aws\/(credentials|config)/,
  /\.kube\/config/,
  /\.docker\/config/,
  /\.npmrc/,
  /\.pypirc/,
  /\.gitconfig/,
  /\.netrc/,
  /\.env(\.|$)/,
  /config\.(json|yml|yaml|toml)/,
  /secrets?\.(json|yml|yaml|toml)/,
  /credentials?\.(json|yml|yaml|toml)/,
];

export class AnomalyDetector {
  private config: AnomalyConfig;
  private baseline: BehavioralBaseline;
  private events: AnomalyEvent[] = [];
  private activityLog: ActivityEntry[] = [];
  private isPaused: boolean = false;
  private onAnomaly?: (event: AnomalyEvent) => void;

  constructor(config: Partial<AnomalyConfig> = {}, onAnomaly?: (event: AnomalyEvent) => void) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseline = this.initializeBaseline();
    this.onAnomaly = onAnomaly;
  }

  private initializeBaseline(): BehavioralBaseline {
    return {
      postsPerHour: 2,
      commentsPerHour: 5,
      apiCallsPerMinute: 10,
      uniqueEndpointsPerDay: 20,
      averageResponseTime: 500,
      typicalActiveHours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
      knownDomains: new Set(['moltbook.com', 'api.moltbook.com', 'api.anthropic.com', 'api.openai.com']),
      knownFilePaths: new Set(['/home/user/workspace', '/tmp']),
    };
  }

  /**
   * Log activity for baseline learning
   */
  logActivity(type: string, details: Record<string, unknown>): void {
    const entry: ActivityEntry = {
      timestamp: new Date(),
      type,
      details,
    };
    this.activityLog.push(entry);

    // Keep only recent activity (last 24 hours)
    const cutoff = Date.now() - this.config.baselineWindowHours * 60 * 60 * 1000;
    this.activityLog = this.activityLog.filter(e => e.timestamp.getTime() > cutoff);
  }

  /**
   * Check for rate spikes
   */
  checkRateAnomaly(activityType: string): AnomalyEvent | null {
    const recentWindow = 60 * 60 * 1000; // 1 hour
    const now = Date.now();

    const recentCount = this.activityLog.filter(
      e => e.type === activityType && now - e.timestamp.getTime() < recentWindow
    ).length;

    let baselineRate: number;
    switch (activityType) {
      case 'post':
        baselineRate = this.baseline.postsPerHour;
        break;
      case 'comment':
        baselineRate = this.baseline.commentsPerHour;
        break;
      case 'api_call':
        baselineRate = this.baseline.apiCallsPerMinute * 60;
        break;
      default:
        baselineRate = 10;
    }

    if (recentCount > baselineRate * this.config.rateSpikeTolerance) {
      getActivityStore()
        .append({
          type: "rate_spike",
          timestamp: new Date().toISOString(),
          metric: activityType,
          value: recentCount,
          baseline: baselineRate,
          operatorId: getOperatorId(),
        } as TypedActivityEntry)
        .catch(() => {});
      return this.createAnomaly(
        'rate_spike',
        'warning',
        'autopilot',
        `Activity rate spike detected: ${recentCount} ${activityType}s in last hour (baseline: ${baselineRate})`,
        { activityType, count: recentCount, baseline: baselineRate },
        this.config.autoBlock ? 'blocked' : 'warned'
      );
    }

    return null;
  }

  /**
   * Check for unusual file access
   */
  checkFileAccess(filePath: string): AnomalyEvent | null {
    for (const pattern of DANGEROUS_PATHS) {
      if (pattern.test(filePath)) {
        return this.createAnomaly(
          'unusual_access',
          'critical',
          'filesystem',
          `Access to sensitive file path: ${filePath}`,
          { filePath, pattern: pattern.source },
          'blocked'
        );
      }
    }

    // Check if path is outside known safe paths
    const isKnownPath = Array.from(this.baseline.knownFilePaths).some(
      known => filePath.startsWith(known)
    );

    if (!isKnownPath) {
      return this.createAnomaly(
        'unusual_access',
        'warning',
        'filesystem',
        `Access to unknown file path: ${filePath}`,
        { filePath },
        'warned'
      );
    }

    return null;
  }

  /**
   * Check for network anomalies
   */
  checkNetworkRequest(url: string, method: string): AnomalyEvent | null {
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      return this.createAnomaly(
        'network_anomaly',
        'warning',
        'network',
        `Invalid URL format: ${url}`,
        { url, method },
        'blocked'
      );
    }

    // Check if domain is known
    if (!this.baseline.knownDomains.has(domain)) {
      const severity = this.isLikelyMalicious(domain) ? 'critical' : 'warning';
      return this.createAnomaly(
        'network_anomaly',
        severity,
        'network',
        `Request to unknown domain: ${domain}`,
        { url, domain, method },
        severity === 'critical' ? 'blocked' : 'warned'
      );
    }

    return null;
  }

  /**
   * Check for self-modification attempts
   */
  checkSelfModification(content: string): AnomalyEvent | null {
    for (const pattern of SELF_MODIFICATION_PATTERNS) {
      if (pattern.test(content)) {
        return this.createAnomaly(
          'self_modification',
          'emergency',
          'security',
          `Self-modification attempt detected`,
          { pattern: pattern.source, match: content.match(pattern)?.[0] },
          'blocked'
        );
      }
    }
    return null;
  }

  /**
   * Check for exfiltration attempts
   */
  checkExfiltration(content: string): AnomalyEvent | null {
    for (const pattern of EXFILTRATION_PATTERNS) {
      if (pattern.test(content)) {
        return this.createAnomaly(
          'exfiltration_attempt',
          'critical',
          'security',
          `Potential data exfiltration attempt detected`,
          { pattern: pattern.source, match: content.match(pattern)?.[0] },
          'blocked'
        );
      }
    }
    return null;
  }

  /**
   * Check for credential exposure in content
   */
  checkCredentialExposure(content: string): AnomalyEvent | null {
    const credentialPatterns = [
      { pattern: /sk-[a-zA-Z0-9]{20,}/, type: 'OpenAI API key' },
      { pattern: /sk-ant-[a-zA-Z0-9-]{40,}/, type: 'Anthropic API key' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, type: 'GitHub token' },
      { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, type: 'Private key' },
    ];

    for (const { pattern, type } of credentialPatterns) {
      if (pattern.test(content)) {
        return this.createAnomaly(
          'credential_exposure',
          'critical',
          'security',
          `Credential exposure detected: ${type}`,
          { credentialType: type },
          'blocked'
        );
      }
    }
    return null;
  }

  /**
   * Check for recursive/self-referential prompts
   */
  checkRecursivePattern(content: string): AnomalyEvent | null {
    const recursivePatterns = [
      /repeat\s+(this|the\s+above)\s+\d+\s+times/i,
      /call\s+yourself/i,
      /infinite\s+loop/i,
      /while\s*\(\s*true\s*\)/i,
      /for\s*\(\s*;\s*;\s*\)/i,
    ];

    for (const pattern of recursivePatterns) {
      if (pattern.test(content)) {
        return this.createAnomaly(
          'recursive_prompt',
          'warning',
          'execution',
          `Recursive pattern detected`,
          { pattern: pattern.source },
          'blocked'
        );
      }
    }
    return null;
  }

  /**
   * Comprehensive content check
   */
  checkContent(content: string, source: string): AnomalyEvent[] {
    const anomalies: AnomalyEvent[] = [];

    const selfMod = this.checkSelfModification(content);
    if (selfMod) anomalies.push(selfMod);

    const exfil = this.checkExfiltration(content);
    if (exfil) anomalies.push(exfil);

    const cred = this.checkCredentialExposure(content);
    if (cred) anomalies.push(cred);

    const recursive = this.checkRecursivePattern(content);
    if (recursive) anomalies.push(recursive);

    return anomalies;
  }

  /**
   * Create and record an anomaly event
   */
  private createAnomaly(
    type: AnomalyType,
    severity: AnomalyEvent['severity'],
    source: string,
    description: string,
    context: Record<string, unknown>,
    action: AnomalyAction
  ): AnomalyEvent {
    const event: AnomalyEvent = {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      type,
      severity,
      source,
      description,
      context,
      actionTaken: action,
      requiresReview: severity === 'critical' || severity === 'emergency',
    };

    this.events.push(event);

    // Persist typed entry for learning loop and reports
    getActivityStore()
      .append({
        type: "anomaly_detected",
        timestamp: event.timestamp.toISOString(),
        anomalyType: type,
        severity,
        operatorId: getOperatorId(),
      } as TypedActivityEntry)
      .catch(() => {});

    // Auto-pause on emergency
    if (severity === 'emergency' && this.config.autoPause) {
      this.pause();
    }

    // Notify callback
    if (this.onAnomaly) {
      this.onAnomaly(event);
    }

    console.log(`[ANOMALY] ${severity.toUpperCase()}: ${description}`);

    return event;
  }

  /**
   * Check if a domain is likely malicious
   */
  private isLikelyMalicious(domain: string): boolean {
    const suspiciousPatterns = [
      /ngrok/i,
      /serveo/i,
      /localtunnel/i,
      /requestbin/i,
      /webhook\.site/i,
      /pipedream/i,
      /burpcollaborator/i,
      /interact\.sh/i,
      /oast/i,
    ];

    return suspiciousPatterns.some(p => p.test(domain));
  }

  /**
   * Pause agent execution
   */
  pause(): void {
    this.isPaused = true;
    console.log('[ANOMALY] Agent execution PAUSED due to security concern');
  }

  /**
   * Resume agent execution
   */
  resume(): void {
    this.isPaused = false;
    console.log('[ANOMALY] Agent execution RESUMED');
  }

  /**
   * Check if agent is paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Get all anomaly events
   */
  getEvents(since?: Date): AnomalyEvent[] {
    if (since) {
      return this.events.filter(e => e.timestamp >= since);
    }
    return [...this.events];
  }

  /**
   * Get events requiring review
   */
  getPendingReviews(): AnomalyEvent[] {
    return this.events.filter(e => e.requiresReview);
  }

  /**
   * Mark event as reviewed
   */
  markReviewed(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.requiresReview = false;
      return true;
    }
    return false;
  }

  /**
   * Add a domain to the known safe list
   */
  addKnownDomain(domain: string): void {
    this.baseline.knownDomains.add(domain);
  }

  /**
   * Add a file path to the known safe list
   */
  addKnownPath(path: string): void {
    this.baseline.knownFilePaths.add(path);
  }

  /**
   * Update baseline from learned behavior
   */
  updateBaseline(): void {
    const hourAgo = Date.now() - 60 * 60 * 1000;

    const recentPosts = this.activityLog.filter(
      e => e.type === 'post' && e.timestamp.getTime() > hourAgo
    ).length;

    const recentComments = this.activityLog.filter(
      e => e.type === 'comment' && e.timestamp.getTime() > hourAgo
    ).length;

    // Smoothed update (exponential moving average)
    const alpha = 0.1;
    this.baseline.postsPerHour = alpha * recentPosts + (1 - alpha) * this.baseline.postsPerHour;
    this.baseline.commentsPerHour = alpha * recentComments + (1 - alpha) * this.baseline.commentsPerHour;

    console.log(`[ANOMALY] Baseline updated: posts=${this.baseline.postsPerHour.toFixed(1)}/hr, comments=${this.baseline.commentsPerHour.toFixed(1)}/hr`);
  }

  /**
   * Get current configuration
   */
  getConfig(): AnomalyConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AnomalyConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

interface ActivityEntry {
  timestamp: Date;
  type: string;
  details: Record<string, unknown>;
}

// Singleton instance
let detectorInstance: AnomalyDetector | null = null;

export function getAnomalyDetector(
  config?: Partial<AnomalyConfig>,
  onAnomaly?: (event: AnomalyEvent) => void
): AnomalyDetector {
  if (!detectorInstance) {
    detectorInstance = new AnomalyDetector(config, onAnomaly);
  }
  return detectorInstance;
}

export default AnomalyDetector;
