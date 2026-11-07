/**
 * The register's keypad logic as a pure function: (state, key) → new state.
 * No React or Firebase here, so it can be tested on its own. See docs/DESIGN.md §5.
 *
 *   entry ──SUBTOTAL / ENTER──▶ subtotal ──ENTER──▶ saving ──▶ done
 *     ▲    ◀── tax button / CLR ──┘                   │ fail → subtotal
 *     └──────────────────── any key ◀─────────────────┘
 */
import { formatMoney } from "./money.ts";
import { lineTaxes, saleTotals } from "./tax.ts";

/** Up to 9,999,999.99 per typed amount. */
export const MAX_DIGITS = 9;

export type RegisterPhase = "entry" | "subtotal" | "saving" | "done";

export type Payment = { tendered: number; change: number };

/** The sale that was just saved, kept on screen until the next key. */
export type CompletedSale = Payment & {
  seq: number;
  type: TransactionType;
  lines: TransactionLine[];
};

export type RegisterState = {
  mode: TransactionType;
  lines: TransactionLine[];
  /** What's been typed, in cents, without leading zeros ("" = nothing). */
  digits: string;
  phase: RegisterPhase;
  /** Set while saving. */
  payment: Payment | null;
  error: string | null;
  done: CompletedSale | null;
};

export type RegisterAction =
  | { type: "digit"; digit: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" }
  | { type: "clear" }
  | { type: "taxButton"; button: Pick<TaxButton, "id" | "label">; taxes: Pick<Tax, "id" | "name" | "rateBps">[] }
  | { type: "subtotal" }
  | { type: "enter" }
  | { type: "cancelSale" }
  | { type: "refund" }
  | { type: "saved"; seq: number }
  | { type: "saveFailed"; message: string };

export const initialRegisterState: RegisterState = {
  mode: "sale",
  lines: [],
  digits: "",
  phase: "entry",
  payment: null,
  error: null,
  done: null,
};

/** The typed amount in cents. */
export function typedAmount(state: RegisterState): number {
  return state.digits ? Number(state.digits) : 0;
}

function fail(state: RegisterState, error: string): RegisterState {
  return { ...state, error };
}

export function reduceRegister(state: RegisterState, action: RegisterAction): RegisterState {
  // Keys are ignored while saving; only the save result moves things on.
  if (state.phase === "saving") {
    if (action.type === "saved" && state.payment) {
      return {
        ...initialRegisterState,
        phase: "done",
        done: { seq: action.seq, type: state.mode, lines: state.lines, ...state.payment },
      };
    }
    if (action.type === "saveFailed") {
      return { ...state, phase: "subtotal", payment: null, error: action.message };
    }
    return state;
  }
  if (action.type === "saved" || action.type === "saveFailed") return state;

  // After a sale, the next key starts a fresh one. Keys that only make sense
  // mid-sale just clear the finished sale off the screen.
  if (state.phase === "done") {
    const fresh = initialRegisterState;
    if (action.type === "digit" || action.type === "refund") return reduceRegister(fresh, action);
    return fresh;
  }

  const s = state.error ? { ...state, error: null } : state;

  switch (action.type) {
    case "digit": {
      const digits = (s.digits + action.digit).replace(/^0+/, "");
      if (digits.length > MAX_DIGITS) return fail(s, "That amount is too large.");
      return { ...s, digits };
    }

    case "clear":
      if (s.digits) return { ...s, digits: "" };
      if (s.lines.length) return { ...s, lines: s.lines.slice(0, -1), phase: "entry" };
      return s;

    case "taxButton": {
      const amount = typedAmount(s);
      if (!amount) return fail(s, `Type an amount, then press ${action.button.label}.`);
      const line: TransactionLine = {
        buttonId: action.button.id,
        buttonLabel: action.button.label,
        amount,
        taxes: lineTaxes(amount, action.taxes),
      };
      return { ...s, lines: [...s.lines, line], digits: "", phase: "entry" };
    }

    case "subtotal":
      if (s.phase === "subtotal") return s;
      if (s.digits) return fail(s, "Press a tax button for the amount you typed.");
      if (!s.lines.length) return fail(s, "Nothing has been rung up yet.");
      return { ...s, phase: "subtotal" };

    case "enter": {
      // ENTER before SUBTOTAL shows the total first, so one stray press never saves.
      if (s.phase === "entry") return reduceRegister(s, { type: "subtotal" });

      const { total } = saleTotals(s.lines);
      if (s.mode === "refund") {
        if (s.digits) return fail(s, "Refunds pay out the exact total. Press CLR, then ENTER.");
        return { ...s, phase: "saving", payment: { tendered: total, change: 0 } };
      }
      const tendered = s.digits ? typedAmount(s) : total;
      if (tendered < total) {
        return fail(s, `Cash ${formatMoney(tendered)} is less than the total ${formatMoney(total)}.`);
      }
      return { ...s, phase: "saving", payment: { tendered, change: tendered - total } };
    }

    case "cancelSale":
      return initialRegisterState;

    case "refund":
      if (s.lines.length || s.digits) return fail(s, "Finish or cancel this sale before starting a refund.");
      return { ...s, mode: s.mode === "sale" ? "refund" : "sale" };
  }
}
