"use client";

import type { ReactNode } from "react";
import { BatchReport, formatTapeDate } from "@/components/summary/BatchReport";
import { formatMoney, formatSeq } from "@/lib/money";
import { formatRate, saleTotals } from "@/lib/tax";

const cardClass = "rounded-xl border border-foreground/15 bg-background p-3 font-mono text-sm tabular-nums";

function Row({ label, amount, className = "" }: { label: ReactNode; amount: ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between gap-3 ${className}`}>
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-right">{amount}</span>
    </div>
  );
}

/** One sale or refund, like a receipt on the journal tape. */
export function TransactionEntry({ t }: { t: Transaction }) {
  const refund = t.type === "refund";
  const { byTax } = saleTotals(t.lines);

  return (
    <article
      className={`${cardClass} border-l-4 ${
        refund ? "border-l-red-500 bg-red-50/60" : "border-l-emerald-500"
      }`}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-bold">
          <span
            className={`rounded-full px-2 py-0.5 font-sans text-xs font-semibold ${
              refund ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {refund ? "REFUND" : "SALE"}
          </span>
          #{formatSeq(t.seq)}
        </span>
        <span className="text-foreground/70">{formatTapeDate(t.createdAt)}</span>
      </div>
      <div>
        {t.lines.map((line, i) => (
          <Row key={i} label={line.buttonLabel} amount={formatMoney(line.amount)} />
        ))}
        {byTax.map((tax) => (
          <Row
            key={`${tax.taxId}:${tax.rateBps}`}
            className="pl-4 text-foreground/70"
            label={`${tax.name} ${formatRate(tax.rateBps)}`}
            amount={formatMoney(tax.tax)}
          />
        ))}
        <Row
          className={`mt-1 border-t border-dashed border-foreground/20 pt-1 font-bold ${refund ? "text-red-700" : ""}`}
          label="TOTAL"
          amount={refund ? `−${formatMoney(t.total)}` : formatMoney(t.total)}
        />
        {!refund && t.change > 0 && (
          <Row
            className="text-foreground/70"
            label={`PAID ${formatMoney(t.tendered)}`}
            amount={`CHANGE ${formatMoney(t.change)}`}
          />
        )}
      </div>
    </article>
  );
}

/** A Z close in the journal, shown in full like on the old register's tape. */
export function ZEntry({ batch, storeName }: { batch: Batch; storeName: string }) {
  if (batch.totals && batch.closedAt) {
    return (
      <BatchReport
        kind="z"
        zNumber={batch.zNumber}
        storeName={storeName}
        totals={batch.totals}
        date={batch.closedAt}
        className="border-2 border-gold bg-gold/10"
      />
    );
  }
  return (
    <article className={`${cardClass} border-2 border-gold bg-gold/10`}>
      <span className="font-bold">Z #{batch.zNumber} CLOSED</span>
    </article>
  );
}
