# Koshuna — tiles checkpoint (host without Cursor)

App is a Next.js App Router site plus a Capacitor Android WebView. The shell loads `https://koshuna.ru`. Owner console steps (Firebase, keystore, OAuth, APK link) are in `android/OWNER-SETUP.md`.

## Run the site

```bash
cd /path/to/nova
npm ci
npx next build
npx next start -H 0.0.0.0 -p 43123
```

Dev (`npm run dev`) works for local edits. Prefer `next start` on 43123 so there is no Next Issues overlay.

## Production site

`https://koshuna.ru` → nginx → `next start` on port 43123. The Android shell uses that HTTPS URL. Cleartext is off.

## Auth (demo)

- Phone + any 4+ digit code, e.g. `123456`
- Google demo logs in as Давран

AI never invents a price and never publishes without the human confirm step.

## Android APK

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```

Debug output: `android/app/build/outputs/apk/debug/app-debug.apk`

Release (needs the upload keystore from `android/OWNER-SETUP.md`):

```bash
cd android && ./gradlew assembleRelease
```

Copy the signed file to `public/download/koshuna.apk` so the site serves `https://koshuna.ru/download/koshuna.apk`.

WebView still requests CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, and on Android 13+ POST_NOTIFICATIONS. Camera, mic, and location hardware stay `required=false`. Runtime prompt + WebView geolocation grant. WebView debugging is on only in debug builds.

## What still needs a real server

- Real SMS / WhatsApp / Telegram OTP (now any code)
- Cloud OCR / shop AI (`SHOP_AI_URL` / `SHOP_AI_KEY`) — local digit read only
- Speech-to-text on Android WebView (Chrome STT; otherwise type the transcript)
- Durable listings, shops, honesty scores, comments (today: `localStorage`)
- Real 2GIS / map keys if you leave the demo tiles
- Play signing, privacy policy hosting, closed-test store listing
