import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";
import { typedAmount, type RegisterAction, type RegisterState } from "@/lib/register-machine";
import { formatRate, saleTotals } from "@/lib/tax";

/** A tax button with the active taxes it charges. */
export type TaxKey = { button: TaxButton; taxes: Tax[] };

type Tone = "digit" | "func" | "tax" | "danger" | "enter";

const TONE_CLASS: Record<Tone, string> = {
  digit: "bg-foreground/5 text-2xl font-semibold hover:bg-foreground/10",
  func: "bg-foreground/10 text-sm font-bold hover:bg-foreground/15",
  tax: "bg-gold/25 font-bold hover:bg-gold/40",
  danger: "bg-red-600/10 text-sm font-bold text-red-700 hover:bg-red-600/20",
  enter: "bg-ink text-lg font-bold text-on-ink hover:opacity-90",
};

function Key({
  tone,
  onPress,
  className = "",
  children,
  ...rest
}: {
  tone: Tone;
  onPress: () => void;
  className?: string;
  children: ReactNode;
  "aria-pressed"?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      // Keep focus off the keys so the physical Enter key never "clicks" the last one tapped.
      onMouseDown={(e) => e.preventDefault()}
      className={`flex min-h-16 select-none flex-col items-center justify-center rounded-xl px-2 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 disabled:opacity-40 ${TONE_CLASS[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** What the big display shows for each step of a sale. */
function display(state: RegisterState): { label: string; value: number; sub?: string } {
  if (state.phase === "done" && state.done) {
    const total = saleTotals(state.done.lines).total;
    if (state.done.type === "refund") return { label: "CASH OUT", value: total };
    return { label: "CHANGE", value: state.done.change, sub: `Cash ${formatMoney(state.done.tendered)}` };
  }
  const total = saleTotals(state.lines).total;
  const refund = state.mode === "refund";
  if (state.phase === "saving") return { label: "SAVING…", value: total };
  if (state.phase === "subtotal") {
    if (state.digits) return { label: "CASH", value: typedAmount(state), sub: `Total ${formatMoney(total)}` };
    return {
      label: refund ? "REFUND TOTAL" : "TOTAL DUE",
      value: total,
      sub: refund ? "ENTER to pay out" : "Type cash given, or ENTER for exact",
    };
  }
  if (state.digits) return { label: "AMOUNT", value: typedAmount(state) };
  if (state.lines.length) return { label: "SUBTOTAL", value: total };
  return { label: refund ? "REFUND" : "READY", value: 0 };
}

const DIGIT_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
] as const;

/** Right side of the register: display, number keys, tax buttons, SUBTOTAL / ENTER. */
export function Keypad({
  state,
  taxKeys,
  press,
}: {
  state: RegisterState;
  taxKeys: TaxKey[];
  press: (action: RegisterAction) => void;
}) {
  const shown = display(state);
  const refund = state.mode === "refund" && state.phase !== "done";
  const saving = state.phase === "saving";

  return (
    <section aria-label="Keypad" className="space-y-3">
      <div
        className={`rounded-xl px-4 py-3 text-right ${refund ? "bg-red-600 text-white" : "bg-ink text-on-ink"}`}
        aria-live="polite"
      >
        <div className={`text-xs font-bold tracking-widest ${refund ? "text-white/80" : "text-gold"}`}>
          {shown.label}
        </div>
        <div className="text-4xl font-bold tabular-nums sm:text-5xl">{formatMoney(shown.value)}</div>
        <div className="min-h-5 text-sm opacity-70">{shown.sub}</div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-600/10 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <fieldset disabled={saving} className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {DIGIT_ROWS.map((row, r) => (
            <div key={r} className="contents">
              {row.map((d) => (
                <Key key={d} tone="digit" onPress={() => press({ type: "digit", digit: d })}>
                  {d}
                </Key>
              ))}
              {r === 0 && (
                <Key tone="func" onPress={() => press({ type: "clear" })} title="Backspace">
                  CLR
                </Key>
              )}
              {r === 1 && (
                <Key tone="danger" onPress={() => press({ type: "refund" })} aria-pressed={refund}>
                  REFUND
                </Key>
              )}
              {r === 2 && (
                <Key tone="func" onPress={() => press({ type: "cancelSale" })} title="Esc">
                  CANCEL SALE
                </Key>
              )}
            </div>
          ))}
          <Key tone="digit" className="col-span-2" onPress={() => press({ type: "digit", digit: "0" })}>
            0
          </Key>
          <Key tone="digit" className="col-span-2" onPress={() => press({ type: "digit", digit: "00" })}>
            00
          </Key>
        </div>

        {taxKeys.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {taxKeys.map(({ button, taxes }, i) => (
              <Key
                key={button.id}
                tone="tax"
                onPress={() => press({ type: "taxButton", button, taxes })}
                title={i < 6 ? `F${i + 1}` : undefined}
              >
                <span className="text-lg leading-tight">{button.label}</span>
                <span className="text-xs font-medium opacity-70">
                  {taxes.length ? taxes.map((t) => formatRate(t.rateBps)).join(" + ") : "no tax"}
                  {i < 6 && ` · F${i + 1}`}
                </span>
              </Key>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Key tone="func" className="text-base" onPress={() => press({ type: "subtotal" })} title="Shift">
            SUBTOTAL
          </Key>
          <Key tone="enter" onPress={() => press({ type: "enter" })} title="Enter">
            ENTER
          </Key>
        </div>
      </fieldset>
    </section>
  );
}
