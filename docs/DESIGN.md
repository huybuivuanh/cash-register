# Cash Register — Design

A web-based cash register for a restaurant. It replaces the physical register's
day-to-day functions: ring up sales, apply tax, take cash, give change, refund,
print receipts, and run X / Z reports.

Stack: Next.js (App Router) + Tailwind, Firebase Auth, Cloud Firestore.
One register device. Customers pay cash or card; the register doesn't record
which (cash tendered is only used to work out change).

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
Z counter 3599. Receipts, X and Z share one running number (000001 … 000005),
which restarts at 000001 after each Z.

Per-line tax rounding (half up) reproduces every number above exactly.

---

## 3. Core rules

1. **Money is integer cents.** `$12.50` → `1250`. No floats in calculations.
2. **Tax rates are basis points.** `5%` → `500`. Tax per line per tax =
   `round_half_up(amount × rateBps / 10000)`.
3. **History never changes when settings change.** Each line copies the button
   name and each tax's name + rate it used.
4. **Nothing is deleted or edited.** A saved sale can't be voided; mistakes are
   fixed with a refund, which is its own transaction.
5. **Every transaction belongs to a batch.** Exactly one batch is open. Z
   closes it and opens the next.
6. **Counters are never edited by hand.** A new business starts at Z #1,
   GT 0.00 and receipt #000001. The GT only grows (each Z adds its NET), the Z
   number goes up one per Z, and the receipt number restarts at 1 after each Z.

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

Reports show taxable amount + tax per **tax** (like TA1/TX1, TA2/TX2). The
old tape's per-button DEPT section is left out: it mostly repeated the tax
section and was confusing.

---

## 5. Register flow

```
 [IDLE] ──digit──▶ [ENTERING AMOUNT] ──TAX BUTTON──▶ [LINE ADDED]
   ▲                                                    │   │
   │                              digit (another line)◀─┘   │ SUBTOTAL
   │                       (ENTER here saves, exact amount) │
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
- **CLR** removes the last digit typed (`12.50` → `1.25`); with nothing typed,
  removes the last line.
- **CANCEL SALE** throws away the sale being rung up (nothing saved).
- **ENTER** right after a tax button saves the sale with the exact amount paid
  (no SUBTOTAL needed). After SUBTOTAL: no tendered amount = exact; tendered ≥
  total = show change; tendered < total = error, nothing saved. ENTER with an
  amount typed but no tax button pressed is refused.
- **Save fails** (no internet etc.): error shown, sale stays on screen, press
  ENTER again.
- **Physical keyboard / numpad:** digits, `Enter`, `Backspace` (CLR), `Shift`
  (SUBTOTAL), `Esc` (cancel sale). Each tax button can have its own key, set
  in Settings → Taxes (any key except digits and the keys above, Ctrl/Alt/Tab,
  F5/F11/F12; one key per button), e.g. Numpad `/` for T1+2.

---

## 6. Screens

```
/                Register
/journal         Journal for a date range: every sale, refund and Z close in
                 order, with the range's totals on top. Loads at most 1000.
                 (Later: open one → reprint.)
/summary         Open batch live (X), Close Z, print.
/reports         Z history, day / range summary (later).
/settings        Store tab: store info, receipt header/footer, auto-print
                 on/off. Counters (Z number, GT, receipt number) are shown
                 but can't be edited: only sales and Z closes change them.
/settings/taxes  Taxes tab: add / edit / reorder / turn off / delete taxes
                 and tax buttons. A tax can't be deleted while a button
                 still charges it.
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

Several separate businesses share one Firebase project. Each staff login
belongs to exactly one business, and every collection below lives under that
business: its settings are fields on `businesses/{businessId}` itself, and
`businesses/{businessId}/taxes/...` and so on hold the rest (`lib/business.ts` builds the
paths).

```
members/{uid}                  // one per login
  businessId: "<founder's uid>"
  role: "admin" | "staff"      // sign-up makes you admin of your own business

businesses/{businessId}        // the business's settings live on this doc
  name, address, phone, receiptHeader, receiptFooter
  timezone: "America/Regina"
  nextSeqNumber: 6             // receipts + Z in the open batch; back to 1 after Z
  nextZNumber: 3600            // Z number of the open batch; +1 at each Z
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
  totals: ZTotals | null       // snapshot written at Z

transactions/{txnId}
  seq: 6                       // receipt number, restarts at 1 each Z
  type: "sale" | "refund"
  batchId
  createdAt: Timestamp
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
```
All amounts are stored positive; `type` decides whether they add or subtract.

