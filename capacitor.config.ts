import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WebView shell loads the live site over HTTPS.
 * WebView debugging is forced off in release builds (see MainActivity).
 * Google / Apple client IDs are read at sign-in time from the website env
 * (Шаг 8 draws the buttons). See android/OWNER-SETUP.md.
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
};

export default config;
