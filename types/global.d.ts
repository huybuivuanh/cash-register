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
    /** "HH:MM" — sales before this time count toward the previous business day. */
    businessDayCutoff: string;
    /** Next number for receipts, X and Z (shared, like the old register). */
    nextSeqNumber: number;
    /** Z number the next batch gets. */
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
}

export {};
