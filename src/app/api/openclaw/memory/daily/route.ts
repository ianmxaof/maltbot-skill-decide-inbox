/**
 * GET /api/openclaw/memory/daily — list dates with daily notes
 * GET /api/openclaw/memory/daily?date=YYYY-MM-DD — read one daily note
 * PATCH /api/openclaw/memory/daily — body { date: "YYYY-MM-DD", content } — write daily note
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listDailyNotes,
  readDailyNote,
  writeDailyNote,
} from "@/lib/openclaw-memory";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    if (date) {
      if (!DATE_REGEX.test(date)) {
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
    const { date, content } = body as { date?: string; content?: string };
    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid date (use YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing content" },
        { status: 400 }
      );
    }
    await writeDailyNote(date, content);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to write daily note";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
