# Cash Register

Web cash register for the restaurant. Design: [docs/DESIGN.md](docs/DESIGN.md).

## Setup

1. Create a Firebase project with **Authentication (Email/Password)** and **Firestore** enabled.
2. Copy `.env.example` to `.env.local` and fill in the web app config.
3. Create your login: Firebase console → Authentication → Users → Add user.
   Then turn off self sign-up: Authentication → Settings → User actions →
   untick "Enable create (sign-up)", so nobody else can make an account.
4. Deploy the security rules: `npx firebase-tools deploy --only firestore:rules`
5. Run it:

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign in, go to **Settings** and enter the store info
and the counters (next Z number, GT) from the old register's last Z tape.
