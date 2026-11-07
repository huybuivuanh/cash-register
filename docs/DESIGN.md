# Cash Register — Design

A web-based cash register for a restaurant. It replaces the physical register's
day-to-day functions: ring up sales, apply tax, take cash, give change, refund,
print receipts, and run X / Z reports.

Stack: Next.js (App Router) + Tailwind, Firebase Auth, Cloud Firestore.
One register device. Cash only.

---

## 1. Scope

### In scope (v1)
| Feature | Old register equivalent |
| --- | --- |
| Enter amounts on a keypad | Number keys |
| Tax buttons, each applying one or more taxes (editable) | DEPT026 (T12), DEPT027 (T1) |
| Subtotal | SUBTOTAL key |
| Cash tendered + change due | Amount + CASH |
| Submit the transaction | ENTER / CASH |
| Refund | RF key |
| Cancel (void) a sale in the open batch | CANCEL |
| Print a receipt for any transaction | Receipt printer |
| Current batch summary, no reset | X report (DAILY X) |
| Close the batch, with grand total | Z report (DAILY Z) with GT |
| Print any past batch or day | Reprint Z / period report |

### Later
PDF download, CSV export, suggestions in §10.

### Not needed
Card / cheque payments, multiple registers, offline sales (a failed save just
shows an error and the cashier presses ENTER again), printer drivers (handled by
the owner; the app just prints through the browser).

---

## 2. Reference: the current register's tape (09-22-2026)

Used to check our math and report layout.

| # | Button | Amount | TX1 5% | TX2 6% | Total |
| --- | --- | --- | --- | --- | --- |
| 000001 | DEPT026 (T12) | 3,443.26 | 172.16 | 206.60 | 3,822.02 |
| 000002 | DEPT026 (T12) | 220.72 | 11.04 | 13.24 | 245.00 |
| 000003 | DEPT027 (T1) | 3,369.06 | 168.45 | — | 3,537.51 |
| | | **7,033.04** | **351.65** | **219.84** | **7,604.53** |

Z report: DEPT026 2 × 3,663.98 · DEPT027 1 × 3,369.06 · GROSS 7,033.04 ·
NET 7,604.53 · CAID (cash in drawer) 7,604.53 · RF 0 · CUST 3 · CANCEL 0 ·
TA1 7,033.04 / TX1 351.65 · TA2 3,663.98 / TX2 219.84 · GT 10,105,881.28 ·
Z counter 3599. Receipts, X and Z share one running number (000001 … 000005).

Per-line tax rounding (half up) reproduces every number above exactly.

---

## 3. Core rules

1. **Money is integer cents.** `$12.50` → `1250`. No floats in calculations.
2. **Tax rates are basis points.** `5%` → `500`. Tax per line per tax =
   `round_half_up(amount × rateBps / 10000)`.
3. **History never changes when settings change.** Each line copies the button
   name and each tax's name + rate it used.
4. **Nothing is deleted.** Mistakes are cancelled (status change); refunds are
   their own transactions.
5. **Every transaction belongs to a batch.** Exactly one batch is open. Z
   closes it and opens the next.
6. **Grand total (GT) never resets.** It is carried from Z to Z, starting from
   the old register's GT so the numbers continue.

---

## 4. Taxes and tax buttons

Two separate settings:

**Taxes** — the rates.
| Tax | Rate |
| --- | --- |
| Tax 1 (GST) | 5% |
| Tax 2 (PST) | 6% |

**Tax buttons** — what appears on the keypad. Each button has a label and the
list of taxes it applies (zero, one or several).
| Button | Applies |
| --- | --- |
| `T1+2` (was DEPT026) | Tax 1, Tax 2 |
| `T1` (was DEPT027) | Tax 1 |
| `NO TAX` | — |

The owner can add, rename, reorder, hide buttons and change rates. Changing a
rate affects new sales only.

Reports show both: sales per **button** (like the DEPT section) and taxable
amount + tax per **tax** (like TA1/TX1, TA2/TX2).

---

## 5. Register flow

