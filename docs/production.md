# Production launch

The live site is https://web-sabziwalaa5.vercel.app/

## Staff portals (work without Supabase)

Until a live `NEXT_PUBLIC_SUPABASE_URL` is set, use the staff PIN.

| Portal | URL | Email | PIN |
|---|---|---|---|
| Admin | /admin | sabziwalaa5@gmail.com | `Sabjiwala5!` |
| Vendor | /vendor | raman@gmail.com | `Sabjiwala5!` |
| Rider | /rider | rider@gmail.com | `Sabjiwala5!` |

Change the PIN on Vercel with **Config** variable `STAFF_BOOTSTRAP_PASSWORD`. Do not use type Secret with a `NEXT_PUBLIC_` name.

Catalog, orders, and settings stay in the browser (`localStorage`) until Supabase tables are live. Open admin/vendor/rider on the **same phone/browser** as the shop so they share data.

## Customer shop

https://web-sabziwalaa5.vercel.app/

## Android

https://web-sabziwalaa5.vercel.app/download

## Supabase (optional, for Google/email customer login)

1. Create a project at https://supabase.com/dashboard
2. Copy Project URL + anon/publishable key
3. Vercel → Environment Variables → **Config** (not Secret):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy
5. Run `docs/supabase_setup.sql` in the SQL editor
