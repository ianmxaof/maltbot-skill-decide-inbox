/**
 * Timed Permissions API
 *
 * GET  /api/security/permissions              — List active permissions
 * GET  /api/security/permissions?all=1        — List all (inc. expired/revoked)
 * POST /api/security/permissions              — Grant a new timed permission
 * POST /api/security/permissions?action=revoke — Revoke a permission
 * POST /api/security/permissions?action=check  — Check if permission exists
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { getActivePairId } from "@/lib/agent-pair-store";
import {
  grantTimedPermission,
  revokeTimedPermission,
  checkTimedPermission,
  getActivePermissions,
  getAllPermissions,
  sweepExpiredPermissions,
} from "@/lib/security/permission-expiry";

const RevokeSchema = z.object({
  permissionId: z.string().min(1, "Missing permissionId"),
  revokedBy: z.string().default("dashboard"),
  reason: z.string().optional(),
});

const CheckSchema = z.object({
  pairId: z.string().optional(),
  operation: z.string().min(1, "Missing operation"),
  target: z.string().optional(),
});

const GrantSchema = z.object({
  pairId: z.string().optional(),
  operation: z.string().min(1, "Missing operation"),
  durationMinutes: z.number().min(1, "Missing durationMinutes"),
  grantedBy: z.string().default("dashboard"),
  reason: z.string().min(1, "Missing reason"),
  target: z.string().optional(),
  maxUses: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get("pairId") ?? await getActivePairId();

    // Always sweep on GET
    await sweepExpiredPermissions();

    if (searchParams.get("all") === "1") {
      const perms = await getAllPermissions(pairId);
      return NextResponse.json({ permissions: perms });
    }

    const perms = await getActivePermissions(pairId);
    return NextResponse.json({ permissions: perms });
  } catch (error) {
    console.error("[API] security/permissions GET:", error);
    return NextResponse.json({ error: "Failed to get permissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // ── Revoke ──
    if (action === "revoke") {
      const parsed = parseBody(RevokeSchema, body);
      if (!parsed.ok) return parsed.response;
      const { permissionId, revokedBy, reason } = parsed.data;
      const success = await revokeTimedPermission(permissionId, revokedBy, reason);
      return NextResponse.json({ success });
    }

    // ── Check ──
    if (action === "check") {
      const parsed = parseBody(CheckSchema, body);
      if (!parsed.ok) return parsed.response;
      const pairId = parsed.data.pairId ?? await getActivePairId();
      const { operation, target } = parsed.data;
      const result = await checkTimedPermission(pairId, operation, target);
      return NextResponse.json(result);
    }

    // ── Grant ──
    const parsed = parseBody(GrantSchema, body);
    if (!parsed.ok) return parsed.response;

    const pairId = parsed.data.pairId ?? await getActivePairId();
    const { operation, durationMinutes, grantedBy, reason, target, maxUses } = parsed.data;

    const perm = await grantTimedPermission({
      pairId,
      operation,
      target,
      durationMinutes,
      grantedBy,
      reason,
      maxUses,
    });

    return NextResponse.json({ permission: perm }, { status: 201 });
  } catch (error) {
    console.error("[API] security/permissions POST:", error);
    return NextResponse.json({ error: "Failed to handle permission" }, { status: 500 });
  }
}