```
 [IDLE] ──digit──▶ [ENTERING AMOUNT] ──TAX BUTTON──▶ [LINE ADDED]
   ▲                                                    │   │
   │                              digit (another line)◀─┘   │ SUBTOTAL
   │                                                        ▼
   │                                              [SUBTOTAL SHOWN]
   │                                                  │        │ digits
   │                                      ENTER (exact)│        ▼
   │                                                  │  [ENTERING TENDERED]
   │                                                  ▼        │ ENTER
   └──────────── next keypress ─────────── [COMPLETE: change shown, saved]
```

### Sale example (receipt 000002)
| Key | Display |
| --- | --- |
| `2` `2` `0` `7` `2` | `220.72` |
| `T1+2` | Line 220.72 · TX1 11.04 · TX2 13.24 |
| `SUBTOTAL` | Total due **245.00** |
| `3` `0` `0` `0` `0` | Tendered `300.00` |
| `ENTER` | Change **55.00** · saved · receipt #000002 |

### Refund
1. Press `REFUND` — the screen switches to a clearly marked refund mode (red).
2. Enter amount(s) and tax buttons exactly like a sale.
3. `SUBTOTAL` shows the total to give back, tax included.
4. `ENTER` saves it as a refund transaction; the receipt says **REFUND**.
5. Pressing `REFUND` again before any line is entered cancels refund mode.

Refunds subtract from button totals, tax totals, net, and cash in drawer, and
are listed separately (`RF` count and amount).

### Keys
- **Digits** fill from the right: `1` `2` `5` `0` → `12.50`. Plus a `00` key.
- **CLR** clears the typed amount; with nothing typed, removes the last line.
- **CANCEL SALE** throws away the sale being rung up (nothing saved).
- **ENTER** after subtotal: no tendered amount = exact cash; tendered ≥ total =
  show change; tendered < total = error, nothing saved.
- **Save fails** (no internet etc.): error shown, sale stays on screen, press
  ENTER again.
- **Physical keyboard / numpad:** digits, `Enter`, `Backspace` (CLR), `+`
  (SUBTOTAL), `F1`–`F6` (tax buttons in order), `Esc` (cancel sale).

---

## 6. Screens

```
/                Register
/transactions    Transactions in the open batch, or by date / batch.
                 Open one → reprint, cancel (open batch only).
/reports         X report, Z close, Z history, day / range summary, print.
/settings        Taxes, tax buttons, receipt header/footer,
                 starting counters (GT, Z number, receipt number),
                 business-day cutoff, auto-print on/off.
/login           Firebase Auth sign-in
```

```
┌──────────────────────────────────┬───────────────────────────┐
│  SALE                 #000006    │         DISPLAY  245.00   │
│  220.72  T1+2                    ├───────────────────────────┤
│          TX1 5%   11.04          │   7     8     9    CLR    │
│          TX2 6%   13.24          │   4     5     6    T1+2   │
│                                  │   1     2     3    T1     │
│  Subtotal          220.72        │   0    00   REFUND NO TAX │
│  TX1                11.04        ├───────────────────────────┤
│  TX2                13.24        │   SUBTOTAL   │   ENTER    │
│  TOTAL             245.00        │                            │
├──────────────────────────────────┴───────────────────────────┤
│  Z #3600 open · 3 sales · [X] [Transactions] [Reports] [⚙]    │
└──────────────────────────────────────────────────────────────┘
```
Touch targets ≥ 64px. Tax buttons are generated from settings.

---

## 7. Firestore data model

