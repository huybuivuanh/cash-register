"use client";

import { StoreSettingsForm } from "@/components/settings/StoreSettingsForm";
import { useStoreSettingsStore } from "@/stores/storeSettingsStore";

export default function SettingsPage() {
  const { loading, error } = useStoreSettingsStore();

  return (
    <>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? <p className="text-foreground/60">Loading…</p> : <StoreSettingsForm />}
    </>
  );
}
