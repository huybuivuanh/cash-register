"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const inputClass =
  "w-full min-w-0 rounded-lg border border-foreground/20 bg-background px-3 py-2.5 text-foreground text-base placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20";

export default function LoginPage() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { status, login, signUp, error, clearError } = useAuth();
  const router = useRouter();
  const signingUp = mode === "signUp";

  useEffect(() => {
    if (status === "ready") router.replace("/");
    else if (status === "needsSetup") router.replace("/setup");
  }, [status, router]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();
    if (signingUp && password !== confirm) return setMismatch(true);
    setMismatch(false);
    setSubmitting(true);
    try {
      // Where to go next is decided by the effect above once the login is checked.
      await (signingUp ? signUp(email, password) : login(email, password));
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    clearError();
    setMismatch(false);
    setConfirm("");
    setMode(signingUp ? "signIn" : "signUp");
  }

  if (status !== "signedOut") {
    return (
      <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4">
        <p className="text-foreground/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4 py-6 sm:py-8">
      <div className="w-full max-w-sm min-w-0 space-y-6">
        <div className="text-center">
          <h1 className="flex justify-center rounded-2xl bg-ink px-4 py-6">
            <Logo large />
          </h1>
          <p className="mt-3 text-sm text-foreground/60">
            {signingUp ? "Create an account for your business" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || mismatch) && (
            <div
              className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm px-3 py-2 break-words"
              role="alert"
            >
              {mismatch ? "The passwords don't match." : error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={signingUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={signingUp ? 6 : undefined}
              className={inputClass}
            />
            {signingUp && <p className="mt-1 text-xs text-foreground/60">At least 6 characters.</p>}
          </div>

          {signingUp && (
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-foreground text-background py-3 font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem] touch-manipulation"
          >
            {submitting
              ? signingUp
                ? "Creating account…"
                : "Signing in…"
              : signingUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-foreground/70">
          {signingUp ? "Already have an account? " : "New business? "}
          <button type="button" onClick={switchMode} className="font-medium text-foreground underline">
            {signingUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
