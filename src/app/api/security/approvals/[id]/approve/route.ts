import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { getSecurityMiddleware } from "@/lib/security/security-middleware";

const ApproveSchema = z.object({
  approvedBy: z.string().default("dashboard"),
});

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
    const parsed = parseBody(ApproveSchema, body);
    if (!parsed.ok) return parsed.response;

    const { approvedBy } = parsed.data;

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
