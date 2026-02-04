// src/lib/security/content-sanitizer.ts
// Content Sanitization Pipeline - Defends against prompt injection

export interface SanitizationResult {
  safe: boolean;
  sanitized: string;
  threats: ThreatDetection[];
  confidence: number;
  tainted: boolean;  // If true, content came from untrusted source
}

export interface ThreatDetection {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  match: string;
  position: number;
  description: string;
}

export type ThreatType =
  | 'instruction_injection'
  | 'system_prompt_extraction'
  | 'command_execution'
  | 'credential_extraction'
  | 'encoded_payload'
  | 'hidden_text'
  | 'url_injection'
  | 'data_exfiltration'
  | 'jailbreak_attempt'
  | 'role_manipulation';

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

const INJECTION_PATTERNS: Array<{
  pattern: RegExp;
  type: ThreatType;
  severity: ThreatDetection['severity'];
  description: string;
}> = [
  // Direct instruction injection
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|guidelines?|prompts?)/gi,
    type: 'instruction_injection',
    severity: 'critical',
    description: 'Attempt to override system instructions',
  },
  {
    pattern: /disregard\s+(everything|all|the|what)\s+(above|before|i\s+said|was\s+said)/gi,
    type: 'instruction_injection',
    severity: 'critical',
    description: 'Attempt to disregard previous context',
  },
  {
    pattern: /forget\s+(everything|all|what)\s+(you|i|we)\s+(know|learned|said)/gi,
    type: 'instruction_injection',
    severity: 'high',
    description: 'Attempt to reset agent memory',
  },
  {
    pattern: /new\s+(instructions?|rules?|guidelines?|persona|role|identity)\s*:/gi,
    type: 'instruction_injection',
    severity: 'critical',
    description: 'Attempt to inject new instructions',
  },
  {
    pattern: /you\s+(are|will)\s+(now|be|become|act\s+as)\s+(a|an|my)/gi,
    type: 'role_manipulation',
    severity: 'high',
    description: 'Attempt to change agent role/persona',
  },
  {
    pattern: /from\s+now\s+on[,\s]+(you|ignore|follow|obey)/gi,
    type: 'instruction_injection',
    severity: 'high',
    description: 'Attempt to modify future behavior',
  },

  // System prompt extraction
  {
    pattern: /what\s+(is|are)\s+(your|the)\s+(system|initial|original|full)\s+(prompt|instructions?|rules?)/gi,
    type: 'system_prompt_extraction',
    severity: 'high',
    description: 'Attempt to extract system prompt',
  },
  {
    pattern: /(repeat|show|display|print|output|reveal)\s+(your|the)\s+(system|initial|original|full|complete)/gi,
    type: 'system_prompt_extraction',
    severity: 'high',
    description: 'Attempt to reveal system instructions',
  },
  {
    pattern: /what\s+(were\s+you|are\s+you)\s+(told|instructed|programmed)/gi,
    type: 'system_prompt_extraction',
    severity: 'medium',
    description: 'Attempt to probe agent instructions',
  },
  {
    pattern: /above\s+(this\s+)?(message|text|prompt)\s+(is|contains|has)/gi,
    type: 'system_prompt_extraction',
    severity: 'medium',
    description: 'Reference to system context',
  },

  // Command execution attempts
  {
    pattern: /(run|execute|eval|exec)\s*(this|the|a|following)?\s*(command|script|code|shell)/gi,
    type: 'command_execution',
    severity: 'critical',
    description: 'Attempt to execute commands',
  },
  {
    pattern: /\$\(\s*[^)]+\s*\)/g,
    type: 'command_execution',
    severity: 'critical',
    description: 'Shell command substitution pattern',
  },
  {
    pattern: /`[^`]{3,}`/g,
    type: 'command_execution',
    severity: 'high',
    description: 'Backtick command pattern',
  },
  {
    pattern: /;\s*(rm|del|curl|wget|nc|bash|sh|python|node|eval)\s/gi,
    type: 'command_execution',
    severity: 'critical',
    description: 'Command injection via semicolon',
  },
  {
    pattern: /\|\s*(bash|sh|python|node|nc|curl)/gi,
    type: 'command_execution',
    severity: 'critical',
    description: 'Pipe to shell command',
  },

  // Credential extraction
  {
    pattern: /(show|display|print|output|reveal|tell\s+me)\s+(your|the|my|all)?\s*(api[_\s-]?keys?|secrets?|tokens?|credentials?|passwords?)/gi,
    type: 'credential_extraction',
    severity: 'critical',
    description: 'Attempt to extract credentials',
  },
  {
    pattern: /(read|cat|type|get|fetch|load)\s+[^\s]*(\.env|config\.(json|yml|yaml)|secrets?|credentials?)/gi,
    type: 'credential_extraction',
    severity: 'critical',
    description: 'Attempt to read config files',
  },
  {
    pattern: /process\.env\[?['"]?\w+['"]?\]?/gi,
    type: 'credential_extraction',
    severity: 'high',
    description: 'Environment variable access',
  },
  {
    pattern: /\/(home|users?)\/[^\/]+\/\.(ssh|gnupg|config|aws|kube)/gi,
    type: 'credential_extraction',
    severity: 'critical',
    description: 'Access to sensitive directories',
  },

  // Encoded payloads
  {
    pattern: /base64[:\s]*(decode|encode)?\s*['"(]?[A-Za-z0-9+\/=]{20,}/gi,
    type: 'encoded_payload',
    severity: 'high',
    description: 'Base64 encoded content',
  },
  {
    pattern: /\\x[0-9a-fA-F]{2}(\\x[0-9a-fA-F]{2}){3,}/g,
    type: 'encoded_payload',
    severity: 'high',
    description: 'Hex-encoded payload',
  },
  {
    pattern: /\\u[0-9a-fA-F]{4}(\\u[0-9a-fA-F]{4}){3,}/g,
    type: 'encoded_payload',
    severity: 'medium',
    description: 'Unicode-encoded payload',
  },

  // Hidden text / steganography
  {
    pattern: /[\u200b-\u200f\u2028-\u202f\u2060-\u206f]/g,
    type: 'hidden_text',
    severity: 'high',
    description: 'Zero-width characters detected',
  },
  {
    pattern: /<[^>]*style\s*=\s*["'][^"']*color\s*:\s*(white|#fff|#ffffff|transparent|rgba\([^)]*,\s*0\))/gi,
    type: 'hidden_text',
    severity: 'high',
    description: 'Hidden text via CSS color',
  },
  {
    pattern: /<[^>]*style\s*=\s*["'][^"']*font-size\s*:\s*0/gi,
    type: 'hidden_text',
    severity: 'high',
    description: 'Hidden text via zero font size',
  },

  // URL/endpoint injection
  {
    pattern: /(fetch|get|post|request|call|visit|curl|wget)\s+(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(com|io|net|org|ai))/gi,
    type: 'url_injection',
    severity: 'medium',
    description: 'External URL reference',
  },
  {
    pattern: /webhook[:\s]+https?:\/\//gi,
    type: 'url_injection',
    severity: 'high',
    description: 'Webhook URL injection',
  },

  // Data exfiltration
  {
    pattern: /(send|post|upload|share|transmit)\s+(this|the|all|my)\s+(data|information|content|file|message)/gi,
    type: 'data_exfiltration',
    severity: 'high',
    description: 'Potential data exfiltration',
  },
  {
    pattern: /(copy|paste|transfer)\s+(to|into)\s+(clipboard|external|another|remote)/gi,
    type: 'data_exfiltration',
    severity: 'medium',
    description: 'Data transfer attempt',
  },

  // Jailbreak attempts
  {
    pattern: /(dan|dude|evil|jailbreak|unrestricted)\s*(mode|prompt|version)/gi,
    type: 'jailbreak_attempt',
    severity: 'high',
    description: 'Known jailbreak pattern',
  },
  {
    pattern: /pretend\s+(you\s+)?(are|can|have|don't\s+have)\s+(no\s+)?(restrictions?|limits?|rules?|guidelines?)/gi,
    type: 'jailbreak_attempt',
    severity: 'critical',
    description: 'Attempt to bypass restrictions',
  },
  {
    pattern: /roleplay\s+as\s+(a|an)\s+(unrestricted|unlimited|evil|hacker)/gi,
    type: 'jailbreak_attempt',
    severity: 'high',
    description: 'Roleplay-based jailbreak',
  },
  {
    pattern: /hypothetically,?\s+(if|what\s+if)\s+(you|there)\s+(were|was|had)\s+(no|zero)/gi,
    type: 'jailbreak_attempt',
    severity: 'medium',
    description: 'Hypothetical scenario bypass',
  },
];

// Patterns for detecting leaked credentials in outbound content
const CREDENTIAL_LEAK_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  description: string;
}> = [
  // API Keys
  { pattern: /sk-[a-zA-Z0-9]{20,}/, type: 'openai_key', description: 'OpenAI API key' },
  { pattern: /sk-ant-[a-zA-Z0-9-]{40,}/, type: 'anthropic_key', description: 'Anthropic API key' },
  { pattern: /AIza[a-zA-Z0-9_-]{35}/, type: 'google_key', description: 'Google API key' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, type: 'github_token', description: 'GitHub personal access token' },
  { pattern: /gho_[a-zA-Z0-9]{36}/, type: 'github_oauth', description: 'GitHub OAuth token' },
  { pattern: /xai-[a-zA-Z0-9]{40,}/, type: 'xai_key', description: 'xAI API key' },
  { pattern: /xoxb-[a-zA-Z0-9-]+/, type: 'slack_bot', description: 'Slack bot token' },
  { pattern: /xoxp-[a-zA-Z0-9-]+/, type: 'slack_user', description: 'Slack user token' },
  { pattern: /AKIA[A-Z0-9]{16}/, type: 'aws_access_key', description: 'AWS access key ID' },
  { pattern: /[a-zA-Z0-9\/+]{40}/, type: 'aws_secret_key', description: 'Potential AWS secret key' },

  // Crypto wallets
  { pattern: /0x[a-fA-F0-9]{40}/, type: 'eth_address', description: 'Ethereum address' },
  { pattern: /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/, type: 'btc_address', description: 'Bitcoin address' },

  // Private keys
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, type: 'rsa_private_key', description: 'RSA private key' },
  { pattern: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/, type: 'ec_private_key', description: 'EC private key' },
  { pattern: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/, type: 'ssh_private_key', description: 'SSH private key' },

  // Connection strings
  { pattern: /mongodb(\+srv)?:\/\/[^\s]+/, type: 'mongodb_uri', description: 'MongoDB connection string' },
  { pattern: /postgres(ql)?:\/\/[^\s]+/, type: 'postgres_uri', description: 'PostgreSQL connection string' },
  { pattern: /mysql:\/\/[^\s]+/, type: 'mysql_uri', description: 'MySQL connection string' },
  { pattern: /redis:\/\/[^\s]+/, type: 'redis_uri', description: 'Redis connection string' },

  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/, type: 'jwt_token', description: 'JWT token' },

  // Passwords in common formats
  { pattern: /password\s*[=:]\s*["']?[^\s"']{8,}["']?/i, type: 'password', description: 'Password in text' },
  { pattern: /secret\s*[=:]\s*["']?[^\s"']{8,}["']?/i, type: 'secret', description: 'Secret in text' },
];

// ============================================================================
// SANITIZATION ENGINE
// ============================================================================

export class ContentSanitizer {
  private strictMode: boolean;

  constructor(strictMode: boolean = true) {
    this.strictMode = strictMode;
  }

  /**
   * Sanitize incoming content (from Moltbook, emails, web, etc.)
   */
  sanitizeIncoming(content: string, source: string = 'unknown'): SanitizationResult {
    const threats: ThreatDetection[] = [];
    let sanitized = content;

    // Stage 1: Pattern-based detection
    for (const { pattern, type, severity, description } of INJECTION_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;

      while ((match = regex.exec(content)) !== null) {
        threats.push({
          type,
          severity,
          pattern: pattern.source,
          match: match[0],
          position: match.index,
          description,
        });
      }
    }

    // Stage 2: Remove/neutralize detected threats
    if (this.strictMode) {
      sanitized = this.neutralizeThreats(sanitized, threats);
    }

    // Stage 3: Remove hidden characters
    sanitized = this.removeHiddenCharacters(sanitized);

    // Calculate safety score
    const criticalCount = threats.filter(t => t.severity === 'critical').length;
    const highCount = threats.filter(t => t.severity === 'high').length;
    const mediumCount = threats.filter(t => t.severity === 'medium').length;

    const confidence = Math.max(0, 1 - (criticalCount * 0.4 + highCount * 0.2 + mediumCount * 0.1));
    const safe = criticalCount === 0 && highCount === 0 && (this.strictMode || mediumCount === 0);

    console.log(`[SANITIZER] Source: ${source}, Threats: ${threats.length}, Safe: ${safe}`);

    return {
      safe,
      sanitized,
      threats,
      confidence,
      tainted: true, // All external content is tainted
    };
  }

  /**
   * Sanitize outgoing content (before posting to Moltbook, etc.)
   * Ensures we never leak credentials
   */
  sanitizeOutgoing(content: string): { safe: boolean; sanitized: string; leaks: string[] } {
    const leaks: string[] = [];
    let sanitized = content;

    for (const { pattern, type, description } of CREDENTIAL_LEAK_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags || 'g');

      if (regex.test(content)) {
        leaks.push(`${type}: ${description}`);
        // Redact the sensitive content
        sanitized = sanitized.replace(regex, `[REDACTED:${type}]`);
      }
    }

    const safe = leaks.length === 0;

    if (!safe) {
      console.warn(`[SANITIZER] Blocked credential leak: ${leaks.join(', ')}`);
    }

    return { safe, sanitized, leaks };
  }

  /**
   * Neutralize threats by replacing suspicious patterns
   */
  private neutralizeThreats(content: string, threats: ThreatDetection[]): string {
    let result = content;

    // Sort by position descending so we don't mess up indices
    const sortedThreats = [...threats].sort((a, b) => b.position - a.position);

    for (const threat of sortedThreats) {
      if (threat.severity === 'critical' || threat.severity === 'high') {
        // Replace the threat with a safe placeholder
        const before = result.substring(0, threat.position);
        const after = result.substring(threat.position + threat.match.length);
        result = before + `[BLOCKED:${threat.type}]` + after;
      }
    }

    return result;
  }

  /**
   * Remove zero-width and other hidden characters
   */
  private removeHiddenCharacters(content: string): string {
    // Remove zero-width characters
    let result = content.replace(/[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '');

    // Remove control characters except newlines and tabs
    result = result.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

    return result;
  }

  /**
   * Check if content is likely a prompt injection (quick check)
   */
  isLikelyInjection(content: string): boolean {
    const loweredContent = content.toLowerCase();

    const quickPatterns = [
      'ignore previous',
      'ignore all',
      'disregard',
      'forget everything',
      'new instructions',
      'you are now',
      'pretend you',
      'system prompt',
      'reveal your',
      'jailbreak',
      'dan mode',
    ];

    return quickPatterns.some(p => loweredContent.includes(p));
  }

  /**
   * Extract safe text content from potentially malicious HTML
   */
  extractSafeText(html: string): string {
    // Remove all HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Remove hidden characters
    text = this.removeHiddenCharacters(text);

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }
}

// Singleton instance
let sanitizerInstance: ContentSanitizer | null = null;

export function getSanitizer(strictMode: boolean = true): ContentSanitizer {
  if (!sanitizerInstance) {
    sanitizerInstance = new ContentSanitizer(strictMode);
  }
  return sanitizerInstance;
}

export default ContentSanitizer;
