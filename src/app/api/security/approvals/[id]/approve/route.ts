import { NextRequest, NextResponse } from "next/server";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

/**
 * POST /api/security/approvals/[id]/approve
 * Approve a pending operation. Body: { approvedBy?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const approvedBy = (body.approvedBy as string) || "dashboard";

    const middleware = getSecurityMiddleware();
    const ok = middleware.approve(id, approvedBy);
    if (!ok) {
      return NextResponse.json(
        { error: "Approval not found, expired, or already processed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] security/approvals/[id]/approve:", error);
    return NextResponse.json(
      { error: "Failed to approve" },
      { status: 500 }
    );
  }
}
