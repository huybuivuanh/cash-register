// Shared Firestore entity shapes, available everywhere without importing.
// Money is always integer cents; tax rates are basis points (5% = 500).

declare global {
  /** settings/store — store info and running counters. */
  interface StoreSettings {
    name: string;
    address: string;
    phone: string;
    receiptHeader: string;
    receiptFooter: string;
    timezone: string;
    /** Next number for receipts, X and Z (shared, like the old register). */
    nextSeqNumber: number;
    /** Z number of the open batch (or of the next one, before the first sale). Goes up at each Z. */
    nextZNumber: number;
    /** Lifetime grand total (GT) in cents. Never resets. */
    grandTotal: number;
    /** The open batch, or null before the first sale. */
    openBatchId: string | null;
    autoPrint: boolean;
  }

  /** taxes/{id} */
  interface Tax {
    id: string;
    /** Short name on reports, e.g. "TX1". */
    name: string;
    /** Long name, e.g. "GST". */
    label: string;
    rateBps: number;
    order: number;
    /** Hidden taxes stay in history but can't be used for new sales. */
    active: boolean;
  }

  /** taxButtons/{id} — a keypad button that applies zero or more taxes. */
  interface TaxButton {
    id: string;
    label: string;
    taxIds: string[];
    order: number;
    active: boolean;
  }

  /** One tax charged on a line, copied at sale time so later rate changes don't alter history. */
  interface LineTax {
    taxId: string;
    name: string;
    rateBps: number;
    amount: number;
  }

  /** One amount rung up with a tax button. */
  interface TransactionLine {
    buttonId: string;
    buttonLabel: string;
    amount: number;
    taxes: LineTax[];
  }

  type TransactionType = "sale" | "refund";

  /** transactions/{id} — a completed sale or refund. Amounts are positive; `type` decides the sign. */
  interface Transaction {
    id: string;
    /** Receipt number, shared with X and Z. */
    seq: number;
    type: TransactionType;
    status: "completed" | "cancelled";
    batchId: string;
    createdAt: Date;
    lines: TransactionLine[];
    subtotal: number;
    taxTotal: number;
    total: number;
    /** Cash handed over (refunds: = total). */
    tendered: number;
    change: number;
    cancelledAt?: Date;
    cancelReason?: string;
  }

  /** batches/{id} — the sales between two Z reports. */
  interface Batch {
    id: string;
    zNumber: number;
    status: "open" | "closed";
    openedAt: Date;
    closedAt: Date | null;
    /** Saved when the Z is closed. */
    totals: BatchTotals | null;
  }

  /** Taxable amount and tax per tax (TA1/TX1, TA2/TX2). Refunds subtract. */
  interface TaxSummary {
    taxId: string;
    name: string;
    rateBps: number;
    taxable: number;
    tax: number;
  }

  /** Totals for an X or Z report. Cancelled sales are only counted under cancel. */
  interface BatchTotals {
    /** Sales before tax, minus refunds (GROSS). */
    gross: number;
    byTax: TaxSummary[];
    /** Including tax, minus refunds (NET). */
    net: number;
    /** Completed sales, not refunds (CUST). */
    saleCount: number;
    refundCount: number;
    refundTotal: number;
    cancelCount: number;
    cancelTotal: number;
    /** First and last receipt number in the batch, 0 when empty. */
    firstSeq: number;
    lastSeq: number;
    /** Z only: the Z's own number in the receipt sequence, and the GT before and after. */
    zSeq?: number;
    grandTotalBefore?: number;
    grandTotalAfter?: number;
  }
}

export {};
