/**
 * GET /api/integrations/data?pairId=xxx&providerId=yyy
 *
 * Fetch live data from a connected integration provider.
 * Used by profile widgets to get real-time data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getIntegration, updateSyncStatus, connectIntegration } from "@/lib/integrations/store";
import { fetchHNProfileData } from "@/lib/integrations/providers/hackernews";
import { fetchSpotifyProfileData, getValidToken } from "@/lib/integrations/providers/spotify";
import type { IntegrationProviderId, SpotifyTokens } from "@/types/integration";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId")?.trim();
    const providerId = url.searchParams.get("providerId")?.trim() as IntegrationProviderId;

    if (!pairId || !providerId) {
      return NextResponse.json(
        { success: false, error: "pairId and providerId required" },
        { status: 400 }
      );
    }

    // Verify integration is connected
    const integration = await getIntegration(pairId, providerId);
    if (!integration || !integration.active) {
      return NextResponse.json(
        { success: false, error: "Integration not connected" },
        { status: 404 }
      );
    }

    // Fetch data based on provider
    let data;
    try {
      switch (providerId) {
        case "hackernews": {
          const username = integration.connectionData.username;
          data = await fetchHNProfileData(username);
          break;
        }
        case "spotify": {
          const tokens: SpotifyTokens = {
            accessToken: integration.connectionData.accessToken,
            refreshToken: integration.connectionData.refreshToken,
            expiresAt: Number(integration.connectionData.expiresAt),
            scope: integration.connectionData.scope ?? "",
          };
          // Ensure token is fresh
          const { accessToken, tokens: newTokens, refreshed } = await getValidToken(tokens);
          if (refreshed) {
            // Persist refreshed tokens
            await connectIntegration(pairId, "spotify", integration.displayName, {
              ...integration.connectionData,
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
              expiresAt: String(newTokens.expiresAt),
            });
          }
          data = await fetchSpotifyProfileData({ ...tokens, accessToken });
          break;
        }
        default:
          return NextResponse.json(
            { success: false, error: `Provider ${providerId} data fetch not implemented` },
            { status: 501 }
          );
      }

      if (data) {
        await updateSyncStatus(pairId, providerId, {
          lastSyncAt: new Date().toISOString(),
          lastError: undefined,
        });
      }
    } catch (fetchErr) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : "Fetch failed";
      await updateSyncStatus(pairId, providerId, { lastError: errMsg });
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch integration data";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
