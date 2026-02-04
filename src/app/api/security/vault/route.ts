import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/security/credential-vault";
import type { CredentialPermission } from "@/lib/security/credential-vault";

/**
 * GET /api/security/vault
 * List credential metadata (no secrets). Returns [] if vault not initialized.
 */
export async function GET() {
  try {
    const vault = getVault();
    const credentials = vault.list();
    return NextResponse.json({ credentials });
  } catch (error) {
    // Vault not initialized - return empty list so UI can still show
    if (
      error instanceof Error &&
      error.message.includes("Vault not initialized")
    ) {
      return NextResponse.json({ credentials: [] });
    }
    console.error("[API] security/vault GET:", error);
    return NextResponse.json(
      { error: "Failed to list credentials" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/vault
 * Store a new credential. Requires VAULT_MASTER_PASSWORD in env.
 * Body: { service: string, label: string, value: string, permissions?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, label, value, permissions } = body as {
      service?: string;
      label?: string;
      value?: string;
      permissions?: string[];
    };

    if (!service || !label || typeof value !== "string") {
      return NextResponse.json(
        { error: "Missing required fields: service, label, value" },
        { status: 400 }
      );
    }

    const vault = getVault();
    const perms = (permissions as CredentialPermission[] | undefined) ?? [];
    const id = vault.store(service, label, value, perms);
    return NextResponse.json({ id, ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Vault not initialized")
    ) {
      return NextResponse.json(
        {
          error:
            "Vault not initialized. Set VAULT_MASTER_PASSWORD (min 16 chars) in environment.",
        },
        { status: 503 }
      );
    }
    console.error("[API] security/vault POST:", error);
    return NextResponse.json(
      { error: "Failed to store credential" },
      { status: 500 }
    );
  }
}
