"use client";

import { useStoreSettingsStore } from "@/stores/storeSettingsStore";
import { formatMoney } from "@/lib/money";

/** Placeholder until the register keypad is built: shows that Firestore is connected. */
export default function RegisterPage() {
  const { settings, loading, error } = useStoreSettingsStore();

  if (error) return <p className="text-red-600">Can&apos;t load settings: {error}</p>;
  if (loading || !settings) return <p className="text-foreground/60">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{settings.name || "Register"}</h1>
      <dl className="grid max-w-sm grid-cols-2 gap-y-2 rounded-xl border border-foreground/10 p-4">
        <dt className="text-foreground/60">Next Z</dt>
        <dd className="text-right font-mono">#{settings.nextZNumber}</dd>
        <dt className="text-foreground/60">Next receipt</dt>
        <dd className="text-right font-mono">#{String(settings.nextSeqNumber).padStart(6, "0")}</dd>
        <dt className="text-foreground/60">Grand total</dt>
        <dd className="text-right font-mono">{formatMoney(settings.grandTotal)}</dd>
      </dl>
    </div>
  );
}
