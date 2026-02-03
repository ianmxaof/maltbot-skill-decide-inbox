import { NextRequest, NextResponse } from "next/server";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

/**
 * POST /api/security/approvals/[id]/deny
 * Deny a pending operation. Body: { deniedBy?: string, reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const deniedBy = (body.deniedBy as string) || "dashboard";
    const reason = body.reason as string | undefined;

    const middleware = getSecurityMiddleware();
    const ok = middleware.deny(id, deniedBy, reason);
    if (!ok) {
      return NextResponse.json(
        { error: "Approval not found, expired, or already processed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] security/approvals/[id]/deny:", error);
    return NextResponse.json(
      { error: "Failed to deny" },
      { status: 500 }
    );
  }
}
