/**
 * POST /api/openclaw/gateway/start — start the OpenClaw Gateway as a background process.
 * Kills any existing process on the gateway port first to prevent zombie processes.
 */

import { NextResponse } from "next/server";
import { startGateway, pingGateway, killProcessOnGatewayPort } from "@/lib/openclaw";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    // Kill any existing process on the gateway port (prevents zombie accumulation)
    await killProcessOnGatewayPort();
    await sleep(1500); // Allow port to be released

    // Start the gateway
    const result = startGateway();
    if (!result.ok) {
      const msg = result.error?.error?.message ?? "Failed to start Gateway";
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }

    // Wait and verify it actually started using exponential backoff
    // Total wait: 500 + 500 + 1000 + 1000 + 1500 + 1500 + 2000 + 2000 + 2500 + 2500 = 15s
    // This gives the gateway time to initialize while checking frequently at first
    let verified = false;
    const delays = [500, 500, 1000, 1000, 1500, 1500, 2000, 2000, 2500, 2500];

    for (const delay of delays) {
      await sleep(delay);
      if (await pingGateway()) {
        verified = true;
        break;
      }
    }

    if (verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Gateway started and verified running.",
      });
    } else {
      return NextResponse.json({
        success: true,
        verified: false,
        message: "Gateway spawn attempted, but could not verify it started. It may take a few more seconds, or check the terminal for errors.",
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to start Gateway";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
