/**
 * GET    /api/integrations?pairId=xxx              — List connected integrations
 * POST   /api/integrations                         — Connect an integration
 * DELETE /api/integrations                         — Disconnect an integration
 * GET    /api/integrations?providers=true           — List available providers
 */

import { NextRequest, NextResponse } from "next/server";
import {
  connectIntegration,
  disconnectIntegration,
  getIntegrationsForPair,
} from "@/lib/integrations/store";
import { getAllProviders, getProvider } from "@/lib/integrations/registry";
import { fetchHNProfileData } from "@/lib/integrations/providers/hackernews";
import type { IntegrationProviderId } from "@/types/integration";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // List available providers
    if (url.searchParams.get("providers") === "true") {
      const providers = getAllProviders();
      return NextResponse.json({ success: true, providers });
    }

    // List connected integrations for a pair
    const pairId = url.searchParams.get("pairId")?.trim();
    if (!pairId) {
      return NextResponse.json(
        { success: false, error: "pairId required" },
        { status: 400 }
      );
    }

    const integrations = await getIntegrationsForPair(pairId);
    return NextResponse.json({ success: true, integrations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get integrations";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pairId, providerId, connectionData } = body;

    if (!pairId || !providerId) {
      return NextResponse.json(
        { success: false, error: "pairId and providerId required" },
        { status: 400 }
      );
    }

    const provider = getProvider(providerId as IntegrationProviderId);
    if (!provider) {
      return NextResponse.json(
        { success: false, error: `Unknown provider: ${providerId}` },
        { status: 400 }
      );
    }

    // Validate required connection fields
    for (const field of provider.connectionFields) {
      if (field.required && !connectionData?.[field.key]?.trim()) {
        return NextResponse.json(
          { success: false, error: `${field.label} is required` },
          { status: 400 }
        );
      }
    }

    // Validate the connection by fetching data (provider-specific)
    let displayName = connectionData?.username ?? connectionData?.handle ?? providerId;
    let validationError: string | undefined;

    if (providerId === "hackernews") {
      const hnData = await fetchHNProfileData(connectionData.username);
      if (!hnData) {
        validationError = `HN user "${connectionData.username}" not found`;
      } else {
        displayName = connectionData.username;
      }
    }

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const integration = await connectIntegration(
      pairId,
      providerId as IntegrationProviderId,
      displayName,
      connectionData ?? {}
    );

    return NextResponse.json({ success: true, integration });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { pairId, providerId } = body;

    if (!pairId || !providerId) {
      return NextResponse.json(
        { success: false, error: "pairId and providerId required" },
        { status: 400 }
      );
    }

    const ok = await disconnectIntegration(pairId, providerId as IntegrationProviderId);
    return NextResponse.json({ success: ok });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to disconnect";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
