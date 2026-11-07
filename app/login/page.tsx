"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, login, error, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4">
        <p className="text-foreground/60">Loading…</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4 py-6 sm:py-8">
      <div className="w-full max-w-sm min-w-0 space-y-6">
        <div className="text-center">
          <h1 className="flex justify-center rounded-2xl bg-ink px-4 py-6">
            <Logo large />
          </h1>
          <p className="mt-3 text-sm text-foreground/60">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm px-3 py-2 break-words"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full min-w-0 rounded-lg border border-foreground/20 bg-background px-3 py-2.5 text-foreground text-base placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full min-w-0 rounded-lg border border-foreground/20 bg-background px-3 py-2.5 text-foreground text-base placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-foreground text-background py-3 font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem] touch-manipulation"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
