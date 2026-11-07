"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";

/**
 * Signed-in area: redirects to /login when logged out and shows the navbar.
 * `(standard)/` pages are a single centered column.
 */
export default function MainLayout({
  children,
}: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4">
        <p className="text-foreground/60">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
