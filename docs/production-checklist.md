# Production checklist

Use this before deploying Sabjiwala to any hosting environment.

## Required server environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `STAFF_BOOTSTRAP_PASSWORD` | Staff portal password |
| `STAFF_SESSION_SECRET` | HMAC secret for staff session cookies |
| `PAYMENT_HMAC_SECRET` | Checkout token signing (or set `RAZORPAY_KEY_SECRET`) |

## Payments (if online payments enabled)

| Variable | Purpose |
|----------|---------|
| `RAZORPAY_KEY_ID` | Razorpay public key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC verification |

## Public (client) environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (customer auth) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

## Optional staff email overrides

| Variable | Purpose |
|----------|---------|
| `STAFF_ADMIN_EMAILS` | Comma-separated admin emails |
| `STAFF_VENDOR_EMAILS` | Comma-separated vendor emails |
| `STAFF_RIDER_EMAILS` | Comma-separated rider/delivery emails |

## Optional seed control

| Variable | Purpose |
|----------|---------|
| `SEED_DEMO_DATA` | Set to `1` to load demo catalog via `npm run db:seed` |

## Pre-deploy steps

1. Provision PostgreSQL.
2. Set all required environment variables on the host.
3. Run database migrations:

```bash
cd web && npx prisma migrate deploy
```

4. Initialize platform settings:

```bash
cd web && npm run db:seed
```

5. Validate build:

```bash
cd web && npm ci && npm run type-check && npm test && npm run build
```

6. Start production server:

```bash
cd web && npm run start
```

## Validation commands

```bash
cd web && npm ci && npm run type-check && npm test && npm run build
cd web && npx prisma validate
```

## Architecture notes

- **PostgreSQL** is the single source of truth for products, carts, orders, addresses, wallets, coupons, and settings.
- **Supabase** provides customer authentication (Bearer JWT on API calls).
- **Staff portals** use signed HTTP-only cookies; roles enforced server-side.
- **Payments** use server-calculated order totals; client amounts are not trusted.
- Browser `localStorage` is limited to non-authoritative UI preferences (e.g. mobile launcher role).

## Security

- Never commit `.env` or real secrets.
- Do not expose staff passwords or payment secrets in UI or docs.
- Use strong unique values for `STAFF_BOOTSTRAP_PASSWORD` and `STAFF_SESSION_SECRET`.
- Configure `RAZORPAY_WEBHOOK_SECRET` for production payment callbacks.

## Health check

Verify `GET /api/health` returns success after deploy.

## What is NOT in this checklist

DNS, SSL, cPanel, VPS, and domain configuration are handled in a separate deployment phase.
