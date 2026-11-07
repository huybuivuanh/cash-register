import { formatMoney, formatSeq } from "@/lib/money";
import type { RegisterState } from "@/lib/register-machine";
import { formatRate, saleTotals } from "@/lib/tax";

function Row({ label, amount, className = "" }: { label: React.ReactNode; amount: number; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{formatMoney(amount)}</span>
    </div>
  );
}

/** Left side of the register: the sale being rung up, or the one just saved. */
export function SalePanel({ state, nextSeq }: { state: RegisterState; nextSeq: number }) {
  const done = state.done;
  const lines = done ? done.lines : state.lines;
  const type = done ? done.type : state.mode;
  const refund = type === "refund";
  const totals = saleTotals(lines);

  return (
    <section
      aria-label={refund ? "Refund" : "Sale"}
      className={`flex min-h-80 flex-col overflow-hidden rounded-xl border-2 ${refund ? "border-red-600" : "border-foreground/10"}`}
    >
      <header
        className={`flex items-center justify-between gap-3 px-4 py-3 font-semibold ${refund ? "bg-red-600 text-white" : "bg-foreground/5"}`}
      >
        <span className="tracking-wide">{refund ? "*** REFUND ***" : "SALE"}</span>
        <span className="tabular-nums">
          #{formatSeq(done ? done.seq : nextSeq)}
          {done && <span className={`ml-2 text-sm ${refund ? "text-white" : "text-green-700"}`}>✓ saved</span>}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {lines.length === 0 ? (
          <p className="text-foreground/60">
            {refund
              ? "Refund mode: ring up what's being refunded, then SUBTOTAL and ENTER. Press REFUND again to go back."
              : "Type an amount, then press a tax button."}
          </p>
        ) : (
          lines.map((line, i) => (
            <div key={i}>
              <Row label={<span className="font-medium">{line.buttonLabel}</span>} amount={line.amount} />
              {line.taxes.map((t) => (
                <Row
                  key={t.taxId}
                  label={`${t.name} ${formatRate(t.rateBps)}`}
                  amount={t.amount}
                  className="pl-4 text-sm text-foreground/60"
                />
              ))}
            </div>
          ))
        )}
      </div>

      {lines.length > 0 && (
        <footer className="space-y-1 border-t border-foreground/10 px-4 py-3">
          <Row label="Subtotal" amount={totals.subtotal} />
          {totals.byTax.map((t) => (
            <Row key={`${t.taxId}:${t.rateBps}`} label={`${t.name} ${formatRate(t.rateBps)}`} amount={t.tax} />
          ))}
          <Row label="TOTAL" amount={totals.total} className="pt-1 text-xl font-bold" />
          {done && !refund && (
            <>
              <Row label="Cash" amount={done.tendered} />
              <Row label="Change" amount={done.change} className="text-lg font-semibold" />
            </>
          )}
          {done && refund && <Row label="Cash out" amount={done.tendered} className="text-lg font-semibold" />}
        </footer>
      )}
    </section>
  );
}
