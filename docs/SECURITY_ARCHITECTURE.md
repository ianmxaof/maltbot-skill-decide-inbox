# PowerCore Security Architecture

## Threat Landscape Analysis (February 2026)

Based on extensive research into Moltbook, OpenClaw, and agentic AI security incidents.

---

## 🚨 Critical Incidents This Week

| Incident | Impact | Root Cause |
|----------|--------|------------|
| **Moltbook Database Exposure** | 1.5M API keys, 35K emails, private DMs exposed | Supabase RLS misconfiguration |
| **CVE-2026-25253** | 1-click RCE via malicious link | WebSocket origin not validated |
| **Malicious Skills Campaign** | 230+ packages stealing credentials | No skill verification/signing |
| **Exposed Control UIs** | ~1,100 instances on Shodan | Default config binds to 0.0.0.0 |
| **Plaintext Credential Storage** | Redline/Lumma/Vidar targeting | Secrets in JSON/Markdown files |

---

## The RAK Framework (Threat Model)

### 1. Root Risk (Host Compromise)
**Attack Vector:** Prompt injection → Shell command execution → Full host control

### 2. Agency Risk (Uncontrolled Actions)
**Attack Vector:** Hallucinations or poor instruction-following → Destructive actions

### 3. Keys Risk (Credential Theft)
**Attack Vector:** Plaintext storage + Prompt injection → Credential exfiltration

---

## Security Architecture for PowerCore Dashboard

### Layer 1: Credential Isolation (Never Touch Raw Keys)
- Keys encrypted at rest with AES-256-GCM
- Master key derived from user password (PBKDF2)
- Broker injects credentials server-side; agent never sees raw keys

### Layer 2: Execution Sandbox (Contain the Blast Radius)
- Read-only rootfs, no shell by default, network via proxy
- Approval gateway for tool calls; audit log of every operation

### Layer 3: Content Sanitization (Prompt Injection Defense)
- Pattern detection (injection, extraction, command execution, credential extraction, encoded payloads, hidden text, jailbreak)
- Outbound leak detection before posting

### Layer 4: Human Decision Choke-Point
- Level 0: Auto-approve (read-only, upvotes)
- Level 1: Approve with context (posts, follows)
- Level 2: Explicit confirmation (DMs, API calls)
- Level 3: Blocked by default (shell, credentials)

### Layer 5: Anomaly Detection (Real-Time Monitoring)
- Behavioral baselines; rate spikes, unusual file/network access, credential patterns, self-modification attempts
- Auto-pause and alert on anomalies

### Layer 6: Skill Verification (Supply Chain Security)
- Signature check, static analysis, permission manifest, sandbox testing

---

See [SECURITY-LAYER.md](./SECURITY-LAYER.md) for implementation details and API reference.
