# Cash Register

Web cash register for the restaurant. It replaces the old register's day-to-day
work: ring up sales with tax buttons, take cash and show change, refunds, receipts,
and X / Z reports with a grand total. Full design and data model:
[docs/DESIGN.md](docs/DESIGN.md).

Next.js (App Router) + Tailwind, Firebase Auth, Cloud Firestore, Zustand.

## Features

| Page | What it does |
|---|---|
| `/` Register | Keypad (touch or physical keyboard/numpad), tax buttons, SUBTOTAL, ENTER, REFUND mode, change due. A **?** button opens the key help |
| `/summary` | The open batch live (X report), **Close Z**, and print |
| `/journal` | Every sale, refund and Z close for a date range, with the range's totals; each entry can be printed |
| `/settings` | Store info, receipt header/footer, auto-print. Counters (Z number, GT, receipt number) are shown but can't be edited |
| `/settings/taxes` | Add / edit / reorder / turn off / delete taxes and tax buttons (a tax can't be deleted while a button still charges it), and set a keyboard key for each tax button |
| `/login`, `/setup` | Sign in or sign up; a new account sets up its business on `/setup` |

Rules worth knowing (details in DESIGN.md §3):

- Money is integer cents, tax rates are basis points, tax is rounded half up per line.
- Nothing is edited or deleted. A mistake is fixed with a refund.
- A new business starts at Z #1, GT 0.00 and receipt #000001. Only sales and Z closes change the counters.
- Printing uses the browser (`window.print()`) with receipt-width print styles.

## Accounts and businesses

Several businesses can share one Firebase project. Anyone can sign up on the login
page; a new account goes to `/setup`, enters its store info, and becomes the
**admin** of its own business (`members/{uid}`, business id = their uid).

- **Admin:** can do everything.
- **Staff:** read only. They see every page, but every control that changes
  something is greyed out with a "View only" note, and the rules refuse their writes.
  Staff accounts are created server side (not built yet).

## Setup

1. Create a Firebase project with **Authentication (Email/Password)** and **Firestore**
   enabled. Leave sign-up enabled (Authentication → Settings → User actions), since new
   businesses sign up from the login page.
2. Copy `.env.example` to `.env.local` and fill in the web app config.
3. Deploy the security rules: `npx firebase-tools deploy --only firestore:rules`.
   The indexes the app needs are listed in DESIGN.md §7.
4. Run it:

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, fill in the store info on `/setup`, then add your
taxes and tax buttons in **Settings → Taxes** (there are no defaults).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for the money, tax and register logic (`lib/**/*.test.ts`, Node test runner) |