```
settings/store
  name, address, phone, receiptHeader, receiptFooter
  timezone: "America/Regina"
  businessDayCutoff: "04:00"   // see §8
  nextSeqNumber: 6             // shared by receipts, X and Z (000001…)
  nextZNumber: 3600            // continues from old register
  grandTotal: 1010588128       // GT in cents, never resets
  openBatchId: string | null  // null until the first sale opens a batch
  autoPrint: boolean

taxes/{taxId}
  name: "TX1"  label: "GST"
  rateBps: 500
  order: 1
  active: true

taxButtons/{buttonId}
  label: "T1+2"
  taxIds: ["tax1", "tax2"]
  order: 1
  active: true

batches/{batchId}
  zNumber: 3600
  status: "open" | "closed"
  openedAt, closedAt
  businessDate: "2026-11-06"   // business date the batch was opened
  totals: BatchTotals | null   // snapshot written at Z

transactions/{txnId}
  seq: 6                       // receipt number
  type: "sale" | "refund"
  status: "completed" | "cancelled"
  batchId
  createdAt: Timestamp
  businessDate: "2026-11-06"
  lines: [{
    buttonId, buttonLabel: "T1+2",
    amount: 22072,
    taxes: [
      { taxId: "tax1", name: "TX1", rateBps: 500, amount: 1104 },
      { taxId: "tax2", name: "TX2", rateBps: 600, amount: 1324 }
    ]
  }]
  subtotal: 22072
  taxTotal: 2428
  total: 24500
  tendered: 30000              // refunds: tendered = total, change = 0
  change: 5500
  cancelledAt, cancelReason    // only when cancelled
```
All amounts are stored positive; `type` decides whether they add or subtract.

### `BatchTotals` (also used for X and day/range summaries)
```ts
{
  byButton: { buttonId, label, count, amount }[];      // DEPT section, net of refunds
  gross: number;               // sales before tax, net of refunds  (GROSS / TL)
  byTax: { taxId, name, rateBps, taxable, tax }[];     // TA1/TX1, TA2/TX2
  net: number;                 // incl. tax, minus refunds          (NET)
  cashInDrawer: number;        // = net, cash only                  (CAID)
  saleCount: number;           // customer count                    (CUST CT)
  refundCount: number; refundTotal: number;                       // (RF)
  cancelCount: number; cancelTotal: number;                       // (CANCEL)
  firstSeq: number; lastSeq: number;
  grandTotalBefore?: number; grandTotalAfter?: number;           // Z only (GT)
}
```

### Indexes
- `transactions`: `batchId ASC, seq ASC`
- `transactions`: `businessDate ASC, seq ASC`
- `batches`: `zNumber DESC`

---

## 8. Business day (why the cutoff matters)

If Z is closed after midnight, the sales from, say, 9 PM to 1 AM happen on two
calendar dates. A "summary for Nov 6" by calendar date would then miss the
after-midnight sales and put them on Nov 7, which won't match that night's Z.

Fix: a **business-day cutoff** setting (default 4:00 AM). A sale at 1:15 AM on
Nov 7 is stamped `businessDate: "2026-11-06"`. Day summaries use
`businessDate`, so they line up with the Z you closed that night. The receipt
still prints the real date and time.

---

## 9. Key operations

### Save transaction
One Firestore `runTransaction`:
1. Read the store doc → `nextSeqNumber`, `openBatchId`.
2. If there is no open batch (very first sale), create one with
   `zNumber = nextZNumber` and set `openBatchId`.
3. Write the transaction with that `seq`.
4. Increment `nextSeqNumber`.

### X report
Read transactions of the open batch, compute `BatchTotals`, print with header
`DAILY X`. Uses a sequence number. Changes nothing else.

### Z report
Confirm dialog ("Close Z #3600? This can't be undone."), then one
`runTransaction`:
1. Compute `BatchTotals` for the open batch.
2. `grandTotalAfter = grandTotal + net`; save both on the totals.
3. Close the batch (`status`, `closedAt`, `totals`).
4. Open the next batch, `zNumber + 1`.
5. Update the store: `grandTotal`, `nextZNumber`, `nextSeqNumber`, `openBatchId`.

Then print `DAILY Z`.

### Day / range summary
Query transactions by `businessDate` range, compute `BatchTotals`, list the Z
reports in that range. Printable.

### Cancel
Only for transactions in the open batch. Sets `status: "cancelled"`. Excluded
from totals; counted under CANCEL.

---

## 10. Printing

Receipts and reports are React components in a print-only area, styled for
narrow receipt paper with `@media print`, printed with `window.print()`.
Printer setup is up to the owner.

