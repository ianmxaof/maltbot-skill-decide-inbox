"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OnboardLayoutProps {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  showBack?: boolean;
  showContinue?: boolean;
  children: React.ReactNode;
}

export function OnboardLayout({
  step,
  totalSteps,
  onBack,
  onContinue,
  continueLabel = "Continue",
  showBack = true,
  showContinue = true,
  children,
}: OnboardLayoutProps) {
  const backHref = step > 1 ? `/onboard/${step - 1}` : "/";
  const nextHref = step < totalSteps ? `/onboard/${step + 1}` : "/home";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <div className="flex gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${
                  i + 1 <= step ? "bg-amber-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-500">
            Step {step} of {totalSteps}
          </p>
        </div>
        {children}
        <div className="flex items-center justify-between mt-12 gap-4">
          <div>
            {showBack && (
              <Link
                href={step > 1 ? backHref : "/"}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Link>
            )}
          </div>
          <div>
            {showContinue && onContinue ? (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition"
              >
                {continueLabel}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href={nextHref}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition"
              >
                {continueLabel}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
