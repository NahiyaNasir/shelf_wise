# ShelfWise client

The website for ShelfWise (Next.js). It talks to the Express backend in `../server`.

## Run it

1. Start the backend first (`npm run dev` in `server/`). It runs on port 3000.
2. In this folder:
   ```bash
   npm install
   cp .env.local.example .env.local   # then edit API_URL if your backend isn't on port 3000
   npm run dev
   ```
3. Open http://localhost:3001 and sign in with the admin you created with the seed script.

The site runs on port **3001** so it doesn't clash with the backend on 3000.

## One change needed in the backend

In `server/app/lib/auth.ts`, tell Better Auth to trust this site's address, inside `betterAuth({ ... })`:

```ts
trustedOrigins: [process.env.CLIENT_URL ?? "http://localhost:3001"],
```

Without it, signing in works but signing out (and any request that carries the login cookie) fails with "Invalid origin".

## How login works

- The browser only talks to this site. `next.config.ts` forwards anything under `/backend/...` to the Express server, so there is no CORS setup and the login cookie is a normal first-party cookie.
- `app/login` is the sign-in form. It posts to Better Auth's `/api/auth/sign-in/email`.
- `proxy.ts` sends visitors with no session cookie away from `/dashboard`. It's only a quick early check.
- `lib/session.ts` asks the backend who is signed in. `requireUser()` is the real check, and pages that need a login call it.
- There is no sign-up page on purpose. The admin creates accounts.

## Where things are

| Path | What it is |
|---|---|
| `app/login/` | Sign-in page and form |
| `app/dashboard/` | Home page after login (placeholder for now) |
| `lib/session.ts` | `getSession()` and `requireUser()` |
| `proxy.ts` | Early redirect for visitors without a cookie |
| `next.config.ts` | The `/backend` forwarding rule |
