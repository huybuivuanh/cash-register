/**
 * Tax math. Amounts are integer cents, rates are basis points (5% = 500).
 * Tax is worked out per line and per tax, rounded half up to the cent —
 * this reproduces the old register's tape exactly (see docs/DESIGN.md §2).
 */

/** round_half_up(amount × rateBps / 10000) for non-negative integer cents. */
export function taxOn(amount: number, rateBps: number): number {
  return Math.floor((amount * rateBps + 5000) / 10000);
}

/** Taxes a tax button charges on an amount, with each tax's name and rate copied in. */
export function lineTaxes(
  amount: number,
  taxes: Pick<Tax, "id" | "name" | "rateBps">[],
): LineTax[] {
  return taxes.map((tax) => ({
    taxId: tax.id,
    name: tax.name,
    rateBps: tax.rateBps,
    amount: taxOn(amount, tax.rateBps),
  }));
}

export type SaleTotals = {
  subtotal: number;
  taxTotal: number;
  total: number;
  /** One row per tax, in the order first seen (TA1/TX1, TA2/TX2…). */
  byTax: TaxSummary[];
};

/** Adds up a sale's lines. */
export function saleTotals(lines: TransactionLine[]): SaleTotals {
  let subtotal = 0;
  let taxTotal = 0;
  const byTax = new Map<string, TaxSummary>();
  for (const line of lines) {
    subtotal += line.amount;
    for (const t of line.taxes) {
      taxTotal += t.amount;
      // Same tax at a different rate (rate changed mid-sale) gets its own row.
      const key = `${t.taxId}:${t.rateBps}`;
      const row = byTax.get(key) ?? { taxId: t.taxId, name: t.name, rateBps: t.rateBps, taxable: 0, tax: 0 };
      row.taxable += line.amount;
      row.tax += t.amount;
      byTax.set(key, row);
    }
  }
  return { subtotal, taxTotal, total: subtotal + taxTotal, byTax: [...byTax.values()] };
}

/** "5" → 500, "5.5%" → 550, "12.25" → 1225. Null for anything else (max 2 decimals). */
export function parseRate(input: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(input.replace(/[%\s]/g, ""));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** 500 → "5%", 1250 → "12.5%" */
export function formatRate(rateBps: number): string {
  return `${rateBps / 100}%`;
}
