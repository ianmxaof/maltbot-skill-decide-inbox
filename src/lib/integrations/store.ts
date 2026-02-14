/**
 * Integration Connection Store — The Nightly Build
 *
 * Persists connected integrations (linked accounts) per pair.
 * Tokens/credentials stored in connectionData — in production,
 * sensitive fields should use the credential vault.
 */

import { kv } from "@/lib/db";
import type { ConnectedIntegration, IntegrationProviderId } from "@/types/integration";

const INTEGRATIONS_FILE = "integrations-connected";

async function readAll(): Promise<ConnectedIntegration[]> {
  return (await kv.get<ConnectedIntegration[]>(INTEGRATIONS_FILE)) ?? [];
}

async function writeAll(data: ConnectedIntegration[]): Promise<void> {
  await kv.set(INTEGRATIONS_FILE, data);
}

/**
 * Connect an integration for a pair.
 * Replaces any existing connection for the same provider.
 */
export async function connectIntegration(
  pairId: string,
  providerId: IntegrationProviderId,
  displayName: string,
  connectionData: Record<string, string>
): Promise<ConnectedIntegration> {
  const all = await readAll();

  // Remove existing connection for this provider + pair
  const filtered = all.filter(
    c => !(c.pairId === pairId && c.providerId === providerId)
  );

  const connection: ConnectedIntegration = {
    id: `int_${providerId}_${Date.now()}`,
    pairId,
    providerId,
    displayName,
    connectionData,
    active: true,
    showOnProfile: true,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  filtered.push(connection);
  await writeAll(filtered);
  return connection;
}

/**
 * Disconnect an integration.
 */
export async function disconnectIntegration(
  pairId: string,
  providerId: IntegrationProviderId
): Promise<boolean> {
  const all = await readAll();
  const filtered = all.filter(
    c => !(c.pairId === pairId && c.providerId === providerId)
  );
  if (filtered.length === all.length) return false;
  await writeAll(filtered);
  return true;
}

/**
 * Get all connected integrations for a pair.
 */
export async function getIntegrationsForPair(
  pairId: string
): Promise<ConnectedIntegration[]> {
  const all = await readAll();
  return all.filter(c => c.pairId === pairId);
}

/**
 * Get a specific integration connection.
 */
export async function getIntegration(
  pairId: string,
  providerId: IntegrationProviderId
): Promise<ConnectedIntegration | null> {
  const all = await readAll();
  return all.find(
    c => c.pairId === pairId && c.providerId === providerId
  ) ?? null;
}

/**
 * Update sync status for an integration.
 */
export async function updateSyncStatus(
  pairId: string,
  providerId: IntegrationProviderId,
  status: { lastSyncAt?: string; lastError?: string }
): Promise<void> {
  const all = await readAll();
  const idx = all.findIndex(
    c => c.pairId === pairId && c.providerId === providerId
  );
  if (idx < 0) return;

  all[idx] = {
    ...all[idx],
    ...status,
    updatedAt: new Date().toISOString(),
  };
  await writeAll(all);
}

/**
 * Toggle whether an integration is shown on the profile.
 */
export async function toggleProfileVisibility(
  pairId: string,
  providerId: IntegrationProviderId
): Promise<boolean> {
  const all = await readAll();
  const idx = all.findIndex(
    c => c.pairId === pairId && c.providerId === providerId
  );
  if (idx < 0) return false;

  all[idx].showOnProfile = !all[idx].showOnProfile;
  all[idx].updatedAt = new Date().toISOString();
  await writeAll(all);
  return all[idx].showOnProfile;
}
