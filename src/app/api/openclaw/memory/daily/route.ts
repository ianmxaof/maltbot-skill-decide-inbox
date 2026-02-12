/**
 * GET /api/openclaw/memory/daily — list dates with daily notes
 * GET /api/openclaw/memory/daily?date=YYYY-MM-DD — read one daily note
 * PATCH /api/openclaw/memory/daily — body { date: "YYYY-MM-DD", content } — write daily note
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  listDailyNotes,
  readDailyNote,
  writeDailyNote,
} from "@/lib/openclaw-memory";

const PatchDailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Missing or invalid date (use YYYY-MM-DD)"),
  content: z.string({ required_error: "Missing content" }),
});

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { success: false, error: "Invalid date (use YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      const content = await readDailyNote(date);
      return NextResponse.json({ success: true, date, content });
    }
    const dates = await listDailyNotes();
    return NextResponse.json({ success: true, dates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read daily notes";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(PatchDailySchema, body);
    if (!parsed.ok) return parsed.response;
    const { date, content } = parsed.data;

    await writeDailyNote(date, content);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to write daily note";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
