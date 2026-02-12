/**
 * GET /api/openclaw/memory?type=identity|soul|user|memory|heartbeat — read memory file
 * PATCH /api/openclaw/memory — update memory file (body: { type, content } or for identity: { type: "identity", name?, vibe?, emoji? })
 * POST /api/openclaw/memory/init — ensure claude/ files exist with defaults
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
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

const PatchMemorySchema = z.object({
  type: z.enum(["identity", "soul", "user", "memory", "heartbeat"]),
  name: z.string().optional(),
  vibe: z.string().optional(),
  emoji: z.string().optional(),
  content: z.string().optional(),
});

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
    const parsed = parseBody(PatchMemorySchema, body);
    if (!parsed.ok) return parsed.response;
    const { type, name, vibe, emoji, content } = parsed.data;

    if (type === "identity") {
      if (
        typeof name !== "undefined" ||
        typeof vibe !== "undefined" ||
        typeof emoji !== "undefined"
      ) {
        const current = await getIdentity();
        await setIdentity({
          name: name ?? current.name,
          vibe: vibe ?? current.vibe,
          emoji: emoji ?? current.emoji,
        });
        return NextResponse.json({ success: true });
      }
      if (typeof content === "string") {
        await writeMemoryFile("identity", content);
        return NextResponse.json({ success: true });
      }
    } else if (typeof content === "string") {
      await writeMemoryFile(type, content);
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
