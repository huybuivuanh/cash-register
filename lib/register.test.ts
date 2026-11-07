/**
 * Run with `npm test`. Replays the old register's 09-22-2026 tape (docs/DESIGN.md §2)
 * through the keypad logic and checks every number matches.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { saleTotals, taxOn } from "./tax.ts";
import {
  initialRegisterState,
  reduceRegister,
  type RegisterAction,
  type RegisterState,
} from "./register-machine.ts";

const TX1 = { id: "tax1", name: "TX1", rateBps: 500 };
const TX2 = { id: "tax2", name: "TX2", rateBps: 600 };
const T12 = { id: "t12", label: "T1+2" };
const T1 = { id: "t1", label: "T1" };

/** Presses keys: "22072" types digits, other strings are named keys. */
function press(state: RegisterState, ...keys: (string | RegisterAction)[]): RegisterState {
  for (const key of keys) {
    if (typeof key !== "string") state = reduceRegister(state, key);
    else if (/^\d+$/.test(key)) {
      for (const d of key) state = reduceRegister(state, { type: "digit", digit: d as "0" });
    } else if (key === "T12") state = reduceRegister(state, { type: "taxButton", button: T12, taxes: [TX1, TX2] });
    else if (key === "T1") state = reduceRegister(state, { type: "taxButton", button: T1, taxes: [TX1] });
    else state = reduceRegister(state, { type: key } as RegisterAction);
  }
  return state;
}

test("tax rounds half up per line", () => {
  assert.equal(taxOn(344326, 500), 17216); // 172.163
  assert.equal(taxOn(344326, 600), 20660); // 206.5956
  assert.equal(taxOn(22072, 500), 1104); // 11.036
  assert.equal(taxOn(22072, 600), 1324); // 13.2432
  assert.equal(taxOn(336906, 500), 16845); // 168.453
  assert.equal(taxOn(10, 500), 1); // 0.5 → 1
  assert.equal(taxOn(9, 500), 0); // 0.45 → 0
});

test("reproduces the 09-22-2026 tape", () => {
  const receipts = [
    { keys: ["344326", "T12"], total: 382202 },
    { keys: ["22072", "T12"], total: 24500 },
    { keys: ["336906", "T1"], total: 353751 },
  ];
  const allLines: TransactionLine[] = [];
  let seq = 1;
  for (const r of receipts) {
    let s = press(initialRegisterState, ...r.keys, "subtotal");
    assert.equal(saleTotals(s.lines).total, r.total);
    s = press(s, "enter");
    assert.equal(s.phase, "saving");
    assert.deepEqual(s.payment, { tendered: r.total, change: 0 });
    allLines.push(...s.lines);
    s = press(s, { type: "saved", seq: seq++ });
    assert.equal(s.phase, "done");
  }

  // Z report totals.
  const z = saleTotals(allLines);
  assert.equal(z.subtotal, 703304); // GROSS
  assert.equal(z.total, 760453); // NET
  assert.deepEqual(
    z.byTax.map((t) => [t.name, t.taxable, t.tax]),
    [
      ["TX1", 703304, 35165],
      ["TX2", 366398, 21984],
    ],
  );
});

test("cash tendered gives change (receipt 000002)", () => {
  const s = press(initialRegisterState, "22072", "T12", "subtotal", "30000", "enter");
  assert.deepEqual(s.payment, { tendered: 30000, change: 5500 });
});

test("too little cash is refused and nothing saves", () => {
  const s = press(initialRegisterState, "22072", "T12", "subtotal", "20000", "enter");
  assert.equal(s.phase, "subtotal");
  assert.match(s.error ?? "", /less than the total/);
});

test("ENTER before SUBTOTAL only shows the total", () => {
  let s = press(initialRegisterState, "1000", "T1", "enter");
  assert.equal(s.phase, "subtotal");
  s = press(s, "enter");
  assert.equal(s.phase, "saving");
});

test("an amount without a tax button can't be subtotalled", () => {
  const s = press(initialRegisterState, "1000", "T1", "500", "subtotal");
  assert.equal(s.phase, "entry");
  assert.ok(s.error);
});

test("a tax button after SUBTOTAL adds another line", () => {
  const s = press(initialRegisterState, "1000", "T1", "subtotal", "500", "T12");
  assert.equal(s.phase, "entry");
  assert.equal(s.lines.length, 2);
});

test("CLR clears typing first, then removes the last line", () => {
  let s = press(initialRegisterState, "1000", "T1", "2000", "T1", "55");
  s = press(s, "clear");
  assert.equal(s.digits, "");
  assert.equal(s.lines.length, 2);
  s = press(s, "clear");
  assert.deepEqual(s.lines.map((l) => l.amount), [1000]);
});

test("00 and leading zeros", () => {
  const s = press(initialRegisterState, "0", { type: "digit", digit: "00" }, "12", { type: "digit", digit: "00" });
  assert.equal(s.digits, "1200");
});

test("refund pays out the exact total", () => {
  let s = press(initialRegisterState, "refund", "22072", "T12", "subtotal", "enter");
  assert.equal(s.mode, "refund");
  assert.deepEqual(s.payment, { tendered: 24500, change: 0 });
  s = press(s, { type: "saved", seq: 9 });
  assert.equal(s.done?.type, "refund");
  assert.equal(s.mode, "sale"); // next sale is back to normal
});

test("refund can't start mid-sale, and pressing it again turns it off", () => {
  assert.ok(press(initialRegisterState, "100", "refund").error);
  assert.equal(press(initialRegisterState, "refund", "refund").mode, "sale");
});

test("keys are ignored while saving; a failed save keeps the sale", () => {
  let s = press(initialRegisterState, "1000", "T1", "subtotal", "enter", "5", "cancelSale");
  assert.equal(s.phase, "saving");
  assert.equal(s.lines.length, 1);
  s = press(s, { type: "saveFailed", message: "offline" });
  assert.equal(s.phase, "subtotal");
  assert.equal(s.error, "offline");
  assert.equal(s.lines.length, 1);
});

test("after a sale, typing starts the next one", () => {
  const s = press(initialRegisterState, "1000", "T1", "subtotal", "enter", { type: "saved", seq: 1 }, "7");
  assert.equal(s.phase, "entry");
  assert.equal(s.digits, "7");
  assert.equal(s.done, null);
});
