/**
 * POST /api/digest/email           — Send digest email to a user
 * POST /api/digest/email?all=1     — Send digest emails to all subscribers (cron)
 * POST /api/digest/email?subscribe=1 — Subscribe to digest emails
 * POST /api/digest/email?unsubscribe=1 — Unsubscribe
 * GET  /api/digest/email           — Get subscription status
 */

import { NextRequest, NextResponse } from "next/server";
import { getActivePairId } from "@/lib/agent-pair-store";
import {
  sendDigestEmail,
  sendAllDigestEmails,
  subscribeToDigest,
  unsubscribeFromDigest,
  getDigestSubscription,
} from "@/lib/email-digest";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get("pairId") ?? await getActivePairId();

    const sub = await getDigestSubscription(pairId);
    return NextResponse.json({ subscription: sub });
  } catch (error) {
    console.error("[API] digest/email GET:", error);
    return NextResponse.json({ error: "Failed to get subscription" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Send to all subscribers (cron)
    if (searchParams.get("all") === "1") {
      const result = await sendAllDigestEmails();
      return NextResponse.json(result);
    }

    const body = await request.json().catch(() => ({}));
    const pairId = (body.pairId as string) ?? await getActivePairId();

    // Subscribe
    if (searchParams.get("subscribe") === "1") {
      const email = body.email as string;
      const frequency = (body.frequency as "daily" | "weekly") ?? "daily";
      if (!email) {
        return NextResponse.json({ error: "Missing email" }, { status: 400 });
      }
      const sub = await subscribeToDigest(pairId, email, frequency);
      return NextResponse.json({ subscription: sub });
    }

    // Unsubscribe
    if (searchParams.get("unsubscribe") === "1") {
      await unsubscribeFromDigest(pairId);
      return NextResponse.json({ success: true });
    }

    // Send now
    const result = await sendDigestEmail(pairId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] digest/email POST:", error);
    return NextResponse.json({ error: "Failed to process email request" }, { status: 500 });
  }
}
