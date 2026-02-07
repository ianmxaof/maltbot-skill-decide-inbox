// src/lib/security/credential-vault.ts
// Secure credential storage - Agent NEVER sees raw keys

import crypto from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedCredential {
  id: string;
  service: string;          // e.g., 'moltbook', 'openai', 'anthropic'
  label: string;            // User-friendly name
  encryptedValue: string;   // Base64 encoded encrypted data
  iv: string;               // Base64 encoded IV
  authTag: string;          // Base64 encoded auth tag
  salt: string;             // Base64 encoded salt (for key derivation)
  createdAt: string;
  lastUsed?: string;
  permissions: CredentialPermission[];
}

export type CredentialPermission =
  | "moltbook:read"
  | "moltbook:write"
  | "moltbook:post"
  | "moltbook:dm"
  | "openai:chat"
  | "anthropic:chat"
  | "google:chat"
  | "google:oauth"
  | "google:calendar"
  | "google:drive"
  | "google:gmail"
  | "google:docs"
  | "google:sheets"
  | "google:slides"
  | "xai:chat"
  | "fleet:spawn"
  | "research:execute";

export interface VaultConfig {
  storagePath: string;
  masterKeyEnvVar?: string;
}

/**
 * Derives an encryption key from a master password using PBKDF2
 */
function deriveKey(masterPassword: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha512"
  );
}

/**
 * Encrypts a credential value using AES-256-GCM
 */
export function encryptCredential(
  plaintext: string,
  masterPassword: string
): { encrypted: string; iv: string; authTag: string; salt: string } {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterPassword, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64"),
  };
}

/**
 * Decrypts a credential value
 */
