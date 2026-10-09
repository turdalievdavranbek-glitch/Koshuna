import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WebView shell loads the live site over HTTPS.
 * WebView debugging is forced off in release builds (see MainActivity).
 * Google / Apple client IDs are read at sign-in time from the website env
 * (Шаг 8 draws the buttons). See android/OWNER-SETUP.md and docs/ios.md.
 *
 * Hosts other than koshuna.ru are not in allowNavigation, so iOS opens them
 * in Safari (and https://t.me in Telegram) the same way Android opens an intent.
 * The iOS client id is not here: CI writes GIDClientID into Info.plist.
 */
const config: CapacitorConfig = {
  appId: "com.koshuna.app",
  appName: "Коңшу",
  webDir: "public",
  server: {
    url: "https://koshuna.ru",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["alert", "sound", "badge"],
    },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/crashlytics": {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
