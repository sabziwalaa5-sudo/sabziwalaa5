# SABJIWALAA ५

Hyperlocal organic grocery marketplace: **customer storefront, admin, vendor, and rider** on one live site, plus Android/iOS apps that open those portals.

## Live

| Surface | URL |
|---|---|
| Storefront | https://web-sabziwalaa5.vercel.app/ |
| Mobile app home | https://web-sabziwalaa5.vercel.app/app |
| Admin | https://web-sabziwalaa5.vercel.app/admin |
| Vendor | https://web-sabziwalaa5.vercel.app/vendor |
| Rider | https://web-sabziwalaa5.vercel.app/rider |

## Web

```bash
cd web
npm ci
npm test
npm run type-check
npm run build
npm run dev
```

Copy `web/.env.example` to `web/.env.local` and set Supabase / Razorpay secrets for production auth and payments.

## Mobile (Capacitor — ship this)

App ID: `com.sabjiwala.app`. The native shell launches the live `/app` home (Customer / Admin / Vendor / Rider).

```bash
cd web
npm ci
npx cap sync
npx cap open android   # or: npx cap open ios
```

Debug APK (Android SDK required):

```bash
cd web/android
./gradlew assembleDebug
```

GitHub Actions (`Android APK`) uploads `app-debug.apk` on PRs to `main`.

## Backend (optional API)

```bash
cd backend
npm ci
npx prisma validate
npm run build
```

## Docs

- `docs/architecture.md` — system design
- `docs/mobile_native.md` — Android / iOS
- `docs/api_docs.md` — API
