"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxField, Field, FormActions, FormError, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { errorText, moveId, OffBadge, sectionClass, SettingsRow } from "@/components/settings/SettingsList";
import { formatRate, parseRate } from "@/lib/tax";
import { confirmDialog } from "@/stores/modalStore";
import { useTaxButtonsStore } from "@/stores/taxButtonsStore";
import { useTaxesStore } from "@/stores/taxesStore";

/** List of taxes (GST, PST…) with add / edit / reorder / turn off. */
export function TaxesEditor() {
  const { taxes, updateTax, setOrder } = useTaxesStore();
  const taxButtons = useTaxButtonsStore((s) => s.taxButtons);
  const [editing, setEditing] = useState<Tax | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  /** Row actions. A failure shows at the top of the page (the store records it). */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch {
      // Already shown via the store's error.
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(tax: Tax) {
    if (tax.active) {
      const usedBy = taxButtons.filter((b) => b.active && b.taxIds.includes(tax.id)).map((b) => b.label);
      if (usedBy.length) {
        const ok = await confirmDialog(
          `${usedBy.join(", ")} will stop charging ${tax.label || tax.name} on new sales. Past sales don't change.`,
          { title: `Turn off ${tax.name}?`, confirmLabel: "Turn off", danger: true },
        );
        if (!ok) return;
      }
    }
    run(() => updateTax(tax.id, { active: !tax.active }));
  }

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Taxes</h2>
          <p className="text-sm text-foreground/60">
            Changing a rate only affects new sales. Past receipts keep the rate they were charged.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>Add tax</Button>
      </div>

      {taxes.length === 0 ? (
        <p className="text-sm text-foreground/60">No taxes yet.</p>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {taxes.map((tax, i) => (
            <SettingsRow
              key={tax.id}
              active={tax.active}
              first={i === 0}
              last={i === taxes.length - 1}
              disabled={busy}
              onMove={(dir) => run(() => setOrder(moveId(taxes.map((t) => t.id), i, dir)))}
              onEdit={() => setEditing(tax)}
              onToggle={() => handleToggle(tax)}
            >
              <p className="font-medium">
                {tax.name}
                {tax.label && <span className="font-normal text-foreground/70"> · {tax.label}</span>}
                {!tax.active && <OffBadge />}
              </p>
              <p className="text-sm tabular-nums text-foreground/70">{formatRate(tax.rateBps)}</p>
            </SettingsRow>
          ))}
        </ul>
      )}

      {editing && (
        <TaxForm tax={editing === "new" ? null : editing} taxes={taxes} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

function TaxForm({ tax, taxes, onClose }: { tax: Tax | null; taxes: Tax[]; onClose: () => void }) {
  const { addTax, updateTax } = useTaxesStore();
  const [name, setName] = useState(tax?.name ?? "");
  const [label, setLabel] = useState(tax?.label ?? "");
  const [rate, setRate] = useState(tax ? String(tax.rateBps / 100) : "");
  const [active, setActive] = useState(tax?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim();
    const rateBps = parseRate(rate);
    if (!cleanName) return setError("Enter a short name, like TX1.");
    if (taxes.some((t) => t.id !== tax?.id && t.name.toLowerCase() === cleanName.toLowerCase()))
      return setError(`There's already a tax called ${cleanName}.`);
    if (rateBps === null || rateBps <= 0 || rateBps > 10000)
      return setError("Enter a rate between 0.01 and 100, like 5 or 5.5.");

    setSaving(true);
    setError(null);
    try {
      if (tax) {
        await updateTax(tax.id, { name: cleanName, label: label.trim(), rateBps, active });
      } else {
        const order = Math.max(0, ...taxes.map((t) => t.order)) + 1;
        await addTax({ name: cleanName, label: label.trim(), rateBps, order, active: true });
      }
      onClose();
    } catch (err) {
      setError(errorText(err, "Couldn't save the tax."));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} busy={saving} title={tax ? `Edit ${tax.name}` : "Add tax"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Short name" htmlFor="taxName" required hint="Printed on receipts and reports, e.g. TX1.">
          <Input id="taxName" value={name} maxLength={10} autoFocus onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Full name" htmlFor="taxLabel" hint="e.g. GST. Shown in settings.">
          <Input id="taxLabel" value={label} maxLength={30} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field
          label="Rate (%)"
          htmlFor="taxRate"
          required
          hint={tax && "Only new sales use the new rate."}
        >
          <Input id="taxRate" value={rate} inputMode="decimal" placeholder="5" onChange={(e) => setRate(e.target.value)} />
        </Field>
        {tax && <CheckboxField label="On (can be charged on new sales)" checked={active} onChange={(e) => setActive(e.target.checked)} />}
        <FormError message={error} />
        <FormActions onCancel={onClose} submitting={saving} submitLabel={tax ? "Save" : "Add tax"} />
      </form>
    </Modal>
  );
}
