"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Send, ChevronRight, ChevronLeft } from "lucide-react";
import { getOnboardDraft, setOnboardDraft, type OnboardDraft } from "@/lib/onboard-session";

const CHANNELS = [
  {
    id: "discord",
    name: "Discord",
    desc: "Talk to your agent from Discord servers",
    icon: MessageCircle,
    available: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    desc: "Message your agent via Telegram bot",
    icon: Send,
    available: false,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    desc: "Chat with your agent on WhatsApp",
    icon: MessageCircle,
    available: false,
  },
];

export function ConnectChannelStep() {
  const [channelIntent, setChannelIntent] = useState<string | null>(null);

  useEffect(() => {
    const draft = getOnboardDraft();
    if (draft?.channelIntent) setChannelIntent(draft.channelIntent);
  }, []);

  useEffect(() => {
    const draft: OnboardDraft = getOnboardDraft() ?? { step: 5 };
    draft.step = 5;
    draft.channelIntent = channelIntent ?? undefined;
    setOnboardDraft(draft);
  }, [channelIntent]);

  return (
    <div>
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">
          Step 5 of 6
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Connect a Channel
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Link Discord, Telegram, or WhatsApp to talk to your agent from messaging. Optional — you can set this up in Settings after you launch.
        </p>
      </div>

      <div className="space-y-4">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const isSelected = channelIntent === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => ch.available && setChannelIntent(ch.id)}
              disabled={!ch.available}
              className={`w-full rounded-2xl border p-5 text-left transition ${
                !ch.available
                  ? "border-zinc-800 bg-zinc-900/20 opacity-60 cursor-not-allowed"
                  : isSelected
                    ? "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20"
                    : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                    isSelected ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-zinc-700 bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">{ch.name}</p>
                  <p className="text-sm text-zinc-500">{ch.desc}</p>
                  {!ch.available && (
                    <span className="text-xs text-amber-400/80 mt-1 inline-block">Coming soon</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-zinc-500 text-center">
        After you launch, go to Settings → Connected Accounts to link Discord.
      </p>

      <div className="flex items-center justify-between mt-10 pt-8 border-t border-zinc-800/50">
        <Link
          href="/onboard/4"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/onboard/6"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
