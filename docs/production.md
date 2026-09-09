# Production launch

Sabjiwala is a **Next.js + PostgreSQL** multi-user application. All business data (products, carts, orders, addresses, wallets, coupons, settings) is stored in PostgreSQL via Prisma. The browser is not the source of truth.

Live reference URL: https://web-sabziwalaa5.vercel.app/

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) |
| API | Next.js route handlers under `/api/*` |
| Database | PostgreSQL + Prisma (`web/prisma/`) |
| Customer auth | Supabase (optional, recommended) |
| Staff auth | Signed HTTP-only cookies |
| Payments | Razorpay + server-calculated order totals |

The optional Express `backend/` service is **not** used by the storefront.

## Database setup

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Run migrations (safe for production — additive only):

```bash
cd web
npx prisma migrate deploy
```

3. Initialize platform settings (production-safe):

```bash
cd web
npm run db:seed
```

By default, `db:seed` only ensures `PlatformSettings` exists in production.

### Demo / development seed

To load sample vendors, products, coupons, and demo orders:

```bash
SEED_DEMO_DATA=1 npm run db:seed
```

**Never set `SEED_DEMO_DATA=1` in production** unless you intentionally want demo catalog data. The seed uses `upsert` and does not wipe existing rows.

API requests in development auto-seed demo catalog when the database is empty. In production, demo data is **not** auto-loaded unless `SEED_DEMO_DATA=1`.

## Staff portals

| Portal | URL |
|--------|-----|
| Admin | `/admin` |
| Vendor | `/vendor` |
| Rider | `/rider` |

Staff sign in with email + bootstrap password (server env). Supabase is optional for staff Google login.

## Customer shop

Customers browse `/`, authenticate via Supabase, and all cart/order/address data is stored server-side.

## Required server environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `STAFF_BOOTSTRAP_PASSWORD` | Staff portal password |
| `STAFF_SESSION_SECRET` | Staff session cookie signing |
| `PAYMENT_HMAC_SECRET` | Checkout token HMAC (or use `RAZORPAY_KEY_SECRET`) |
| `RAZORPAY_KEY_ID` | Online payments (optional for COD-only) |
| `RAZORPAY_KEY_SECRET` | Online payments |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification |

## Public environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |

## Optional

| Variable | Purpose |
|----------|---------|
| `STAFF_ADMIN_EMAILS` | Comma-separated admin emails |
| `STAFF_VENDOR_EMAILS` | Comma-separated vendor emails |
| `STAFF_RIDER_EMAILS` | Comma-separated rider emails |
| `SEED_DEMO_DATA` | Set to `1` to load demo catalog via seed |

## Validation commands

```bash
cd web && npm ci && npm run type-check && npm test && npm run build
npx prisma validate
npx prisma migrate deploy   # against target DATABASE_URL
```

## Health check

`GET /api/health` — application health endpoint.

## Backups

Back up PostgreSQL regularly. Orders, payments, wallets, and addresses are only recoverable from the database.

## Payments

- Order totals are calculated server-side before Razorpay order creation.
- Payment verification compares token amount to database order total.
- Webhooks update payment status idempotently via `PaymentCapture`.

## Security

- Never commit `.env` or real secrets.
- Staff passwords and payment secrets are server-only.
- Customer data is isolated by Supabase user ID + email on every API call.

See `docs/production-checklist.md` for the full pre-deploy checklist.
