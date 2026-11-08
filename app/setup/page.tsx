"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/form";
import { storeInfoError, type StoreInfo } from "@/lib/setup";
import { STORE_SETTINGS_DEFAULTS } from "@/stores/storeSettingsStore";

/** One-time store setup right after creating an account. Can be changed later in Settings. */
export default function SetupPage() {
  const { status, user, completeSetup, logout } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<StoreInfo>({
    name: "",
    address: "",
    phone: "",
    receiptHeader: "",
    receiptFooter: STORE_SETTINGS_DEFAULTS.receiptFooter,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
    else if (status === "ready") router.replace("/");
  }, [status, router]);

  function setField(key: keyof StoreInfo, value: string) {
    setInfo((i) => ({ ...i, [key]: value }));
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = storeInfoError(info);
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      await completeSetup(info);
      // The effect above opens the register once the business is loaded.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save the store info.",
      );
      setSaving(false);
    }
  }

  if (status !== "needsSetup") {
    return (
      <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4">
        <p className="text-foreground/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4 py-6 sm:py-8">
      <div className="w-full max-w-md min-w-0 space-y-6">
        <div className="text-center">
          <div className="flex justify-center rounded-2xl bg-ink px-4 py-6">
            <Logo large />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Set up your store</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Printed on your receipts. You can change these later in Settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Business name" htmlFor="name" required>
            <Input
              id="name"
              value={info.name}
              autoFocus
              onChange={(e) => setField("name", e.target.value)}
            />
          </Field>
          <Field label="Address" htmlFor="address" required>
            <Input
              id="address"
              value={info.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </Field>
          <Field label="Phone" htmlFor="phone" required>
            <Input
              id="phone"
              type="tel"
              value={info.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </Field>
          <Field
            label="Receipt header"
            htmlFor="receiptHeader"
            hint="Optional. Extra line under the name, e.g. GST number."
          >
            <Input
              id="receiptHeader"
              value={info.receiptHeader}
              onChange={(e) => setField("receiptHeader", e.target.value)}
            />
          </Field>
          <Field
            label="Receipt footer"
            htmlFor="receiptFooter"
            hint="Optional."
          >
            <Input
              id="receiptFooter"
              value={info.receiptFooter}
              onChange={(e) => setField("receiptFooter", e.target.value)}
            />
          </Field>

          <FormError message={error} />
          <Button type="submit" disabled={saving} className="w-full min-h-11">
            {saving ? "Saving…" : "Save and open register"}
          </Button>
        </form>

        <p className="text-center text-sm text-foreground/60">
          Signed in as {user?.email}.{" "}
          <button type="button" onClick={logout} className="underline">
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
