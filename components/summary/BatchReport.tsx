import type { ReactNode } from "react";
import { formatMoney, formatSeq } from "@/lib/money";
import { formatRate } from "@/lib/tax";

/** 09-22-2026 20:41, like the old register's tape. */
export function formatTapeDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Row({
  label,
  count,
  amount,
  bold,
}: {
  label: ReactNode;
  count?: number;
  amount: ReactNode;
  bold?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto_7.5rem] gap-2 ${bold ? "font-bold" : ""}`}
    >
      <span className="truncate">{label}</span>
      <span className="text-right">{count ?? ""}</span>
      <span className="text-right">{amount}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-foreground/30" />;
}

/** DAILY X / DAILY Z report, laid out like the old register's tape (docs/DESIGN.md §10). */
export function BatchReport({
  kind,
  zNumber,
  storeName,
  totals,
  date,
  grandTotal,
  className = "",
}: {
  kind: "x" | "z";
  zNumber: number;
  storeName: string;
  totals: BatchTotals;
  date: Date;
  /** GT to print. Defaults to the GT saved with a closed Z. */
  grandTotal?: number;
  /** Extra classes for the outer box (e.g. colours). */
  className?: string;
}) {
  const gt = grandTotal ?? totals.grandTotalAfter;
  const taxTotal = totals.byTax.reduce((sum, t) => sum + t.tax, 0);

  return (
    <div className={`w-full rounded-xl border border-foreground/15 bg-background p-4 font-mono text-sm tabular-nums print:border-0 print:p-0 ${className}`}>
      {storeName && <p className="text-center font-bold">{storeName}</p>}
      <p className="text-center font-bold">
        DAILY {kind === "z" ? "Z" : "X"} · Z #{zNumber}
      </p>
      <div className="flex justify-between">
        <span>{totals.zSeq ? `#${formatSeq(totals.zSeq)}` : ""}</span>
        <span>{formatTapeDate(date)}</span>
      </div>

      <Divider />
      <Row
        label="GROSS (before tax)"
        count={totals.saleCount}
        amount={formatMoney(totals.gross)}
      />
      <Row
        label="REFUNDS"
        count={totals.refundCount}
        amount={formatMoney(totals.refundTotal)}
      />
      <Row
        label="CANCELLED"
        count={totals.cancelCount}
        amount={formatMoney(totals.cancelTotal)}
      />

      <Divider />
      <div className="grid grid-cols-[1fr_7.5rem_6rem] gap-2 font-bold">
        <span>TAX</span>
        <span className="text-right">TAXABLE</span>
        <span className="text-right">TAX</span>
      </div>
      {totals.byTax.length === 0 && (
        <p className="text-foreground/60">No tax</p>
      )}
      {totals.byTax.map((t) => (
        <div
          key={`${t.taxId}:${t.rateBps}`}
          className="grid grid-cols-[1fr_7.5rem_6rem] gap-2"
        >
          <span className="truncate">
            {t.name} {formatRate(t.rateBps)}
          </span>
          <span className="text-right">{formatMoney(t.taxable)}</span>
          <span className="text-right">{formatMoney(t.tax)}</span>
        </div>
      ))}
      <Row label="TAX TOTAL" amount={formatMoney(taxTotal)} />

      <Divider />
      <Row label="NET (with tax)" amount={formatMoney(totals.net)} bold />

      <Divider />
      {gt !== undefined && <Row label="GT" amount={formatMoney(gt)} />}
      <Row label="Z TRANSACTIONS" amount={zNumber} />
    </div>
  );
}
