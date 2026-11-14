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
type BatchReportProps = {
  zNumber: number;
  storeName: string;
  date: Date;
  /** Extra classes for the outer box (e.g. colours). */
  className?: string;
} & (
  | {
      kind: "x";
      totals: BatchTotals;
      /** GT to show for the open batch. */ grandTotal: number;
    }
  | { kind: "z"; totals: ZTotals }
);

export function BatchReport(props: BatchReportProps) {
  const { kind, zNumber, storeName, totals, date, className = "" } = props;
  const gt =
    props.kind === "z" ? props.totals.grandTotalAfter : props.grandTotal;
  const zSeq = props.kind === "z" ? props.totals.zSeq : null;
  const taxTotal = totals.byTax.reduce((sum, t) => sum + t.tax, 0);

  return (
    <div
      className={`w-full rounded-xl border border-foreground/15 bg-background p-4 font-mono text-sm tabular-nums print:border-0 print:p-0 ${className}`}
    >
      {storeName && <p className="text-center font-bold">{storeName}</p>}
      <p className="text-center font-bold">
        DAILY {kind === "z" ? "Z" : "X"} · Z #{formatSeq(zNumber)}
      </p>
      <div className="flex justify-between">
        <span>{zSeq ? `#${formatSeq(zSeq)}` : ""}</span>
        <span>{formatTapeDate(date)}</span>
      </div>

      <Divider />
      <Row label="Z TRANSACTIONS" amount={`#${formatSeq(zNumber)}`} />
      <Row label="GRAND TOTAL" amount={formatMoney(gt)} />

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

      <Divider />
      <div className="grid grid-cols-[1fr_7.5rem_6rem] gap-2 font-bold">
        <span>TAX</span>
        <span className="text-right">TAXABLE</span>
        <span className="text-right">TAX</span>
      </div>
      {totals.byTax.length === 0 && (
        <p className="text-foreground/60">No Tax</p>
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
    </div>
  );
}
