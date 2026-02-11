"use client";

import { useEffect } from "react";
import { clearOnboardDraft } from "@/lib/onboard-session";

/**
 * In development with NEXT_PUBLIC_DEV_RESET_ONBOARDING=true,
 * clear the onboarding draft on mount so the onboarding flow starts from step 1.
 */
export function DevOnboardingReset() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_DEV_RESET_ONBOARDING === "true"
    ) {
      clearOnboardDraft();
    }
  }, []);

  return null;
}
