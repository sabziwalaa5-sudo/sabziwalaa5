# Sabjiwala mobile apps

The **shippable Android / iOS app** is Capacitor in `web/` (`com.sabjiwala.app`). It opens the live linked site:

- Storefront (APK start URL): https://web-sabziwalaa5.vercel.app/
- Apps launcher: https://web-sabziwalaa5.vercel.app/apps
- Admin: https://web-sabziwalaa5.vercel.app/admin
- Vendor: https://web-sabziwalaa5.vercel.app/vendor
- Rider: https://web-sabziwalaa5.vercel.app/rider

`/app` redirects to `/` so older APKs that opened `/app` do not land on a 404.

`mobile/` is an optional Flutter wrapper of the same URLs. Capacitor is the app to ship.

## Prerequisites

- Node.js 20+
- Android Studio + JDK 17 for Android
- Xcode 16+ on macOS for iOS

## Run the mobile home in a browser

https://web-sabziwalaa5.vercel.app/apps

## Android (Capacitor)

```bash
cd web
npm ci
npx cap sync android
npx cap open android
```

CLI debug APK (needs Android SDK):

```bash
cd web/android
./gradlew assembleDebug
```

APK: `web/android/app/build/outputs/apk/debug/app-debug.apk`

GitHub Actions also builds this APK on each PR (`Android APK` workflow).

## iOS (Capacitor)

```bash
cd web
npm ci
npx cap sync ios
npx cap open ios
```

Bundle ID: `com.sabjiwala.app`

Point a device at a local Next server:

```bash
CAPACITOR_SERVER_URL=http://192.168.1.10:3000/ npx cap sync
```

## Flutter (optional)

```bash
cd mobile
flutter create . --project-name sabjiwala5_mobile
flutter pub get
flutter run
```
