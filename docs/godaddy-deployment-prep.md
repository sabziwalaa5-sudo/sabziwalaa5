# GoDaddy Node.js Hosting — Deployment Preparation

This document describes how to deploy the Sabjiwala **Next.js** application on [GoDaddy Node.js Hosting](https://www.godaddy.com/help/godaddy-nodejs-hosting-faq-42915). It covers repository layout, build/start commands, environment variables, database workflow, and platform constraints.

**This is preparation documentation only.** It does not deploy the app, configure DNS/SSL, or set live payment/auth credentials.

---

## Application root

Deploy from:

```text
web/
```

The monorepo root (`/`) is **not** the application root. All Node.js commands below run from `web/`.

| Artifact | Location |
|----------|----------|
| `package.json` | `web/package.json` |
| Next.js config | `web/next.config.ts` |
| Prisma schema | `web/prisma/schema.prisma` |
| Migrations | `web/prisma/migrations/` |
| Production start | `web/scripts/start-production.mjs` |
| GoDaddy `main` stub | `web/server.cjs` |

---

## Node version

| Setting | Value |
|---------|-------|
| GoDaddy platform | Node.js **22** |
| `engines.node` in `web/package.json` | `>=20 <=22` |
| Recommended | **22.x** (matches platform) |

---

## Build command

From `web/`:

```bash
npm ci
npm run build
```

`npm run build` runs `prisma generate && next build`. Prisma client generation also runs on `postinstall`.

Validate the GoDaddy contract locally:

```bash
npm run validate:godaddy
```

---

## Start command

From `web/`:

```bash
npm run start
```

This executes `node scripts/start-production.mjs`, which starts Next.js with:

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Listen port (set by GoDaddy) | `3000` |
| `HOST` or `HOSTNAME` | Bind address | `0.0.0.0` |

Do **not** hardcode port `3001` or bind only to `localhost`.

---

## Database

### Engine

- **PostgreSQL** via Prisma (`DATABASE_URL`)
- Schema source of truth: `web/prisma/schema.prisma`
- Migrations: `web/prisma/migrations/`

### Migration (production-safe)

Run **before or after** first deploy when `DATABASE_URL` points at the production database:

```bash
cd web
npx prisma migrate deploy
```

Do **not** use `prisma db push`, `prisma migrate reset`, or `prisma db seed` with demo data in production unless intentional.

### Prisma client

- Generated during `postinstall` and `npm run build`
- `binaryTargets` includes `debian-openssl-3.0.x` for Linux hosting runtimes

### GoDaddy platform constraint (critical)

GoDaddy Node.js Hosting outbound network is limited to **HTTP (80), HTTPS (443), and GoDaddy managed MySQL**. External PostgreSQL on port **5432** is typically **not reachable** from the platform container.

**Before deploying**, confirm one of:

1. GoDaddy support confirms external PostgreSQL over HTTPS/TCP tunnel is allowed, or
2. You host PostgreSQL behind an HTTPS-accessible proxy (unusual), or
3. You use a different hosting product (e.g. VPS) that allows PostgreSQL, or
4. You migrate the schema to GoDaddy managed MySQL (major architecture change — not done in this repo)

Until PostgreSQL connectivity is confirmed, treat database access as a **deployment blocker** on GoDaddy PaaS.

---

## Seed (production-safe)

Production seed creates **platform settings only** — no demo catalog, orders, or customers.

```bash
cd web
NODE_ENV=production npm run db:seed
```

| Command | Behavior |
|---------|----------|
| `NODE_ENV=production npm run db:seed` | Safe — settings row only |
| `SEED_DEMO_DATA=1 npm run db:seed` | Loads demo catalog (explicit opt-in) |
| `NODE_ENV=development npm run db:seed` | Demo catalog enabled by default |

Seed is **idempotent** for platform settings (`upsert`). Demo catalog seed skips when products already exist.

---

## Environment variables

Set these in the GoDaddy encrypted environment UI. **Never commit real values.**

### Public (`NEXT_PUBLIC_*`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical storefront URL (redirects, metadata) |
| `NEXT_PUBLIC_SUPABASE_URL` | For customer login | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For customer login | Supabase anon/publishable key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional alias | Legacy name for publishable key |
| `NEXT_PUBLIC_ADMIN_URL` | Optional | Admin portal base URL |

### Server-only

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `STAFF_BOOTSTRAP_PASSWORD` | Yes (prod) | Staff portal bootstrap password |
| `STAFF_SESSION_SECRET` | Yes (prod) | Staff session signing secret |
| `PAYMENT_HMAC_SECRET` | Yes (prod) | Payment signature HMAC |
| `RAZORPAY_KEY_ID` | For live payments | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | For live payments | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | For webhooks | Razorpay webhook HMAC secret |
| `STAFF_ADMIN_EMAILS` | Recommended | Comma-separated admin emails |
| `STAFF_VENDOR_EMAILS` | Recommended | Comma-separated vendor emails |
| `STAFF_RIDER_EMAILS` | Recommended | Comma-separated rider emails |
| `PORT` | Set by platform | HTTP listen port |
| `HOST` / `HOSTNAME` | Optional | Bind address (default `0.0.0.0`) |
| `NODE_ENV` | Recommended | Set to `production` |
| `SEED_DEMO_DATA` | Optional | `1` to load demo data during seed |
| `INTEGRATION_TEST_SECRET` | **Do not set in prod** | Test-only auth bypass |

Validate required production vars:

```bash
STRICT_PRODUCTION=1 npm run check:production-env
```

Reference template: `web/.env.example`

---

## Webhook

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments/webhook` | `POST` | Razorpay payment events |

Requirements:

- Public HTTPS URL: `https://<your-domain>/api/payments/webhook`
- Raw body used for `x-razorpay-signature` verification
- `RAZORPAY_WEBHOOK_SECRET` must be server-only
- Idempotent via `PaymentCapture` unique constraint
- No filesystem dependencies

Configure the webhook URL in the Razorpay dashboard **after** the app is live.

---

## Supabase (customer authentication)

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in GoDaddy env.
2. In the Supabase dashboard, add production redirect URLs:
   - `https://<your-domain>/login`
   - Any OAuth callback paths your Supabase project uses
3. Set `NEXT_PUBLIC_APP_URL` to the production HTTPS origin (not `localhost`).
4. Staff auth uses signed HTTP-only cookies (`secure: true` in production) — works behind GoDaddy HTTPS.

Do not put Supabase service-role keys in `NEXT_PUBLIC_*` variables.

---

## Razorpay

| Variable | Exposure |
|----------|----------|
| `RAZORPAY_KEY_ID` | Server routes; key ID may be returned to client for checkout |
| `RAZORPAY_KEY_SECRET` | Server-only |
| `RAZORPAY_WEBHOOK_SECRET` | Server-only |
| `PAYMENT_HMAC_SECRET` | Server-only |

Payment amounts are computed server-side from the database, not trusted from the client.

---

## Health check

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/health` | `GET` | None |

Response (no secrets):

```json
{
  "status": "ok",
  "service": "sabjiwala-web",
  "database": "ok"
}
```

| `database` value | Meaning |
|------------------|---------|
| `ok` | `DATABASE_URL` set and `SELECT 1` succeeded |
| `unconfigured` | `DATABASE_URL` not set |
| `unavailable` | Configured but connection failed → HTTP **503** |

---

## Security notes

- Security headers configured in `next.config.ts` and `middleware.ts`
- API routes use `Cache-Control: no-store`
- Rate limiting on payment webhook and other sensitive routes
- No database credentials, session secrets, or webhook secrets in `NEXT_PUBLIC_*`
- `.env` / `.env.local` are gitignored — configure secrets only in hosting UI

---

## Deployment upload checklist

Exclude from zip/Git upload:

- `node_modules/`
- `.env`, `.env.local`
- `.next/` (rebuilt on platform)
- Local test artifacts, IDE files, OS files

Include:

- `package-lock.json`
- `.npmrc` (public npm registry)
- Full `prisma/migrations/` directory
- Source and `server.cjs`

---

## Recommended deployment sequence

1. Provision PostgreSQL (or confirm GoDaddy connectivity — see blocker above)
2. Set all server-only and public env vars in GoDaddy
3. Upload/deploy `web/` as application root
4. `npm ci && npm run build` (platform may run automatically)
5. `npx prisma migrate deploy` (one-time / per release)
6. `NODE_ENV=production npm run db:seed` (one-time)
7. `npm run start` (platform default)
8. Verify `GET /api/health` and `GET /api/products`
9. Configure Razorpay webhook URL and Supabase redirect URLs

---

## Local rehearsal (no production secrets)

```bash
cd web
npm ci
npx prisma generate
npx prisma validate
npm run type-check
npm test
npm run build
PORT=3999 npm run start
# curl http://127.0.0.1:3999/api/health
# curl http://127.0.0.1:3999/api/products
```

Use a local or test `DATABASE_URL` for database-backed endpoint checks.
