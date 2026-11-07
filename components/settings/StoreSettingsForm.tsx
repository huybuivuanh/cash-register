"use client";

import { useState } from "react";
import { useStoreSettingsStore } from "@/stores/storeSettingsStore";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { formatMoney, parseMoney } from "@/lib/money";
import { sectionClass } from "@/components/settings/SettingsList";

const CANADA_TIMEZONES = [
  { value: "America/Vancouver", label: "Pacific Time — Vancouver, Victoria" },
  { value: "America/Edmonton", label: "Mountain Time — Edmonton, Calgary" },
  { value: "America/Regina", label: "Central Time (no DST) — Regina, Saskatoon" },
  { value: "America/Winnipeg", label: "Central Time — Winnipeg" },
  { value: "America/Toronto", label: "Eastern Time — Toronto, Ottawa" },
  { value: "America/Halifax", label: "Atlantic Time — Halifax, Moncton" },
  { value: "America/St_Johns", label: "Newfoundland Time — St. John's" },
] as const;

/** Store info, time zone and counters. Mounted only once settings have loaded. */
export function StoreSettingsForm() {
  const settings = useStoreSettingsStore((s) => s.settings);
  if (!settings) return null;
  // Keyed so the form resets if the settings change from elsewhere.
  return <SettingsFields key={JSON.stringify(settings)} settings={settings} />;
}

function SettingsFields({ settings }: { settings: StoreSettings }) {
  const updateSettings = useStoreSettingsStore((s) => s.updateSettings);
  const [form, setForm] = useState({
    name: settings.name,
    address: settings.address,
    phone: settings.phone,
    receiptHeader: settings.receiptHeader,
    receiptFooter: settings.receiptFooter,
    timezone: settings.timezone,
    nextZNumber: String(settings.nextZNumber),
    grandTotal: formatMoney(settings.grandTotal),
    nextSeqNumber: String(settings.nextSeqNumber),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const nextZNumber = Number(form.nextZNumber);
    const grandTotal = parseMoney(form.grandTotal);
    const nextSeqNumber = Number(form.nextSeqNumber);
    if (!Number.isInteger(nextZNumber) || nextZNumber < 1)
      return setError("Next Z number must be a whole number, 1 or more.");
    if (grandTotal === null)
      return setError("Grand total must be an amount like 10,105,881.28.");
    if (!Number.isInteger(nextSeqNumber) || nextSeqNumber < 1)
      return setError("Next receipt number must be a whole number, 1 or more.");

    setSaving(true);
    try {
      await updateSettings({
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        receiptHeader: form.receiptHeader.trim(),
        receiptFooter: form.receiptFooter.trim(),
        timezone: form.timezone,
        nextZNumber,
        grandTotal,
        nextSeqNumber,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className={sectionClass}>
        <h2 className="text-lg font-semibold">Store info</h2>
        <p className="text-sm text-foreground/60">Printed at the top and bottom of receipts.</p>
        <Field label="Restaurant name" htmlFor="name">
          <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </Field>
        <Field label="Address" htmlFor="address">
          <Input id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </Field>
        <Field label="Receipt header" htmlFor="receiptHeader" hint="Extra line under the name, e.g. GST number.">
          <Input id="receiptHeader" value={form.receiptHeader} onChange={(e) => setField("receiptHeader", e.target.value)} />
        </Field>
        <Field label="Receipt footer" htmlFor="receiptFooter">
          <Input id="receiptFooter" value={form.receiptFooter} onChange={(e) => setField("receiptFooter", e.target.value)} />
        </Field>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-semibold">Time zone</h2>
        <Field label="Timezone" htmlFor="timezone">
          <Select id="timezone" value={form.timezone} onChange={(e) => setField("timezone", e.target.value)}>
            {CANADA_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className={sectionClass}>
        <h2 className="text-lg font-semibold">Counters</h2>
        <p className="text-sm text-foreground/60">
          Set these once when switching from the old register, from its last Z tape.
          After that the register updates them on its own — only change them to fix a mistake.
        </p>
        <Field label="Next Z number" htmlFor="nextZ" hint="Last Z on the old register + 1, e.g. 3600.">
          <Input id="nextZ" inputMode="numeric" value={form.nextZNumber} onChange={(e) => setField("nextZNumber", e.target.value)} />
        </Field>
        <Field label="Grand total (GT)" htmlFor="gt" hint="GT printed on the old register's last Z.">
          <Input id="gt" inputMode="decimal" value={form.grandTotal} onChange={(e) => setField("grandTotal", e.target.value)} />
        </Field>
        <Field label="Next receipt number" htmlFor="nextSeq" hint="Restarts at 1 after each Z.">
          <Input id="nextSeq" inputMode="numeric" value={form.nextSeqNumber} onChange={(e) => setField("nextSeqNumber", e.target.value)} />
        </Field>
      </section>

      <FormError message={error} />
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-700">Saved</span>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
