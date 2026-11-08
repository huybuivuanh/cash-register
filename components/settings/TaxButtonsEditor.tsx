"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { CheckboxField, Field, FormActions, FormError, Input, inputClass } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { errorText, moveId, OffBadge, sectionClass, SettingsRow } from "@/components/settings/SettingsList";
import { keyLabel, reservedKeyReason } from "@/lib/shortcuts";
import { formatRate } from "@/lib/tax";
import { useTaxButtonsStore } from "@/stores/taxButtonsStore";
import { useTaxesStore } from "@/stores/taxesStore";

function taxText(tax: Tax) {
  return `${tax.label || tax.name} ${formatRate(tax.rateBps)}`;
}

/** List of keypad tax buttons (T1+2, T1, NO TAX…) with add / edit / reorder / turn off. */
export function TaxButtonsEditor() {
  const { taxButtons, updateTaxButton, setOrder } = useTaxButtonsStore();
  const taxes = useTaxesStore((s) => s.taxes);
  const [editing, setEditing] = useState<TaxButton | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const { isAdmin } = useAuth();

  const taxById = new Map(taxes.map((t) => [t.id, t]));

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

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tax buttons</h2>
          <p className="text-sm text-foreground/60">
            The keys on the register, in this order. Each one charges the taxes you pick.
          </p>
        </div>
        <Button onClick={() => setEditing("new")} disabled={!isAdmin}>
          Add button
        </Button>
      </div>

      {taxButtons.length === 0 ? (
        <p className="text-sm text-foreground/60">No tax buttons yet.</p>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {taxButtons.map((button, i) => {
            const charged = button.taxIds.flatMap((id) => taxById.get(id) ?? []);
            return (
              <SettingsRow
                key={button.id}
                active={button.active}
                first={i === 0}
                last={i === taxButtons.length - 1}
                disabled={busy || !isAdmin}
                onMove={(dir) => run(() => setOrder(moveId(taxButtons.map((b) => b.id), i, dir)))}
                onEdit={() => setEditing(button)}
                onToggle={() => run(() => updateTaxButton(button.id, { active: !button.active }))}
              >
                <p className="font-medium">
                  {button.label}
                  {button.shortcut && (
                    <span className="ml-2 rounded border border-foreground/20 px-1.5 py-0.5 font-mono text-xs font-normal text-foreground/70">
                      {keyLabel(button.shortcut)}
                    </span>
                  )}
                  {!button.active && <OffBadge />}
                </p>
                <p className="text-sm text-foreground/70">
                  {charged.length === 0
                    ? "No tax"
                    : charged.map((t, j) => (
                        <span key={t.id}>
                          {j > 0 && " + "}
                          {taxText(t)}
                          {!t.active && <span className="text-red-600 dark:text-red-400"> (off, not charged)</span>}
                        </span>
                      ))}
                </p>
              </SettingsRow>
            );
          })}
        </ul>
      )}

      {editing && (
        <TaxButtonForm
          button={editing === "new" ? null : editing}
          buttons={taxButtons}
          taxes={taxes}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function TaxButtonForm({
  button,
  buttons,
  taxes,
  onClose,
}: {
  button: TaxButton | null;
  buttons: TaxButton[];
  taxes: Tax[];
  onClose: () => void;
}) {
  const { addTaxButton, updateTaxButton } = useTaxButtonsStore();
  const [label, setLabel] = useState(button?.label ?? "");
  const [selected, setSelected] = useState(() => new Set(button?.taxIds ?? []));
  const [active, setActive] = useState(button?.active ?? true);
  const [shortcut, setShortcut] = useState<string | null>(button?.shortcut ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Label of another button already using this key, or null. */
  function takenBy(code: string): string | null {
    return buttons.find((b) => b.id !== button?.id && b.shortcut === code)?.label ?? null;
  }

  // Turned-off taxes are only listed if this button already uses them, so they can be removed.
  const choices = taxes.filter((t) => t.active || selected.has(t.id));

  function toggleTax(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) return setError("Enter the text for the key, like T1+2.");
    if (buttons.some((b) => b.id !== button?.id && b.label.toLowerCase() === cleanLabel.toLowerCase()))
      return setError(`There's already a button called ${cleanLabel}.`);
    const clash = shortcut && takenBy(shortcut);
    if (clash) return setError(`${keyLabel(shortcut)} is already used by ${clash}.`);
    // Keep the taxes in the same order as the tax list.
    const taxIds = taxes.filter((t) => selected.has(t.id)).map((t) => t.id);

    setSaving(true);
    setError(null);
    try {
      if (button) {
        await updateTaxButton(button.id, { label: cleanLabel, taxIds, active, shortcut });
      } else {
        const order = Math.max(0, ...buttons.map((b) => b.order)) + 1;
        await addTaxButton({ label: cleanLabel, taxIds, order, active: true, shortcut });
      }
      onClose();
    } catch (err) {
      setError(errorText(err, "Couldn't save the button."));
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} busy={saving} title={button ? `Edit ${button.label}` : "Add tax button"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Key text" htmlFor="buttonLabel" required hint="Shown on the keypad and receipts, e.g. T1+2.">
          <Input id="buttonLabel" value={label} maxLength={10} autoFocus onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Charges</legend>
          {choices.length === 0 && <p className="text-sm text-foreground/60">No taxes are on. Add one above first.</p>}
          {choices.map((t) => (
            <CheckboxField
              key={t.id}
              label={t.active ? taxText(t) : `${taxText(t)} (off, not charged)`}
              checked={selected.has(t.id)}
              onChange={(e) => toggleTax(t.id, e.target.checked)}
            />
          ))}
          <p className="text-xs text-foreground/60">Leave all unticked for a no-tax button.</p>
        </fieldset>
        <Field label="Keyboard key" hint="Optional. Pressing this key on the register presses the button, e.g. Numpad /.">
          <ShortcutField value={shortcut} onChange={setShortcut} takenBy={takenBy} />
        </Field>
        {button && <CheckboxField label="On (shown on the keypad)" checked={active} onChange={(e) => setActive(e.target.checked)} />}
        <FormError message={error} />
        <FormActions onCancel={onClose} submitting={saving} submitLabel={button ? "Save" : "Add button"} />
      </form>
    </Modal>
  );
}

/** "Press a key" box for a button's keyboard shortcut. */
function ShortcutField({
  value,
  onChange,
  takenBy,
}: {
  value: string | null;
  onChange: (code: string | null) => void;
  takenBy: (code: string) => string | null;
}) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!listening || e.code === "Tab") return; // Tab still moves on
    // Keep the key to ourselves: no form submit, and Esc doesn't close the window.
    e.preventDefault();
    e.stopPropagation();
    if (e.code === "Escape") {
      setListening(false);
      setProblem(null);
      return;
    }
    const reserved = reservedKeyReason(e.code);
    if (reserved) return setProblem(reserved);
    const other = takenBy(e.code);
    if (other) return setProblem(`${keyLabel(e.code)} is already used by ${other}.`);
    onChange(e.code);
    setProblem(null);
    setListening(false);
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setListening(true);
            setProblem(null);
          }}
          onKeyDown={handleKeyDown}
          // Space "clicks" a button on key up; don't let that restart listening.
          onKeyUp={(e) => e.code === "Space" && e.preventDefault()}
          onBlur={() => setListening(false)}
          className={`${inputClass} text-left ${listening ? "ring-2 ring-gold" : ""} ${value || listening ? "" : "text-foreground/50"}`}
        >
          {listening ? "Press a key… (Esc to stop)" : value ? keyLabel(value) : "None. Click, then press a key"}
        </button>
        {value && !listening && (
          <Button variant="secondary" onClick={() => onChange(null)}>
            Clear
          </Button>
        )}
      </div>
      {problem && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{problem}</p>}
    </div>
  );
}
