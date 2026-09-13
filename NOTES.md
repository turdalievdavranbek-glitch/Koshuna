# Koshuna — tiles checkpoint (host without Cursor)

App is a Next.js App Router site plus a Capacitor Android WebView that loads the live tunnel.

## Run the site

```bash
cd /path/to/nova
npm ci
npx next build
npx next start -H 0.0.0.0 -p 43123
```

Dev (`npm run dev`) works for local edits. Prefer `next start` on 43123 so there is no Next Issues overlay.

## Public tunnel (phone / APK)

Point Cloudflare to port 43123. Preferred hostname:

`https://arg-cell-bedford-postcards.trycloudflare.com`

If the hostname changes, set it in `capacitor.config.ts` → `server.url` and rebuild **one** APK.

```bash
cloudflared tunnel --url http://127.0.0.1:43123
```

## Auth (demo)

- Phone + any 4+ digit code, e.g. `123456`
- Google demo logs in as Давран

AI never invents a price and never publishes without the human confirm step.

## Android APK

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

WebView needs CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION. Camera/mic/location hardware is `required=false`. Runtime prompt + WebView geolocation grant.

## APK download (this VM)

Serve `/opt/cursor/artifacts` on :8765 and tunnel that port. File name: `Koshuna-tiles-checkpoint.apk`

Last APK: 6034410 bytes, sha256 `b1dbf648dc9f73e7bb4bd97ae89f2857fda7ae8d631118a2420829909b900847`
Download: https://penguin-blacks-bars-threatening.trycloudflare.com/Koshuna-tiles-checkpoint.apk

## What still needs a real server

- Real SMS / WhatsApp / Telegram OTP (now any code)
- Cloud OCR / shop AI (`SHOP_AI_URL` / `SHOP_AI_KEY`) — local digit read only
- Speech-to-text on Android WebView (Chrome STT; otherwise type the transcript)
- Durable listings, shops, honesty scores, comments (today: `localStorage`)
- Real 2GIS / map keys if you leave the demo tiles
- Play signing, privacy policy hosting, closed-test store listing
