/**
 * GET /api/openclaw/google/oauth/url — get Google OAuth authorization URL.
 * Requires a credential in vault with service "google_oauth_client" and permission "google:oauth"
 * (value = JSON { client_id, client_secret }).
 */

import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/security/credential-vault";
import { getGoogleAuthUrl } from "@/lib/openclaw-google";

function getRedirectUri(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;
  return `${base}/api/openclaw/google/oauth/callback`;
}

export async function GET(req: NextRequest) {
  try {
    const vault = getVault();
    const credentials = vault.list();
    const clientCred = credentials.find((c) => c.service === "google_oauth_client");
    if (!clientCred) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google OAuth client not configured. Add client_id and client_secret in Settings → Google OAuth.",
        },
        { status: 400 }
      );
    }
    const redirectUri = getRedirectUri(req);
    const url = await vault.executeWithCredential(
      clientCred.id,
      "google:oauth",
      async (value) => {
        const config = JSON.parse(value) as { client_id: string; client_secret: string };
        return getGoogleAuthUrl(config.client_id, config.client_secret, redirectUri);
      }
    );
    return NextResponse.json({ success: true, url });
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.includes("Vault not initialized")
    ) {
      return NextResponse.json(
        { success: false, error: "Vault not initialized. Set VAULT_MASTER_PASSWORD." },
        { status: 503 }
      );
    }
    const msg = e instanceof Error ? e.message : "Failed to get OAuth URL";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
