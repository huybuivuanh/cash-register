"use client";

import { useState, type ReactNode } from "react";
import { useStoreSettingsStore } from "@/stores/storeSettingsStore";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, inputClass, Select } from "@/components/ui/form";
import { formatMoney, formatSeq } from "@/lib/money";
import { cleanStoreInfo, storeInfoError, type StoreInfo } from "@/lib/setup";
import { sectionClass } from "@/components/settings/SettingsList";
import { ViewOnlyNote } from "@/components/ViewOnlyNote";
import { useAuth } from "@/contexts/AuthContext";

const CANADA_TIMEZONES = [
  { value: "America/Vancouver", label: "Pacific Time — Vancouver, Victoria" },
  { value: "America/Edmonton", label: "Mountain Time — Edmonton, Calgary" },
  { value: "America/Regina", label: "Central Time (no DST) — Regina, Saskatoon" },
  { value: "America/Winnipeg", label: "Central Time — Winnipeg" },
  { value: "America/Toronto", label: "Eastern Time — Toronto, Ottawa" },
  { value: "America/Halifax", label: "Atlantic Time — Halifax, Moncton" },
  { value: "America/St_Johns", label: "Newfoundland Time — St. John's" },
] as const;

function errorText(err: unknown) {
  return err instanceof Error && err.message ? err.message : "Couldn't save. Please try again.";
}

/** Store info, time zone and counters, each shown as a card. Mounted once settings have loaded. */
export function StoreSettingsForm() {
  const settings = useStoreSettingsStore((s) => s.settings);
  const { isAdmin } = useAuth();
  if (!settings) return null;

  return (
    <div className="space-y-6">
      {!isAdmin && <ViewOnlyNote />}
      <StoreInfoCard settings={settings} canEdit={isAdmin} />
      <TimeZoneCard settings={settings} canEdit={isAdmin} />
      <CountersCard settings={settings} />
    </div>
  );
}

/**
 * Card that looks the same while viewing and editing: the same labels and
 * boxes, with Edit swapped for Cancel + Save in the top-right corner.
 */
function Card({
  title,
  description,
  canEdit = false,
  editing = false,
  saving = false,
  error = null,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  title: string;
  description?: string;
  canEdit?: boolean;
  editing?: boolean;
  saving?: boolean;
  error?: string | null;
  /** Leave out for cards that can't be edited (e.g. counters). */
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  children: ReactNode;
}) {
  return (
    <form
      className={sectionClass}
      onSubmit={(e) => {
        e.preventDefault();
        if (editing) onSave?.();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-foreground/60">{description}</p>}
        </div>
        {onEdit &&
          (editing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={onEdit} disabled={!canEdit}>
              Edit
            </Button>
          ))}
      </div>
      <FormError message={error} />
      {children}
    </form>
  );
}

/** A value shown in a box the same size as an input, so view and edit line up. */
function ValueBox({ value }: { value: string }) {
  return (
    <div className={`${inputClass} min-h-[2.625rem] break-words bg-foreground/[0.03] ${value ? "" : "text-foreground/40"}`}>
      {value || "—"}
    </div>
  );
}

const STORE_FIELDS: { key: keyof StoreInfo; label: string; required?: boolean; type?: string }[] = [
  { key: "name", label: "Restaurant name", required: true },
  { key: "address", label: "Address", required: true },
  { key: "phone", label: "Phone", required: true, type: "tel" },
  { key: "receiptHeader", label: "Receipt header (optional, e.g. GST number)" },
  { key: "receiptFooter", label: "Receipt footer (optional)" },
];

function StoreInfoCard({ settings, canEdit }: { settings: StoreSettings; canEdit: boolean }) {
  const updateSettings = useStoreSettingsStore((s) => s.updateSettings);
  /** The form while editing; null while viewing. */
  const [draft, setDraft] = useState<StoreInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    const { name, address, phone, receiptHeader, receiptFooter } = settings;
    setDraft({ name, address, phone, receiptHeader, receiptFooter });
    setError(null);
  }

  async function handleSave() {
    if (!draft) return;
    const missing = storeInfoError(draft);
    if (missing) return setError(missing);
    setSaving(true);
    setError(null);
    try {
      await updateSettings(cleanStoreInfo(draft));
      setDraft(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Store info"
      description="Printed at the top and bottom of receipts."
      canEdit={canEdit}
      editing={!!draft}
      saving={saving}
      error={error}
      onEdit={startEditing}
      onCancel={() => {
        setDraft(null);
        setError(null);
      }}
      onSave={handleSave}
    >
      <div className="space-y-4">
        {STORE_FIELDS.map(({ key, label, required, type }, i) => (
          <Field key={key} label={label} htmlFor={key} required={required}>
            {draft ? (
              <Input
                id={key}
                type={type}
                value={draft[key]}
                autoFocus={i === 0}
                onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
              />
            ) : (
              <ValueBox value={settings[key]} />
            )}
          </Field>
        ))}
      </div>
    </Card>
  );
}

function TimeZoneCard({ settings, canEdit }: { settings: StoreSettings; canEdit: boolean }) {
  const updateSettings = useStoreSettingsStore((s) => s.updateSettings);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = CANADA_TIMEZONES.find((tz) => tz.value === settings.timezone)?.label ?? settings.timezone;

  async function handleSave() {
    if (draft === null) return;
    setSaving(true);
    setError(null);
    try {
      await updateSettings({ timezone: draft });
      setDraft(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Time zone"
      canEdit={canEdit}
      editing={draft !== null}
      saving={saving}
      error={error}
      onEdit={() => {
        setDraft(settings.timezone);
        setError(null);
      }}
      onCancel={() => {
        setDraft(null);
        setError(null);
      }}
      onSave={handleSave}
    >
      <Field label="Time zone" htmlFor="timezone">
        {draft !== null ? (
          <Select id="timezone" value={draft} autoFocus onChange={(e) => setDraft(e.target.value)}>
            {CANADA_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        ) : (
          <ValueBox value={label} />
        )}
      </Field>
    </Card>
  );
}

/** Counters are never edited by hand: only sales and Z closes change them. */
function CountersCard({ settings }: { settings: StoreSettings }) {
  return (
    <Card
      title="Counters"
      description="Updated automatically by sales and Z closes. They can't be changed by hand, like on a real register."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current Z number">
          <ValueBox value={String(settings.nextZNumber)} />
        </Field>
        <Field label="Grand total (GT)">
          <ValueBox value={formatMoney(settings.grandTotal)} />
        </Field>
        <Field label="Next receipt number">
          <ValueBox value={formatSeq(settings.nextSeqNumber)} />
        </Field>
      </div>
    </Card>
  );
}
