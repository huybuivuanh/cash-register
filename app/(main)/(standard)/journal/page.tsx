"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { TransactionEntry, ZEntry } from "@/components/journal/JournalEntry";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";
import { computeBatchTotals } from "@/lib/reports";
import { formatRate } from "@/lib/tax";
import { loadJournal, type Journal } from "@/lib/transactions";
import { useStoreSettingsStore } from "@/stores/storeSettingsStore";

/** Most transactions one search loads; a bigger range shows a "narrow the dates" note. */
const MAX_TRANSACTIONS = 1000;

/** "YYYY-MM-DD" for today plus `offsetDays`, in local time (what a date input uses). */
function dayString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const neverChanges = () => () => {};

/**
 * Today as "YYYY-MM-DD", or null while rendering on the server. Today's date
 * must come from the browser (its time zone), not from the server's prerender.
 */
function useToday(): string | null {
  return useSyncExternalStore(neverChanges, () => dayString(), () => null);
}

/** Start of a "YYYY-MM-DD" day in local time. */
function startOfDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** [start of `from`, start of the day after `to`), or an error message. */
function rangeFor(from: string, to: string): [Date, Date] | string {
  if (!from || !to) return "Pick both dates.";
  const start = startOfDay(from);
  const end = startOfDay(to);
  end.setDate(end.getDate() + 1);
  return end <= start ? "The end date is before the start date." : [start, end];
}

type Entry = { kind: "txn"; at: Date; seq: number; t: Transaction } | { kind: "z"; at: Date; seq: number; batch: Batch };

/** Every sale, refund and Z close in a date range, like the old register's journal tape. */
export default function JournalPage() {
  const storeName = useStoreSettingsStore((s) => s.settings?.name ?? "");
  const grandTotal = useStoreSettingsStore((s) => s.settings?.grandTotal);
  const today = useToday();
  // null = not picked yet, so show today.
  const [pickedFrom, setFrom] = useState<string | null>(null);
  const [pickedTo, setTo] = useState<string | null>(null);
  const from = pickedFrom ?? today ?? "";
  const to = pickedTo ?? today ?? "";
  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function show(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    const range = rangeFor(nextFrom, nextTo);
    if (typeof range === "string") return setError(range);
    setLoading(true);
    setError(null);
    try {
      setJournal(await loadJournal(range[0], range[1], MAX_TRANSACTIONS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the transactions.");
    } finally {
      setLoading(false);
    }
  }

  // Today's transactions on first open (once the browser has given us today's date).
  useEffect(() => {
    if (!today) return;
    const [start, end] = rangeFor(today, today) as [Date, Date];
    loadJournal(start, end, MAX_TRANSACTIONS)
      .then(setJournal)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the transactions."))
      .finally(() => setLoading(false));
  }, [today]);

  const totals = useMemo(() => computeBatchTotals(journal?.transactions ?? []), [journal]);
  const entries = useMemo<Entry[]>(() => {
    if (!journal) return [];
    const list: Entry[] = [
      ...journal.transactions.map((t) => ({ kind: "txn" as const, at: t.createdAt, seq: t.seq, t })),
      ...journal.zReports.flatMap((batch) =>
        batch.closedAt ? [{ kind: "z" as const, at: batch.closedAt, seq: batch.totals?.zSeq ?? 0, batch }] : [],
      ),
    ];
    return list.sort((a, b) => a.at.getTime() - b.at.getTime() || a.seq - b.seq);
  }, [journal]);
  const taxTotal = totals.byTax.reduce((sum, t) => sum + t.tax, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Journal</h1>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          show(from, to);
        }}
      >
        <Field label="From" htmlFor="from">
          <Input id="from" type="date" value={from} max={today ?? undefined} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To" htmlFor="to">
          <Input id="to" type="date" value={to} max={today ?? undefined} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Show"}
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={loading} onClick={() => show(dayString(), dayString())}>
            Today
          </Button>
          <Button variant="secondary" disabled={loading} onClick={() => show(dayString(-1), dayString(-1))}>
            Yesterday
          </Button>
          <Button variant="secondary" disabled={loading} onClick={() => show(dayString(-6), dayString())}>
            Last 7 days
          </Button>
        </div>
      </form>

      <FormError message={error} />

      {journal && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Sales" value={String(totals.saleCount)} />
            <Stat label="Before tax" value={formatMoney(totals.gross)} />
            {totals.byTax.map((t) => (
              <Stat
                key={`${t.taxId}:${t.rateBps}`}
                label={`${t.name} ${formatRate(t.rateBps)}`}
                value={formatMoney(t.tax)}
                tone="tax"
              />
            ))}
            <Stat label="Tax total" value={formatMoney(taxTotal)} tone="tax" />
            <Stat label="Total with tax" value={formatMoney(totals.net)} tone="total" />
            {grandTotal !== undefined && (
              <Stat label="Grand total (as of last Z)" value={formatMoney(grandTotal)} tone="gt" />
            )}
          </section>
          {(totals.refundCount > 0 || totals.cancelCount > 0) && (
            <p className="text-sm text-foreground/70">
              {[
                totals.refundCount > 0 && `${totals.refundCount} refunds: −${formatMoney(totals.refundTotal)}`,
                totals.cancelCount > 0 && `${totals.cancelCount} cancelled: ${formatMoney(totals.cancelTotal)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {journal.truncated && (
            <p className="rounded-lg border border-gold bg-gold/10 px-3 py-2 text-sm">
              Showing the first {MAX_TRANSACTIONS} transactions only, so the totals above are incomplete. Pick a
              shorter date range.
            </p>
          )}

          {entries.length === 0 ? (
            <p className="text-foreground/60">No transactions in these dates.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) =>
                entry.kind === "txn" ? (
                  <TransactionEntry key={entry.t.id} t={entry.t} />
                ) : (
                  <ZEntry key={entry.batch.id} batch={entry.batch} storeName={storeName} />
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const STAT_TONES = {
  plain: { box: "border border-foreground/10 bg-background", label: "text-foreground/60" },
  tax: { box: "border border-gold/50 bg-gold/10", label: "text-foreground/70" },
  total: { box: "bg-ink text-on-ink", label: "text-gold" },
  gt: { box: "border-2 border-gold bg-background", label: "text-foreground/70" },
} as const;

function Stat({ label, value, tone = "plain" }: { label: string; value: string; tone?: keyof typeof STAT_TONES }) {
  const style = STAT_TONES[tone];
  return (
    <div className={`rounded-xl p-3 ${style.box}`}>
      <p className={`text-xs font-medium ${style.label}`}>{label}</p>
      <p className={`tabular-nums ${tone === "total" ? "text-xl font-bold" : "text-lg font-semibold"}`}>{value}</p>
    </div>
  );
}
