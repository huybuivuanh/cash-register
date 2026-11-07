"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Loaded = {
  batchId: string;
  transactions: Transaction[];
  openedAt: Date | null;
  error: string | null;
};

/** Firestore Timestamp (or a pending server time) → Date. */
function toDate(value: unknown): Date | null {
  return value && typeof value === "object" && "toDate" in value ? (value as { toDate: () => Date }).toDate() : null;
}

function toTransaction(id: string, data: DocumentData): Transaction {
  return {
    ...(data as Omit<Transaction, "id" | "createdAt" | "cancelledAt">),
    id,
    createdAt: toDate(data.createdAt) ?? new Date(),
    cancelledAt: toDate(data.cancelledAt) ?? undefined,
  };
}

/** Live list of one batch's transactions, plus when the batch opened. */
export function useBatchTransactions(batchId: string | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!batchId) return;
    let transactions: Transaction[] | null = null;
    let openedAt: Date | null = null;
    let batchLoaded = false;
    const publish = () => {
      if (transactions && batchLoaded) setLoaded({ batchId, transactions, openedAt, error: null });
    };
    const fail = (err: Error) =>
      setLoaded({ batchId, transactions: [], openedAt: null, error: err.message || "Couldn't load the sales." });

    const stopTransactions = onSnapshot(
      query(collection(db, "transactions"), where("batchId", "==", batchId)),
      (snap) => {
        transactions = snap.docs.map((d) => toTransaction(d.id, d.data({ serverTimestamps: "estimate" })));
        publish();
      },
      fail,
    );
    const stopBatch = onSnapshot(
      doc(db, "batches", batchId),
      (snap) => {
        openedAt = toDate(snap.data({ serverTimestamps: "estimate" })?.openedAt);
        batchLoaded = true;
        publish();
      },
      fail,
    );
    return () => {
      stopTransactions();
      stopBatch();
    };
  }, [batchId]);

  // Results for an older batch don't count once the batch has changed.
  const current = batchId && loaded?.batchId === batchId ? loaded : null;
  return {
    transactions: current?.transactions ?? [],
    openedAt: current?.openedAt ?? null,
    loading: !!batchId && !current,
    error: current?.error ?? null,
  };
}
