# Production launch

The live site is https://web-sabziwalaa5.vercel.app/

## Staff portals (work without Supabase)

Until a live `NEXT_PUBLIC_SUPABASE_URL` is set, staff can sign in with the server-side PIN.

| Portal | URL | Default dev email (override with env) |
|---|---|---|
| Admin | /admin | sabziwalaa5@gmail.com |
| Vendor | /vendor | raman@gmail.com |
| Rider | /rider | rider@gmail.com |

Set these **server** environment variables in production:

- `STAFF_BOOTSTRAP_PASSWORD` — staff PIN (required in production)
- `STAFF_SESSION_SECRET` — signs staff cookies (required in production)
- `STAFF_ADMIN_EMAILS` — comma-separated admin emails
- `STAFF_VENDOR_EMAILS` — comma-separated vendor emails
- `STAFF_RIDER_EMAILS` — comma-separated rider emails

Catalog, orders, and settings stay in the browser (`localStorage`) until Supabase tables are live. Open admin/vendor/rider on the **same phone/browser** as the shop so they share data.

## Customer shop

https://web-sabziwalaa5.vercel.app/

## Android

https://web-sabziwalaa5.vercel.app/download

## Supabase (optional, for Google/email customer login)

1. Create a project at https://supabase.com/dashboard
2. Copy Project URL + publishable key (`sb_publishable_...`)
3. Vercel → Environment Variables → **Config** (not Secret):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` still works)
4. Redeploy
5. Auth → URL Configuration: Site URL `https://web-sabziwalaa5.vercel.app` and redirect `https://web-sabziwalaa5.vercel.app/**`

## Payments (Razorpay)

Set server secrets:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET` (for webhooks)
- `PAYMENT_HMAC_SECRET` (checkout token signing; can reuse Razorpay secret)

## Production checklist

See `docs/production-checklist.md` for required environment variables and validation steps.
