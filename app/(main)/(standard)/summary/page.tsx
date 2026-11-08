"use client";

import { useMemo, useState } from "react";
import { BatchReport, formatTapeDate } from "@/components/summary/BatchReport";
import { useBatchTransactions } from "@/components/summary/useBatchTransactions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";
import { computeBatchTotals } from "@/lib/reports";
import { closeBatch, type ClosedZ } from "@/lib/transactions";
import { confirmDialog } from "@/stores/modalStore";
import { useStoreSettingsStore } from "@/stores/storeSettingsStore";
import { useAuth } from "@/contexts/AuthContext";
import { ViewOnlyNote } from "@/components/ViewOnlyNote";

/** Live totals for the open batch (like DAILY X), with Print and Close Z. */
export default function SummaryPage() {
  const { settings, error: settingsError } = useStoreSettingsStore();
  const { isAdmin } = useAuth();
  const batchId = settings?.openBatchId ?? null;
  const { transactions, openedAt, loading, error } = useBatchTransactions(batchId);
  const totals = useMemo(() => computeBatchTotals(transactions), [transactions]);
  const [closed, setClosed] = useState<ClosedZ | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  if (settingsError || error) return <p className="text-red-600">Can&apos;t load the summary: {settingsError || error}</p>;
  if (!settings || loading) return <p className="text-foreground/60">Loading…</p>;

  if (closed) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Z #{closed.zNumber} closed</h1>
            <p className="text-sm text-foreground/60">
              NET {formatMoney(closed.totals.net)} added to the grand total. The next sale starts Z #{closed.zNumber + 1}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setClosed(null)}>
              Done
            </Button>
            <Button onClick={() => window.print()}>Print Z</Button>
          </div>
        </div>
        <BatchReport kind="z" zNumber={closed.zNumber} storeName={settings.name} totals={closed.totals} date={closed.closedAt} />
      </div>
    );
  }

  const zNumber = settings.nextZNumber;
  const hasSales = !!batchId && transactions.length > 0;

  async function handleClose() {
    if (!settings || !batchId) return;
    const ok = await confirmDialog(
      `NET ${formatMoney(totals.net)} will be added to the grand total, and the next sale starts Z #${zNumber + 1}.\n\nThis can't be undone.`,
      { title: `Close Z #${zNumber}?`, confirmLabel: "Close Z", danger: true },
    );
    if (!ok) return;
    setClosing(true);
    setCloseError(null);
    try {
      setClosed(await closeBatch(batchId, totals, settings.nextSeqNumber));
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : "Couldn't close the Z.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Summary</h1>
          <p className="text-sm text-foreground/60">
            {hasSales
              ? `Z #${zNumber} is open${openedAt ? ` since ${formatTapeDate(openedAt)}` : ""}. Updates live as sales are saved.`
              : `No sales since the last Z. The next sale starts Z #${zNumber}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
          <Button onClick={handleClose} disabled={!isAdmin || !hasSales || closing}>
            {closing ? "Closing…" : `Close Z #${zNumber}`}
          </Button>
        </div>
      </div>
      {!isAdmin && <ViewOnlyNote />}
      <div className="print:hidden">
        <FormError message={closeError} />
      </div>
      <BatchReport
        kind="x"
        zNumber={zNumber}
        storeName={settings.name}
        totals={totals}
        date={new Date()}
        grandTotal={settings.grandTotal + totals.net}
      />
    </div>
  );
}
