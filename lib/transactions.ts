import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { saleTotals } from "@/lib/tax";
import { STORE_SETTINGS_DEFAULTS } from "@/stores/storeSettingsStore";

type NewTransaction = {
  type: TransactionType;
  lines: TransactionLine[];
  tendered: number;
  change: number;
};

/**
 * Saves a sale or refund and gives it the next receipt number, all in one
 * Firestore transaction so two saves can never get the same number.
 * The first sale after a Z opens a new batch. Fails when offline — the
 * register then keeps the sale on screen so ENTER can be pressed again.
 */
export async function saveTransaction(input: NewTransaction): Promise<{ id: string; seq: number }> {
  const settingsRef = doc(db, "settings", "store");

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef);
    const settings = { ...STORE_SETTINGS_DEFAULTS, ...snap.data() } as StoreSettings;
    const seq = settings.nextSeqNumber;

    let batchId = settings.openBatchId;
    if (!batchId) {
      const batchRef = doc(collection(db, "batches"));
      tx.set(batchRef, {
        zNumber: settings.nextZNumber,
        status: "open",
        openedAt: serverTimestamp(),
        closedAt: null,
        totals: null,
      });
      batchId = batchRef.id;
    }

    const { subtotal, taxTotal, total } = saleTotals(input.lines);
    const txnRef = doc(collection(db, "transactions"));
    tx.set(txnRef, {
      seq,
      type: input.type,
      status: "completed",
      batchId,
      createdAt: serverTimestamp(),
      lines: input.lines,
      subtotal,
      taxTotal,
      total,
      tendered: input.tendered,
      change: input.change,
    });

    tx.set(settingsRef, { nextSeqNumber: seq + 1, openBatchId: batchId }, { merge: true });
    return { id: txnRef.id, seq };
  });
}

/**
 * First-time setup: GST 5% + PST 6%, and the old register's buttons
 * (DEPT026 → T1+2, DEPT027 → T1) plus NO TAX. Only for an empty database.
 */
export async function createDefaultTaxes(): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, "taxes", "tax1"), { name: "TX1", label: "GST", rateBps: 500, order: 1, active: true });
  batch.set(doc(db, "taxes", "tax2"), { name: "TX2", label: "PST", rateBps: 600, order: 2, active: true });
  batch.set(doc(db, "taxButtons", "t12"), { label: "T1+2", taxIds: ["tax1", "tax2"], order: 1, active: true });
  batch.set(doc(db, "taxButtons", "t1"), { label: "T1", taxIds: ["tax1"], order: 2, active: true });
  batch.set(doc(db, "taxButtons", "notax"), { label: "NO TAX", taxIds: [], order: 3, active: true });
  await batch.commit();
}

export type ClosedZ = { zNumber: number; closedAt: Date; totals: BatchTotals };

/**
 * Closes the open batch (the Z), all in one Firestore transaction:
 * saves the totals with the GT before/after, adds NET to the GT, gives the Z
 * the next receipt number, then moves on to the next Z number and restarts
 * receipt numbers at 1. The next sale
 * opens the new batch.
 *
 * `totals` come from the transactions on screen. `seenNextSeq` is the next
 * receipt number when they were worked out; if a sale was saved since then,
 * this refuses so the Z never misses it.
 */
export async function closeBatch(batchId: string, totals: BatchTotals, seenNextSeq: number): Promise<ClosedZ> {
  const settingsRef = doc(db, "settings", "store");
  const batchRef = doc(db, "batches", batchId);

  return runTransaction(db, async (tx) => {
    const settingsSnap = await tx.get(settingsRef);
    const batchSnap = await tx.get(batchRef);
    const settings = { ...STORE_SETTINGS_DEFAULTS, ...settingsSnap.data() } as StoreSettings;
    const batch = batchSnap.data();

    if (settings.openBatchId !== batchId || batch?.status !== "open") {
      throw new Error("This Z has already been closed.");
    }
    if (settings.nextSeqNumber !== seenNextSeq) {
      throw new Error("A sale was saved while closing. Check the totals and close the Z again.");
    }

    const zNumber = batch.zNumber as number;
    const saved: BatchTotals = {
      ...totals,
      zSeq: settings.nextSeqNumber,
      grandTotalBefore: settings.grandTotal,
      grandTotalAfter: settings.grandTotal + totals.net,
    };

    tx.update(batchRef, { status: "closed", closedAt: serverTimestamp(), totals: saved });
    tx.set(
      settingsRef,
      {
        grandTotal: saved.grandTotalAfter,
        nextZNumber: zNumber + 1,
        nextSeqNumber: 1,
        openBatchId: null,
      },
      { merge: true },
    );
    return { zNumber, closedAt: new Date(), totals: saved };
  });
}

/** Firestore Timestamp (or a pending server time) → Date. */
export function toDate(value: unknown): Date | null {
  return value && typeof value === "object" && "toDate" in value ? (value as { toDate: () => Date }).toDate() : null;
}

export function toTransaction(id: string, data: DocumentData): Transaction {
  return {
    ...(data as Omit<Transaction, "id" | "createdAt" | "cancelledAt">),
    id,
    createdAt: toDate(data.createdAt) ?? new Date(),
    cancelledAt: toDate(data.cancelledAt) ?? undefined,
  };
}

function toBatch(id: string, data: DocumentData): Batch {
  return {
    id,
    zNumber: data.zNumber,
    status: data.status,
    openedAt: toDate(data.openedAt) ?? new Date(),
    closedAt: toDate(data.closedAt),
    totals: data.totals ?? null,
  };
}

export type Journal = {
  transactions: Transaction[];
  /** Z reports closed in the range. */
  zReports: Batch[];
  /** True when there were more than `max` transactions and the rest were left out. */
  truncated: boolean;
};

/**
 * Every sale, refund and Z close from `start` up to (not including) `end`,
 * oldest first. Reads at most `max` transactions so a huge range can't load
 * everything.
 */
export async function loadJournal(start: Date, end: Date, max: number): Promise<Journal> {
  const [txnSnap, batchSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "transactions"),
        where("createdAt", ">=", start),
        where("createdAt", "<", end),
        orderBy("createdAt"),
        limit(max + 1),
      ),
    ),
    getDocs(
      query(collection(db, "batches"), where("closedAt", ">=", start), where("closedAt", "<", end), orderBy("closedAt")),
    ),
  ]);
  const transactions = txnSnap.docs.slice(0, max).map((d) => toTransaction(d.id, d.data()));
  return {
    transactions,
    zReports: batchSnap.docs.map((d) => toBatch(d.id, d.data())),
    truncated: txnSnap.docs.length > max,
  };
}
