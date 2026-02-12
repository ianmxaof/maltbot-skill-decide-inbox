/**
 * Moltbook agent registration — server-side proxy.
 * POST /api/moltbook/register
 * Body: { name: string, description: string }
 *
 * Proxies to https://www.moltbook.com/api/v1/agents/register
 * so the browser never calls Moltbook directly.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Missing or invalid agent name"),
  description: z.string().trim().default(""),
});

const MOLTBOOK_REGISTER = "https://www.moltbook.com/api/v1/agents/register";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseBody(RegisterSchema, body);
    if (!parsed.ok) return parsed.response;
    const { name, description } = parsed.data;

    const res = await fetch(MOLTBOOK_REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Moltbook registration failed", hint: data.hint },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