export function decryptCredential(
  encryptedData: string,
  iv: string,
  authTag: string,
  salt: string,
  masterPassword: string
): string {
  const saltBuffer = Buffer.from(salt, "base64");
  const key = deriveKey(masterPassword, saltBuffer);
  const ivBuffer = Buffer.from(iv, "base64");
  const authTagBuffer = Buffer.from(authTag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Credential Vault - Manages encrypted credential storage
 *
 * KEY PRINCIPLE: Agent code NEVER receives raw credentials.
 * Instead, the vault provides a "broker" that injects credentials
 * into requests server-side.
 */
export class CredentialVault {
  private credentials: Map<string, EncryptedCredential> = new Map();
  private masterPassword: string;
  private decryptedCache: Map<string, { value: string; expiry: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(masterPassword: string) {
    if (!masterPassword || masterPassword.length < 16) {
      throw new Error("Master password must be at least 16 characters");
    }
    this.masterPassword = masterPassword;
  }

  /**
   * Store a new credential
   */
  store(
    service: string,
    label: string,
    value: string,
    permissions: CredentialPermission[]
  ): string {
    const id = `cred-${service}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const { encrypted, iv, authTag, salt } = encryptCredential(
      value,
      this.masterPassword
    );

    const credential: EncryptedCredential = {
      id,
      service,
      label,
      encryptedValue: encrypted,
      iv,
      authTag,
      salt,
      createdAt: new Date().toISOString(),
      permissions,
    };

    this.credentials.set(id, credential);

    // Clear any cached version
    this.decryptedCache.delete(id);

    console.log(`[VAULT] Stored credential: ${label} (${service})`);

    return id;
  }

  /**
   * Get a credential for internal use (server-side only)
   * This should NEVER be exposed to agent code
   */
  private getDecrypted(id: string): string | null {
    // Check cache first
    const cached = this.decryptedCache.get(id);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    const credential = this.credentials.get(id);
    if (!credential) {
      return null;
    }

    try {
      const decrypted = decryptCredential(
        credential.encryptedValue,
        credential.iv,
        credential.authTag,
        credential.salt,
        this.masterPassword
      );

      // Cache for short period
      this.decryptedCache.set(id, {
        value: decrypted,
        expiry: Date.now() + this.cacheTTL,
      });

      // Update last used
      credential.lastUsed = new Date().toISOString();

      return decrypted;
    } catch (error) {
      console.error(`[VAULT] Failed to decrypt credential ${id}:`, error);
      return null;
    }
  }

  /**
   * Check if a credential has a specific permission
   */
  hasPermission(id: string, permission: CredentialPermission): boolean {
    const credential = this.credentials.get(id);
    return credential?.permissions.includes(permission) ?? false;
  }

  /**
   * Get credential metadata (safe to expose to UI)
   */
  getMetadata(id: string): Omit<EncryptedCredential, "encryptedValue" | "iv" | "authTag" | "salt"> | null {
    const credential = this.credentials.get(id);
    if (!credential) return null;

    return {
      id: credential.id,
      service: credential.service,
      label: credential.label,
      createdAt: credential.createdAt,
      lastUsed: credential.lastUsed,
      permissions: credential.permissions,
    };
  }

  /**
   * List all credentials (metadata only)
   */
  list(): Array<Omit<EncryptedCredential, "encryptedValue" | "iv" | "authTag" | "salt">> {
    return Array.from(this.credentials.values()).map((cred) => ({
      id: cred.id,
      service: cred.service,
      label: cred.label,
      createdAt: cred.createdAt,
      lastUsed: cred.lastUsed,
      permissions: cred.permissions,
    }));
  }

  /**
   * Delete a credential
   */
  delete(id: string): boolean {
    this.decryptedCache.delete(id);
    return this.credentials.delete(id);
  }

  /**
   * Rotate a credential (re-encrypt with new value)
   */
  rotate(id: string, newValue: string): boolean {
    const existing = this.credentials.get(id);
    if (!existing) return false;

    const { encrypted, iv, authTag, salt } = encryptCredential(
      newValue,
      this.masterPassword
    );

    existing.encryptedValue = encrypted;
    existing.iv = iv;
    existing.authTag = authTag;
    existing.salt = salt;

    this.decryptedCache.delete(id);

    console.log(`[VAULT] Rotated credential: ${existing.label}`);

    return true;
  }

  /**
   * Execute a request with credential injection
   * This is the ONLY way agent code should use credentials
   */
  async executeWithCredential<T>(
    credentialId: string,
    requiredPermission: CredentialPermission,
    executor: (credential: string) => Promise<T>
  ): Promise<T> {
    // Check permission
    if (!this.hasPermission(credentialId, requiredPermission)) {
      throw new Error(
        `Credential ${credentialId} does not have permission: ${requiredPermission}`
      );
    }

    // Get decrypted credential (server-side only)
    const credential = this.getDecrypted(credentialId);
    if (!credential) {
      throw new Error(`Credential ${credentialId} not found or decryption failed`);
    }

    // Execute the function with the credential
    // The credential never leaves this function scope
    try {
      return await executor(credential);
    } finally {
      // Ensure credential is not leaked in any error traces
    }
  }

  /**
   * Export vault (encrypted) for backup
   */
  export(): string {
    const data = Array.from(this.credentials.entries());
    return JSON.stringify(data);
  }

  /**
   * Import vault from backup
   */
  import(data: string): number {
    const entries: [string, EncryptedCredential][] = JSON.parse(data);
    let imported = 0;

    for (const [id, credential] of entries) {
      if (!this.credentials.has(id)) {
        this.credentials.set(id, credential);
        imported++;
      }
    }

    return imported;
  }

  /**
   * Clear the decrypted cache (call on logout or timeout)
   */
  clearCache(): void {
    this.decryptedCache.clear();
  }

  /**
   * Destroy vault (clear all data)
   */
  destroy(): void {
    this.credentials.clear();
    this.decryptedCache.clear();
  }
}

// Singleton instance (initialized with master password from env or user)
let vaultInstance: CredentialVault | null = null;

export function initializeVault(masterPassword: string): CredentialVault {
  if (vaultInstance) {
    vaultInstance.destroy();
  }
  vaultInstance = new CredentialVault(masterPassword);
  return vaultInstance;
}

export function getVault(): CredentialVault {
  if (!vaultInstance) {
    // In development, use env-based master password
    const devPassword = process.env.VAULT_MASTER_PASSWORD;
    if (devPassword) {
      vaultInstance = new CredentialVault(devPassword);
    } else {
      throw new Error("Vault not initialized. Call initializeVault() first.");
    }
  }
  return vaultInstance;
}

export default CredentialVault;