### `BatchTotals` (also used for X and day/range summaries)
```ts
{
  gross: number;               // sales before tax, net of refunds  (GROSS / TL)
  byTax: { taxId, name, rateBps, taxable, tax }[];     // TA1/TX1, TA2/TX2
  net: number;                 // incl. tax, minus refunds          (NET)
  saleCount: number;           // customer count                    (CUST CT)
  refundCount: number; refundTotal: number;                       // (RF)
}
```
A closed Z saves `ZTotals` = `BatchTotals` plus `zSeq` (the Z's own receipt
number) and `grandTotalAfter` (GT right after this Z). The running GT is
the business document's `grandTotal`.

### Indexes
- `transactions`: `batchId ASC, seq ASC`
- `batches`: `zNumber DESC`
- `batches`: `closedAt ASC`

---

## 8. Dates

Each sale stores its real date and time (`createdAt`). Each batch stores when
it opened and when its Z was closed (`closedAt`). A batch belongs to the day its
Z was closed, so a Z closed at 1 AM on Nov 7 is dated Nov 7, like the old
register. Day / range summaries pick batches by `closedAt`.

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
1. Compute `BatchTotals` for the open batch (`lib/reports.ts`).
2. Refuse if a sale was saved since the totals were worked out
   (`nextSeqNumber` changed).
3. Save `grandTotalAfter = grandTotal + net` and the Z's own receipt number
   (`zSeq`) on the totals.
4. Close the batch (`status`, `closedAt`, `totals`).
5. Update the store: `grandTotal`, `nextZNumber + 1`, `nextSeqNumber: 1`,
   `openBatchId: null`. The next sale opens the next batch.

Page: `/summary` shows the open batch live (like DAILY X) with Print and
Close Z. A batch with no sales can't be closed.

Then print `DAILY Z`.

### Day / range summary
Pick the closed batches whose `closedAt` falls in the range, add up their saved
`totals`, and list those Z reports. Printable.

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
      MY RESTAURANT
    DAILY Z · Z #3600
#000005       09-22-2026 20:41
--------------------------------
GROSS (before tax) 3  7,033.04
REFUNDS            0      0.00
--------------------------------
TAX       TAXABLE          TAX
TX1 5%    7,033.04      351.65
TX2 6%    3,663.98      219.84
TAX TOTAL                571.49
--------------------------------
NET (with tax)        7,604.53
--------------------------------
GT                10,113,485.81
RECEIPTS  #000001 – #000004
```
No cash-in-drawer line: customers also pay by card, and the register doesn't
record how each sale was paid.
(Example GT: 10,105,881.28 + 7,604.53.)

---

## 11. Auth & security

- Firebase Auth (email + password). Anyone can create an account on the login
  page (sign-up must be enabled in the Firebase console).
- **New account → `/setup`:** enter store info (name, address, phone required;
  receipt header/footer optional). Saving creates `members/{uid}` with
  `businessId = uid`, `role: "admin"`, and the business document, then
  opens the register. Taxes are added in Settings → Taxes (no defaults).
- After sign-in the app reads `members/{uid}`: no member doc, or an admin whose
  store info isn't saved yet → `/setup`; a staff member of a business that
  isn't set up yet is signed out with a message.
- **Roles:** admins can do everything. Staff are strictly read only: they can
  sign in and see every page an admin sees, but every control that changes
  something is greyed out (register keypad, Close Z, Save, Add / Edit / move /
  on-off), with a "View only" note. The rules refuse every staff write.
- Staff accounts (`role: "staff"`) will be added by an admin via the Admin SDK
  (server side); not built yet.
- Firestore rules: members can only read under their own business (checked
  against `members/{uid}`), and only admins can write; only taxes and tax buttons can be deleted; transactions can only be
  created; closed batches are read-only. Staff can read only their own member
  doc; the only write allowed is sign-up creating it as admin of a business
  whose id is their own uid.
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
6. **Journal** — browse by date, reprint.
7. **Hardening** — security rules, keyboard shortcuts.

### Code layout (same structure as the website admin)
```
app/login/page.tsx
app/(main)/layout.tsx                    auth redirect + Navbar
app/(main)/(standard)/page.tsx           register
app/(main)/(standard)/settings/page.tsx
app/(main)/(standard)/journal/page.tsx
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
