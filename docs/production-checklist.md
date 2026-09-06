# Production checklist

Use this before deploying Sabziwala to any hosting environment.

## Required server environment variables (production)

| Variable | Purpose |
|---|---|
| `STAFF_BOOTSTRAP_PASSWORD` | Staff portal PIN |
| `STAFF_SESSION_SECRET` | HMAC secret for staff session cookies |
| `PAYMENT_HMAC_SECRET` | Checkout token signing (or set `RAZORPAY_KEY_SECRET`) |
| `RAZORPAY_KEY_ID` | Online payments (optional if COD-only) |
| `RAZORPAY_KEY_SECRET` | Online payments |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification |

## Public (client) environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (optional) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (optional) |

## Optional staff email overrides

| Variable | Purpose |
|---|---|
| `STAFF_ADMIN_EMAILS` | Comma-separated admin emails |
| `STAFF_VENDOR_EMAILS` | Comma-separated vendor emails |
| `STAFF_RIDER_EMAILS` | Comma-separated rider/delivery emails |

## Backend (optional API service)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `HOST` | Bind address (default 0.0.0.0) |
| `WEB_ORIGIN` | Allowed CORS origin(s), comma-separated |
| `DATABASE_URL` | Postgres URL when Prisma is wired up |

## Validation commands

```bash
cd web && npm ci && npm run type-check && npm test && npm run build
cd backend && npm ci && npx prisma validate && npm run build
```

## Architecture notes

- **Customer catalog and orders** currently persist in browser `localStorage` for the MVP.
- **Supabase** provides optional customer auth and a best-effort order audit trail.
- **Express backend** is optional; the web app uses Next.js API routes for payments.
- Wire Prisma/Postgres and migrate off `localStorage` before multi-user production scale.

## Security

- Never commit `.env` or real secrets.
- Do not expose staff PINs or payment secrets in the UI or documentation.
- Set strong, unique values for `STAFF_BOOTSTRAP_PASSWORD` and `STAFF_SESSION_SECRET` in production.
