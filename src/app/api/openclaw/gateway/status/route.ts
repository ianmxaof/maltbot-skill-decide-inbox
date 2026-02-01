/**
 * GET /api/openclaw/gateway/status — check if the Gateway is reachable.
 */

import { NextResponse } from "next/server";
import { pingGateway } from "@/lib/openclaw";

export async function GET() {
  try {
    const ok = await pingGateway();
    return NextResponse.json({ running: ok });
  } catch {
    return NextResponse.json({ running: false });
  }
}
