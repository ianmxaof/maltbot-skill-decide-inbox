import { differenceInDays } from "date-fns";

/**
 * "This project has been idle for N days"
 */
export function getIdleDays(lastActivityAt: string | undefined): number | null {
  if (!lastActivityAt) return null;
  const last = new Date(lastActivityAt);
  const now = new Date();
  const days = differenceInDays(now, last);
  return days > 0 ? days : null;
}

export function isIdle(lastActivityAt: string | undefined, thresholdDays = 3): boolean {
  const days = getIdleDays(lastActivityAt);
  return days !== null && days >= thresholdDays;
}
