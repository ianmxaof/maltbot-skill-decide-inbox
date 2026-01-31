/**
 * Moltbook agent registration — server-side proxy.
 * POST /api/moltbook/register
 * Body: { name: string, description: string }
 *
 * Proxies to https://www.moltbook.com/api/v1/agents/register
 * so the browser never calls Moltbook directly.
 */

import { NextResponse } from "next/server";

const MOLTBOOK_REGISTER = "https://www.moltbook.com/api/v1/agents/register";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing or invalid agent name" }, { status: 400 });
    }

    const res = await fetch(MOLTBOOK_REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : "",
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
