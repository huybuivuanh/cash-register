/**
 * X / Z report totals from a batch's transactions (docs/DESIGN.md §7).
 * Pure, so it can be tested on its own. Refunds subtract; cancelled sales
 * are left out of the totals and only counted under cancel.
 */
export function computeBatchTotals(transactions: Transaction[]): BatchTotals {
  const byTax = new Map<string, TaxSummary>();
  const totals: BatchTotals = {
    gross: 0,
    byTax: [],
    net: 0,
    saleCount: 0,
    refundCount: 0,
    refundTotal: 0,
    cancelCount: 0,
    cancelTotal: 0,
    firstSeq: 0,
    lastSeq: 0,
  };

  for (const t of [...transactions].sort((a, b) => a.seq - b.seq)) {
    if (!totals.firstSeq) totals.firstSeq = t.seq;
    totals.lastSeq = t.seq;

    if (t.status === "cancelled") {
      totals.cancelCount++;
      totals.cancelTotal += t.total;
      continue;
    }

    const sign = t.type === "refund" ? -1 : 1;
    if (sign > 0) totals.saleCount++;
    else {
      totals.refundCount++;
      totals.refundTotal += t.total;
    }
    totals.gross += sign * t.subtotal;
    totals.net += sign * t.total;

    for (const line of t.lines) {
      for (const tax of line.taxes) {
        // Same tax at a different rate (rate changed mid-batch) gets its own row.
        const key = `${tax.taxId}:${tax.rateBps}`;
        const row = byTax.get(key) ?? { taxId: tax.taxId, name: tax.name, rateBps: tax.rateBps, taxable: 0, tax: 0 };
        row.taxable += sign * line.amount;
        row.tax += sign * tax.amount;
        byTax.set(key, row);
      }
    }
  }

  totals.byTax = [...byTax.values()].sort((a, b) => a.name.localeCompare(b.name) || a.rateBps - b.rateBps);
  return totals;
}
