"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Moon } from "lucide-react";
import { useState } from "react";

const devBypassEnabled =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("dev@local");
  const [password, setPassword] = useState("");
  const [bypassError, setBypassError] = useState("");
  const [bypassLoading, setBypassLoading] = useState(false);

  const handleDevBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setBypassError("");
    if (!password.trim()) {
      setBypassError("Enter the bypass secret (e.g. dev)");
      return;
    }
    setBypassLoading(true);
    try {
      const res = await signIn("dev-bypass", {
        email: email.trim() || "dev@local",
        password: password.trim(),
        redirect: false,
        callbackUrl: "/onboard/1",
      });
      if (res?.error) {
        setBypassError("Invalid. Set AUTH_DEV_BYPASS_SECRET=dev in .env.local and restart dev server.");
        return;
      }
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      // Fallback: redirect manually if session was set
      window.location.href = "/onboard/1";
    } catch (err) {
      setBypassError("Sign-in failed. Check console for details.");
      console.error("Dev bypass error:", err);
    } finally {
      setBypassLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="flex justify-center gap-2 items-center">
          <Moon className="w-10 h-10 text-amber-400" />
          <h1 className="text-2xl font-bold tracking-tight">THE NIGHTLY BUILD</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Sign in to manage your agent-human pair and dashboard.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() =>
              signIn("google", { callbackUrl, redirect: true })
            }
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.18H12v4.15h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          {devBypassEnabled && (
            <form
              onSubmit={handleDevBypass}
              className="pt-4 border-t border-zinc-700 space-y-3 text-left"
            >
              <p className="text-xs text-amber-500/90 font-medium">
                Dev bypass (no Google)
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 placeholder:text-zinc-500 text-sm"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Bypass secret (AUTH_DEV_BYPASS_SECRET)"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 placeholder:text-zinc-500 text-sm"
              />
              {bypassError && (
                <p className="text-xs text-red-400">{bypassError}</p>
              )}
              <button
                type="submit"
                disabled={bypassLoading}
                className="w-full px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-medium text-sm"
              >
                {bypassLoading ? "Signing in…" : "Dev sign in"}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-zinc-500">
          By signing in you agree to use the platform for agent-human pair management.
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center"><p className="text-zinc-500">Loading…</p></main>}>
      <SignInContent />
    </Suspense>
  );
}
