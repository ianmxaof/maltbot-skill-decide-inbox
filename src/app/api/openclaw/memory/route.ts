/**
 * GET /api/openclaw/memory?type=identity|soul|user|memory|heartbeat — read memory file
 * PATCH /api/openclaw/memory — update memory file (body: { type, content } or for identity: { type: "identity", name?, vibe?, emoji? })
 * POST /api/openclaw/memory/init — ensure claude/ files exist with defaults
 */

import { NextRequest, NextResponse } from "next/server";
import {
  readMemoryFile,
  writeMemoryFile,
  getIdentity,
  setIdentity,
  initMemoryFiles,
  type MemoryFileType,
} from "@/lib/openclaw-memory";

const VALID_TYPES: MemoryFileType[] = [
  "identity",
  "soul",
  "user",
  "memory",
  "heartbeat",
];

function isValidType(t: string): t is MemoryFileType {
  return VALID_TYPES.includes(t as MemoryFileType);
}

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");
    if (!type || !isValidType(type)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid type (identity|soul|user|memory|heartbeat)" },
        { status: 400 }
      );
    }
    if (type === "identity") {
      const data = await getIdentity();
      return NextResponse.json({ success: true, data, raw: undefined });
    }
    const content = await readMemoryFile(type);
    return NextResponse.json({ success: true, content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read memory";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body?.type;
    if (!type || !isValidType(type)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid type" },
        { status: 400 }
      );
    }
    if (type === "identity") {
      if (
        typeof body.name !== "undefined" ||
        typeof body.vibe !== "undefined" ||
        typeof body.emoji !== "undefined"
      ) {
        const current = await getIdentity();
        await setIdentity({
          name: body.name ?? current.name,
          vibe: body.vibe ?? current.vibe,
          emoji: body.emoji ?? current.emoji,
        });
        return NextResponse.json({ success: true });
      }
      if (typeof body.content === "string") {
        await writeMemoryFile("identity", body.content);
        return NextResponse.json({ success: true });
      }
    } else if (typeof body.content === "string") {
      await writeMemoryFile(type, body.content);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: "Missing content or identity fields" },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to write memory";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
