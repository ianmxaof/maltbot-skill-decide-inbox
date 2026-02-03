# Security Layer

The dashboard includes a **security layer** that protects agent operations and credentials. It is exposed on the **Security** tab and via API routes under `/api/security/*`.

## Components

### 1. Credential Vault

- **Purpose:** Store API keys and secrets encrypted at rest. The agent never sees raw credentials; the vault injects them server-side when needed.
- **Implementation:** AES-256-GCM encryption; master key derived from `VAULT_MASTER_PASSWORD` (env, min 16 chars).
- **UI:** Security → Credential Vault: list (metadata only), add, delete. Add credential is only available when the vault is initialized (env set).
- **API:**
  - `GET /api/security/vault` — list credential metadata (returns `[]` if vault not initialized).
  - `POST /api/security/vault` — store credential (body: `service`, `label`, `value`, optional `permissions`). Requires `VAULT_MASTER_PASSWORD`.
  - `DELETE /api/security/vault/[id]` — delete credential.

### 2. Content Sanitizer

- **Purpose:** Defend against prompt injection and credential leaks. Sanitizes incoming content (Moltbook, web, etc.) and outgoing content before posting.
- **Implementation:** Pattern-based detection (instruction injection, system prompt extraction, command execution, credential extraction, encoded payloads, hidden text, jailbreak attempts). Outbound leak detection (API keys, private keys, connection strings, etc.).
- **Usage:** Used internally by the security middleware when checking operations. Can be used via `quickSecurityCheck()` and `checkForLeaks()` from `@/lib/security`.

### 3. Anomaly Detector

- **Purpose:** Real-time behavior monitoring. Detects rate spikes, unusual file/network access, self-modification attempts, exfiltration, credential exposure, recursive prompts.
- **Implementation:** Behavioral baseline (posts/comments/API calls per hour); pattern checks for dangerous paths and domains; auto-pause on emergency.
- **API:**
  - `GET /api/security/anomalies` — list anomalies (query: `since`, `limit`).
  - `POST /api/security/anomalies/[id]/review` — mark anomaly as reviewed.

### 4. Security Middleware

- **Purpose:** Wraps agent operations with approval levels, content checks, and audit logging. Operations are classified (e.g. read-only = auto-approve, DMs/API = explicit confirmation, shell/credentials = blocked by default).
- **Implementation:** Uses sanitizer and anomaly detector; maintains pending approvals and audit log (last 10k entries).
- **API:**
  - `GET /api/security/stats` — stats (totalOperations, allowed, blocked, pendingApprovals, anomalies, isPaused).
  - `GET /api/security/approvals` — pending approval requests.
  - `POST /api/security/approvals/[id]/approve` — approve (body: optional `approvedBy`).
  - `POST /api/security/approvals/[id]/deny` — deny (body: optional `deniedBy`, `reason`).
  - `GET /api/security/audit` — audit log (query: `since`, `result`, `limit`).
  - `POST /api/security/pause` — pause agent execution.
  - `POST /api/security/resume` — resume agent execution.

## Dashboard (Security tab)

- **Overview:** Security layers status + recent audit activity.
- **Anomalies:** List of detected anomalies; “Mark reviewed” for items requiring review.
- **Approvals:** Pending operations; Approve / Deny.
- **Credential Vault:** List credentials (metadata), Add (when vault initialized), Delete.
- **Audit Log:** Table of operations with result, operation, target, source, reason.

Pause/Resume and stats refresh every 10 seconds from the API.

## Environment

- **VAULT_MASTER_PASSWORD** (optional): Enables the credential vault. If set (min 16 characters), `GET /api/security/vault` uses it to initialize the vault and `POST /api/security/vault` can store credentials. If not set, vault list returns `[]` and store returns 503 with an explanatory message.

## Architecture

See [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) for the full threat model (RAK framework, lethal trifecta) and layers: credential isolation, execution sandbox, content sanitization, human decision choke-point, anomaly detection, skill verification. This implementation covers credential vault, content sanitization, approval gateway, anomaly detection, and audit logging; sandbox and skill verification are separate (OpenClaw / skills).
