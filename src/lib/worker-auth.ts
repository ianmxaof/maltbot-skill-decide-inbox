import { NextRequest, NextResponse } from "next/server";

/**
 * Validate worker API authentication.
 *
 * When WORKER_API_SECRET is set, requires `Authorization: Bearer <secret>`.
 * When not set, all requests pass (backward compat for local dev).
 */
export function validateWorkerAuth(req: NextRequest): {
  ok: boolean;
  response?: NextResponse;
} {
  const secret = process.env.WORKER_API_SECRET;
  if (!secret) return { ok: true };

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return { ok: true };

  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "Unauthorized — invalid or missing WORKER_API_SECRET" },
      { status: 401 }
    ),
  };
}
