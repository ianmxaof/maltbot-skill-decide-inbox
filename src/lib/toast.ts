/**
 * Minimal toast utility — dispatches custom events.
 * Toast UI is rendered by a provider in layout (optional).
 */

export const TOAST_EVENT = "nightly-build-toast";

export type ToastMessage = string;

export function showToast(message: ToastMessage): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message } }));
}
