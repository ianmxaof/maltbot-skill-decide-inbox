/**
 * GET /api/openclaw/config — read config (prefer gateway call, fallback file)
 * PATCH /api/openclaw/config — partial update (prefer gateway call, fallback file)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { gatewayCall } from "@/lib/openclaw";
import { readConfig, patchConfig } from "@/lib/openclaw-config";

const PatchConfigSchema = z.object({
  raw: z.string().optional(),
  partial: z.record(z.unknown()).optional(),
  baseHash: z.string().optional(),
});

export async function GET() {
  try {
    const gw = await gatewayCall("config.get", {});
    if (gw.ok) {
      const data = gw.data as { config?: unknown; hash?: string };
      return NextResponse.json({
        success: true,
        config: data.config ?? {},
        hash: data.hash,
      });
    }
    const { config } = await readConfig();
    return NextResponse.json({ success: true, config, hash: undefined });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read config";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(PatchConfigSchema, body);
    if (!parsed.ok) return parsed.response;
    const { raw: rawField, partial: partialField, baseHash } = parsed.data;

    const raw = typeof rawField === "string" ? rawField : JSON.stringify(partialField ?? body);
    let partial: Record<string, unknown>;
    try {
      partial = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }
    if (baseHash) {
      const gw = await gatewayCall("config.patch", {
        raw: JSON.stringify(partial),
        baseHash,
        restartDelayMs: 2000,
      });
      if (gw.ok) return NextResponse.json({ success: true });
    }
    await patchConfig(partial);
    return NextResponse.json({
      success: true,
      note: "Config written. Restart Gateway for changes to take effect.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to patch config";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
