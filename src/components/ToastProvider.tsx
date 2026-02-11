"use client";

import { useState, useEffect, useRef } from "react";
import { TOAST_EVENT, type ToastMessage } from "@/lib/toast";

export function ToastProvider() {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cb = (e: Event) => {
      const msg = (e as CustomEvent<{ message: ToastMessage }>).detail?.message ?? null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage(msg);
      if (msg) {
        timeoutRef.current = setTimeout(() => {
          setMessage(null);
          timeoutRef.current = null;
        }, 3000);
      }
    };
    window.addEventListener(TOAST_EVENT, cb);
    return () => {
      window.removeEventListener(TOAST_EVENT, cb);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-white shadow-lg"
      role="status"
    >
      {message}
    </div>
  );
}
