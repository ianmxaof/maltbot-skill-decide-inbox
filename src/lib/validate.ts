// src/lib/validate.ts
// Thin wrapper around Zod safeParse for consistent 400 responses.

import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Parse and validate an unknown body against a Zod schema.
 * Returns `{ ok: true, data }` on success, `{ ok: false, response }` on failure.
 * Pattern mirrors `validateWorkerAuth`.
 */
export function parseBody<T extends z.ZodType>(
  schema: T,
  data: unknown
): { ok: true; data: z.infer<T> } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}
