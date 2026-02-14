/**
 * POST   /api/social/guestbook — Add a guestbook entry
 * GET    /api/social/guestbook?targetPairId=xxx — Get entries
 * DELETE /api/social/guestbook — Delete or hide an entry (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  addGuestbookEntry,
  getGuestbookEntries,
  toggleGuestbookEntryVisibility,
  deleteGuestbookEntry,
} from "@/lib/guestbook-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const targetPairId = url.searchParams.get("targetPairId")?.trim();
    const viewerPairId = url.searchParams.get("viewerPairId")?.trim();

    if (!targetPairId) {
      return NextResponse.json(
        { success: false, error: "targetPairId required" },
        { status: 400 }
      );
    }

    // Include hidden entries if viewer is the profile owner
    const includeHidden = viewerPairId === targetPairId;
    const entries = await getGuestbookEntries(targetPairId, {
      includeHidden,
      limit: 30,
    });

    return NextResponse.json({ success: true, entries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get guestbook";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetPairId, authorPairId, authorName, message } = body;

    if (!targetPairId || !authorPairId || !authorName || !message) {
      return NextResponse.json(
        { success: false, error: "targetPairId, authorPairId, authorName, and message required" },
        { status: 400 }
      );
    }

    if (targetPairId === authorPairId) {
      return NextResponse.json(
        { success: false, error: "Cannot sign your own guestbook" },
        { status: 400 }
      );
    }

    const entry = await addGuestbookEntry(targetPairId, authorPairId, authorName, message);
    return NextResponse.json({ success: true, entry });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add entry";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { entryId, targetPairId, action } = body;

    if (!entryId || !targetPairId) {
      return NextResponse.json(
        { success: false, error: "entryId and targetPairId required" },
        { status: 400 }
      );
    }

    if (action === "hide") {
      const ok = await toggleGuestbookEntryVisibility(entryId, targetPairId);
      return NextResponse.json({ success: ok });
    }

    const ok = await deleteGuestbookEntry(entryId, targetPairId);
    return NextResponse.json({ success: ok });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to manage entry";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
