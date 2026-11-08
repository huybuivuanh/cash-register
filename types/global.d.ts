// Shared Firestore entity shapes, available everywhere without importing.
// Money is always integer cents; tax rates are basis points (5% = 500).

declare global {
  type MemberRole = "staff" | "admin";

  /** members/{uid} — links a login to its one business. */
  interface Member {
    businessId: string;
    role: MemberRole;
  }

  /** settings/store — store info and running counters. */
  interface StoreSettings {
    name: string;
    address: string;
    phone: string;
    receiptHeader: string;
    receiptFooter: string;
    timezone: string;
    /** Next receipt number in the open Z. Restarts at 1 after each Z (the Z itself takes the last one). */
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
    /** Receipt number. Restarts at 1 after each Z. */
    seq: number;
    type: TransactionType;
    batchId: string;
    createdAt: Date;
    lines: TransactionLine[];
    subtotal: number;
    taxTotal: number;
    total: number;
    /** Cash handed over (refunds: = total). */
    tendered: number;
    change: number;
  }

  /** batches/{id} — the sales between two Z reports. */
  interface Batch {
    id: string;
    zNumber: number;
    status: "open" | "closed";
    openedAt: Date;
    closedAt: Date | null;
    /** Saved when the Z is closed. */
    totals: ZTotals | null;
  }

  /** Taxable amount and tax per tax (TA1/TX1, TA2/TX2). Refunds subtract. */
  interface TaxSummary {
    taxId: string;
    name: string;
    rateBps: number;
    taxable: number;
    tax: number;
  }

  /** Totals for an X or Z report. */
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
  }

  /** Totals saved with a closed Z. */
  interface ZTotals extends BatchTotals {
    /** The Z's own receipt number (it takes the next one when it closes). */
    zSeq: number;
    /** Grand total right after this Z. The running GT lives in settings/store. */
    grandTotalAfter: number;
  }
}

export {};
