"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ViewOnlyNote } from "@/components/ViewOnlyNote";
import { Keypad, type TaxKey } from "@/components/register/Keypad";
import { RegisterHelp } from "@/components/register/RegisterHelp";
import { SalePanel } from "@/components/register/SalePanel";
import { useRegister } from "@/components/register/useRegister";
import type { RegisterAction } from "@/lib/register-machine";
import { useModalStore } from "@/stores/modalStore";
import { useStoreSettingsStore } from "@/stores/storeSettingsStore";
import { useTaxButtonsStore } from "@/stores/taxButtonsStore";
import { useTaxesStore } from "@/stores/taxesStore";

const DIGIT_KEYS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

/** Physical keyboard / numpad → register key (docs/DESIGN.md §5). */
function keyToAction(e: KeyboardEvent, taxKeys: TaxKey[]): RegisterAction | null {
  if (DIGIT_KEYS.has(e.key)) return { type: "digit", digit: e.key as "0" };
  switch (e.key) {
    case "Enter":
      return { type: "enter" };
    case "Backspace":
    case "Delete":
      return { type: "clear" };
    case "Shift":
      return { type: "subtotal" };
    case "Escape":
      return { type: "cancelSale" };
  }
  // Tax buttons: whatever key each one was given in Settings → Taxes.
  const key = taxKeys.find((k) => k.button.shortcut === e.code);
  return key ? { type: "taxButton", button: key.button, taxes: key.taxes } : null;
}

export default function RegisterPage() {
  const { isAdmin } = useAuth();
  const { settings, error: settingsError } = useStoreSettingsStore();
  const { taxes, loading: taxesLoading, error: taxesError } = useTaxesStore();
  const { taxButtons, loading: buttonsLoading, error: buttonsError } = useTaxButtonsStore();
  const { state, press } = useRegister();
  const [helpOpen, setHelpOpen] = useState(false);

  const taxKeys = useMemo<TaxKey[]>(() => {
    const activeTaxes = new Map(taxes.filter((t) => t.active).map((t) => [t.id, t]));
    return taxButtons
      .filter((b) => b.active)
      .map((button) => ({
        button,
        taxes: button.taxIds.flatMap((id) => activeTaxes.get(id) ?? []),
      }));
  }, [taxes, taxButtons]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isAdmin || helpOpen) return; // staff are read only; help modal has the keyboard
      if (e.ctrlKey || e.metaKey || e.altKey || useModalStore.getState().open) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const action = keyToAction(e, taxKeys);
      if (!action) return;
      e.preventDefault(); // also stops F1/F5 browser shortcuts
      press(action);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [taxKeys, press, isAdmin, helpOpen]);

  const loadError = settingsError || taxesError || buttonsError;
  if (loadError) return <p className="text-red-600">Can&apos;t load the register: {loadError}</p>;
  if (!settings || taxesLoading || buttonsLoading) return <p className="text-foreground/60">Loading…</p>;

  return (
    <div className="space-y-4">
      {!isAdmin && <ViewOnlyNote />}
      {taxKeys.length === 0 && <NoTaxButtons />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* On wide screens the sale panel fills the row, so it's as tall as the keypad. */}
        <div className="relative order-2 lg:order-1">
          <SalePanel state={state} nextSeq={settings.nextSeqNumber} className="lg:absolute lg:inset-0" />
        </div>
        <div className="order-1 lg:order-2">
          {/* A disabled fieldset turns off every key at once (staff are read only). */}
          <fieldset disabled={!isAdmin} className="min-w-0">
            <Keypad state={state} taxKeys={taxKeys} press={press} />
          </fieldset>
        </div>
      </div>

      <div className="flex justify-end text-sm">
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/20 px-3 py-1.5 font-medium text-foreground hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold"
          >
            ?
          </span>
          Help
        </button>
      </div>

      <RegisterHelp open={helpOpen} onClose={() => setHelpOpen(false)} taxKeys={taxKeys} />
    </div>
  );
}

/** Shown when there are no tax buttons to ring sales up with. */
function NoTaxButtons() {
  return (
    <div className="rounded-xl border border-gold bg-gold/10 p-4">
      <p className="font-medium">No tax buttons yet, so sales can&apos;t be rung up.</p>
      <p className="text-sm text-foreground/70">
        <Link href="/settings/taxes" className="underline">
          Go to Settings → Taxes
        </Link>{" "}
        to add your taxes and the buttons that charge them, or turn a button back on.
      </p>
    </div>
  );
}
