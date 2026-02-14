/**
 * Email Digest — sends the morning briefing via Resend.
 *
 * Generates an HTML email from the daily digest and sends it
 * to the user's registered email address.
 */

import { Resend } from "resend";
import type { DailyDigest, DigestSection } from "./daily-digest";
import { generateDailyDigest, getLatestDigest } from "./daily-digest";
import { kv } from "./db";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.DIGEST_FROM_EMAIL ?? "nightly@thenightlybuild.dev";
const PLATFORM_URL = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

interface DigestSubscription {
  pairId: string;
  email: string;
  enabled: boolean;
  frequency: "daily" | "weekly";
  lastSentAt?: string;
  createdAt: string;
}

// ─── Subscription Management ─────────────────────────────

async function readSubscriptions(): Promise<DigestSubscription[]> {
  return await kv.get<DigestSubscription[]>("digest-subscriptions") ?? [];
}

async function writeSubscriptions(subs: DigestSubscription[]): Promise<void> {
  await kv.set("digest-subscriptions", subs);
}

export async function subscribeToDigest(
  pairId: string,
  email: string,
  frequency: "daily" | "weekly" = "daily"
): Promise<DigestSubscription> {
  const subs = await readSubscriptions();
  const existing = subs.find((s) => s.pairId === pairId);

  if (existing) {
    existing.email = email;
    existing.enabled = true;
    existing.frequency = frequency;
    await writeSubscriptions(subs);
    return existing;
  }

  const sub: DigestSubscription = {
    pairId,
    email,
    enabled: true,
    frequency,
    createdAt: new Date().toISOString(),
  };
  subs.push(sub);
  await writeSubscriptions(subs);
  return sub;
}

export async function unsubscribeFromDigest(pairId: string): Promise<void> {
  const subs = await readSubscriptions();
  const sub = subs.find((s) => s.pairId === pairId);
  if (sub) {
    sub.enabled = false;
    await writeSubscriptions(subs);
  }
}

export async function getDigestSubscription(
  pairId: string
): Promise<DigestSubscription | null> {
  const subs = await readSubscriptions();
  return subs.find((s) => s.pairId === pairId) ?? null;
}

// ─── Email Sending ───────────────────────────────────────

/**
 * Send a digest email for a specific pair.
 * Generates a fresh digest if none exists for today.
 */
export async function sendDigestEmail(pairId: string): Promise<{
  sent: boolean;
  error?: string;
}> {
  if (!resend) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const sub = await getDigestSubscription(pairId);
  if (!sub?.enabled || !sub.email) {
    return { sent: false, error: "No active subscription" };
  }

  // Check if already sent today
  if (sub.lastSentAt) {
    const lastSent = new Date(sub.lastSentAt);
    const now = new Date();
    if (
      lastSent.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
    ) {
      return { sent: false, error: "Already sent today" };
    }
  }

  // Generate or get latest digest
  let digest = await getLatestDigest(pairId);
  const now = new Date();
  const isStale =
    !digest ||
    now.getTime() - new Date(digest.generatedAt).getTime() > 12 * 60 * 60 * 1000;

  if (isStale) {
    digest = await generateDailyDigest(pairId);
  }

  if (!digest) {
    return { sent: false, error: "No digest available" };
  }

  // Build email HTML
  const html = buildDigestEmailHtml(digest);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: sub.email,
      subject: `Morning Briefing — ${digest.healthScore}% health · ${digest.summary.split("·")[0].trim()}`,
      html,
    });

    // Update last sent
    const subs = await readSubscriptions();
    const s = subs.find((x) => x.pairId === pairId);
    if (s) {
      s.lastSentAt = now.toISOString();
      await writeSubscriptions(subs);
    }

    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Email send failed";
    console.error("[email-digest] send failed:", msg);
    return { sent: false, error: msg };
  }
}

/**
 * Send digest emails to ALL subscribed users.
 * Called by cron job.
 */
export async function sendAllDigestEmails(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const subs = await readSubscriptions();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const sub of subs) {
    if (!sub.enabled) {
      skipped++;
      continue;
    }

    const result = await sendDigestEmail(sub.pairId);
    if (result.sent) {
      sent++;
    } else if (result.error === "Already sent today") {
      skipped++;
    } else {
      failed++;
    }
  }

  return { sent, failed, skipped };
}

// ─── Email Template ──────────────────────────────────────

function buildDigestEmailHtml(digest: DailyDigest): string {
  const healthColor =
    digest.healthScore >= 80
      ? "#22c55e"
      : digest.healthScore >= 50
        ? "#f59e0b"
        : "#ef4444";

  const sectionsHtml = digest.sections
    .map((section) => buildSectionHtml(section))
    .join("");

  const actionItemsHtml =
    digest.actionItems.length > 0
      ? `
    <div style="background: #1c1917; border: 1px solid #f59e0b33; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #f59e0b; margin: 0 0 8px;">Action Items</p>
      ${digest.actionItems.map((item) => `<p style="font-size: 13px; color: #fbbf24; margin: 4px 0;">&#9888; ${item}</p>`).join("")}
    </div>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <p style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3em; color: #71717a; margin: 0;">The Nightly Build</p>
      <h1 style="font-size: 24px; font-weight: 700; color: #fafafa; margin: 8px 0 4px;">Morning Briefing</h1>
      <p style="font-size: 13px; color: #71717a; margin: 0;">
        ${new Date(digest.generatedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>
    </div>

    <!-- Health Score -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px 40px;">
        <p style="font-size: 48px; font-weight: 700; color: ${healthColor}; margin: 0; line-height: 1;">${digest.healthScore}%</p>
        <p style="font-size: 12px; color: #71717a; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.05em;">System Health</p>
      </div>
    </div>

    <!-- Summary -->
    <p style="font-size: 14px; color: #a1a1aa; text-align: center; margin-bottom: 24px; line-height: 1.6;">${digest.summary}</p>

    <!-- Action Items -->
    ${actionItemsHtml}

    <!-- Sections -->
    ${sectionsHtml}

    <!-- CTA -->
    <div style="text-align: center; margin-top: 32px;">
      <a href="${PLATFORM_URL}/home" style="display: inline-block; background: #f59e0b; color: #000; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
        Open Dashboard
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a;">
      <p style="font-size: 11px; color: #52525b; margin: 0;">
        The Nightly Build &middot; Your AI agents work while you sleep.
      </p>
      <p style="font-size: 11px; color: #3f3f46; margin: 4px 0 0;">
        <a href="${PLATFORM_URL}/settings" style="color: #52525b; text-decoration: underline;">Manage email preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildSectionHtml(section: DigestSection): string {
  const severityBadge =
    section.severity === "critical"
      ? '<span style="font-size: 10px; background: #ef444433; color: #ef4444; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">CRITICAL</span>'
      : section.severity === "warning"
        ? '<span style="font-size: 10px; background: #f59e0b33; color: #f59e0b; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">WARNING</span>'
        : "";

  const itemsHtml = section.items
    .map(
      (item) => `
    <tr>
      <td style="font-size: 13px; color: #a1a1aa; padding: 4px 12px 4px 0;">${item.label}</td>
      <td style="font-size: 13px; color: #e4e4e7; padding: 4px 0; font-weight: 500; text-align: right;">${item.value}</td>
    </tr>`
    )
    .join("");

  return `
  <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
    <p style="font-size: 13px; font-weight: 600; color: #fafafa; margin: 0 0 12px;">
      ${section.title}${severityBadge}
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      ${itemsHtml}
    </table>
  </div>`;
}
