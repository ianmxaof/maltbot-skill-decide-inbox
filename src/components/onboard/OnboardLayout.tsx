"use client";

import { Moon } from "lucide-react";

interface OnboardLayoutProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}

export function OnboardLayout({
  step,
  totalSteps,
  children,
}: OnboardLayoutProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Background gradient — matches landing page hero */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/[0.03] rounded-full blur-3xl" />

      <div className="relative max-w-3xl mx-auto w-full px-6 pt-16 pb-12 sm:pt-20 sm:pb-16">
        {/* Branding — same as landing hero */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <Moon className="w-8 h-8 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            The Nightly Build
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i + 1 <= step ? "bg-amber-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        {children}
      </div>
    </main>
  );
}
