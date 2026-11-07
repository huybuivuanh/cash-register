"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const navLinks = [
  { href: "/", label: "Register" },
  { href: "/summary", label: "Summary" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 640) setMobileOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleSignOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-line bg-ink/95 text-on-ink backdrop-blur-md print:hidden">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8"
      >
        <Logo href="/" />

        {/* Desktop */}
        <div className="hidden items-center gap-6 sm:flex">
          <ul className="flex items-center gap-5 text-[15px] font-medium">
            {navLinks.map(({ href, label }) => {
              const isActive = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-md py-2 transition hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${isActive ? "text-gold" : "text-on-ink"}`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-11 items-center rounded-full border border-gold px-5 text-[15px] font-bold text-gold transition hover:bg-gold hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Sign out
          </button>
        </div>

        {/* Mobile */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-ink transition hover:bg-ink-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="sr-only">
            {mobileOpen ? "Close menu" : "Open menu"}
          </span>
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7h16M4 12h16M4 17h16"
              />
            )}
          </svg>
        </button>
      </nav>

      <div
        id="mobile-menu"
        className={`grid transition-[grid-template-rows] duration-200 ease-out sm:hidden ${mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="overflow-hidden">
          <div className="border-t border-ink-line px-4 pb-6 pt-3">
            <ul>
              {navLinks.map(({ href, label }) => {
                const isActive = isActivePath(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-xl px-3 py-3.5 text-base font-semibold transition hover:bg-ink-raised ${isActive ? "text-gold" : "text-on-ink"}`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full border border-ink-line text-base font-semibold text-gold transition hover:bg-ink-raised"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