### Receipt
```
        MY RESTAURANT
--------------------------------
#000002       09-22-2026 20:40
--------------------------------
T1+2                    220.72
--------------------------------
SUBTOTAL                220.72
TX1  5%                  11.04
TX2  6%                  13.24
TOTAL                   245.00
CASH                    300.00
CHANGE                   55.00
--------------------------------
    THANK YOU, CALL AGAIN
```
Refund receipts show `*** REFUND ***` and `CASH OUT` instead of CASH/CHANGE.

### Z report (X is identical, titled DAILY X, no GT)
```
DAILY Z  #3600
#000005       09-22-2026 20:41
--------------------------------
BUTTONS
T1+2               2  3,663.98
T1                 1  3,369.06
TOTAL              3  7,033.04
--------------------------------
GROSS              3  7,033.04
REFUND             0      0.00
CANCEL             0      0.00
NET                3  7,604.53
CASH IN DRAWER        7,604.53
--------------------------------
TAX       TAXABLE          TAX
TX1 5%    7,033.04      351.65
TX2 6%    3,663.98      219.84
--------------------------------
GT      10,113,485.81
RECEIPTS  #000001 - #000004
```
(Example GT: 10,105,881.28 + 7,604.53.)

---

## 11. Auth & security

- Firebase Auth (email + password), same as the website admin. Accounts are
  created in the Firebase console; self sign-up is turned off there.
- Firestore rules: any signed-in user can read/write; nothing can be deleted;
  transactions can only be created and cancelled; closed batches are read-only.
- Firebase config in `.env.local` (`NEXT_PUBLIC_*`, same names as the website
  admin).

---

## 12. Suggested features (later)

1. **Reprint last receipt** — one button on the register.
2. **Opening float** — starting cash, so the Z shows what the drawer should
   hold.
3. **Paid out** — cash taken from the drawer for expenses, subtracted from
   cash in drawer.
4. **Discount key** — % or fixed amount off.
5. **PDF / CSV export** — for the accountant.
6. **Sales charts** — daily / weekly / monthly.
7. **PIN lock** — lock the register screen when stepping away.

---

## 13. Build plan

1. **Foundation** — Firebase setup, auth, store doc + initial counters,
   money/tax utilities with unit tests (using the §2 tape as test data).
2. **Settings** — taxes, tax buttons, counters, receipt text.
3. **Register** — keypad state machine, sale + refund, save.
4. **Printing** — receipt component.
5. **Reports** — X, Z with GT, Z history, day/range summary.
6. **Transactions** — browse, reprint, cancel.
7. **Hardening** — security rules, keyboard shortcuts.

### Code layout (same structure as the website admin)
```
app/login/page.tsx
app/(main)/layout.tsx                    auth redirect + Navbar
app/(main)/(standard)/page.tsx           register
app/(main)/(standard)/settings/page.tsx
app/(main)/(standard)/transactions/page.tsx
app/(main)/(standard)/reports/page.tsx
contexts/AuthContext.tsx                 sign-in; starts/stops all store listeners
stores/                                  one Zustand store per collection
  allStores.ts                           register every store here
  storeSettingsStore.ts  taxesStore.ts  taxButtonsStore.ts  modalStore.ts
components/ui/                           Button, form, Modal (from website admin)
components/register/                     Keypad, Display, SaleLines
components/settings/                     StoreSettingsForm, tax editors
components/print/                        Receipt, BatchReport
lib/firebase.ts
lib/money.ts                             cents parsing / formatting
lib/business-date.ts                     business day with cutoff
lib/tax.ts                               per-line tax, half-up rounding
lib/register-machine.ts                  pure keypad state machine
lib/reports.ts                           computeBatchTotals(transactions)
types/global.d.ts                        StoreSettings, Tax, TaxButton, ...
firestore.rules
```

---

## 14. Open questions

1. **GT** — I assumed GT adds each Z's NET (tax included, refunds subtracted).
   Your tape alone can't confirm it. If you have two Z tapes from consecutive
   days, the GT difference between them will tell us.
2. **Starting counters** — Z #3600 and GT 10,105,881.28 + later Zs: enter your
   last real Z when switching over.
3. **Tax names** — are TX1/TX2 GST 5% / PST 6%? Labels are editable anyway.
