/**
 * POST   /api/social/bookmarks — Add a bookmark
 * GET    /api/social/bookmarks?pairId=xxx — Get bookmarks
 * DELETE /api/social/bookmarks — Remove a bookmark
 */

import { NextRequest, NextResponse } from "next/server";
import { addBookmark, getBookmarks, removeBookmark } from "@/lib/bookmark-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pairId = url.searchParams.get("pairId")?.trim();

    if (!pairId) {
      return NextResponse.json(
        { success: false, error: "pairId required" },
        { status: 400 }
      );
    }

    const bookmarks = await getBookmarks(pairId);
    return NextResponse.json({ success: true, bookmarks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get bookmarks";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pairId, title, source, sourceType, url } = body;

    if (!pairId || !title || !source) {
      return NextResponse.json(
        { success: false, error: "pairId, title, and source required" },
        { status: 400 }
      );
    }

    const bookmark = await addBookmark(
      pairId,
      title,
      source,
      sourceType ?? "manual",
      url
    );
    return NextResponse.json({ success: true, bookmark });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add bookmark";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookmarkId, pairId } = body;

    if (!bookmarkId || !pairId) {
      return NextResponse.json(
        { success: false, error: "bookmarkId and pairId required" },
        { status: 400 }
      );
    }

    const ok = await removeBookmark(bookmarkId, pairId);
    return NextResponse.json({ success: ok });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove bookmark";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
