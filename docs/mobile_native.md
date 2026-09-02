# Native Android + iOS (Capacitor)

The production website stays on Vercel. Native apps wrap that site in Capacitor (`com.sabjiwala.app`) and load `https://web-sabziwalaa5.vercel.app` by default.

The **admin web version** is the same deployment at `/admin` (`https://web-sabziwalaa5.vercel.app/admin`). Catalog, orders, coupons, vendor status, maintenance mode, minimum order, free-delivery threshold, and reward rates set in Admin apply to the customer storefront and the native WebView. Staff emails (`sabziwalaa5@gmail.com`) get an in-app link to the Admin dashboard; vendor and rider portals live at `/vendor` and `/rider`.

Override the admin URL with `NEXT_PUBLIC_ADMIN_URL` if you ever host admin separately.

## Prerequisites

- Node.js 20+
- Android Studio + JDK 17 for Android builds
- Xcode 16+ on macOS for iOS builds
- Apple Developer and Google Play accounts for store release

## Web (Vercel remains unchanged)

```bash
cd web
npm ci
npm run type-check
npm test
npm run build
npm run start
```

## Native sync

```bash
cd web
npm ci
npx cap sync
```

Point the WebView at a local Next server (LAN IP, not localhost, for physical devices):

```bash
CAPACITOR_SERVER_URL=http://192.168.1.10:3000 npx cap sync
```

## Android

```bash
cd web
npx cap open android
# Android Studio: Build > Build Bundle(s) / APK(s)
```

CLI APK/AAB (requires Android SDK):

```bash
cd web/android
./gradlew assembleDebug
./gradlew assembleRelease
./gradlew bundleRelease
```

Outputs:

- APK: `web/android/app/build/outputs/apk/`
- AAB: `web/android/app/build/outputs/bundle/release/app-release.aab`

Create `web/android/key.properties` locally (do not commit) for release signing.

## iOS

```bash
cd web
npx cap open ios
```

In Xcode: select a development team, then Product > Archive. Export IPA from Organizer.

Bundle ID: `com.sabjiwala.app`

## Store checklist

Play: application ID `com.sabjiwala.app`, privacy policy URL, target API 34+, 512px icon, feature graphic, Data safety form (location, payments).

App Store: bundle ID `com.sabjiwala.app`, privacy nutrition labels, NSLocationWhenInUseUsageDescription, payment disclosure, 1024px icon.
