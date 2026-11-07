"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Settings sections. Add new ones here; each is a page under /settings. */
const tabs = [
  { href: "/settings", label: "Store" },
  { href: "/settings/taxes", label: "Taxes" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-w-0 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <nav aria-label="Settings sections" className="flex gap-1 border-b border-foreground/10">
        {tabs.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                active ? "border-foreground text-foreground" : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
