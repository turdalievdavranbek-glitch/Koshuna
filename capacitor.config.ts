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
    // Android 15 edge-to-edge (targetSdk 36). The site has no viewport-fit=cover, so Capacitor pads the
    // WebView by the status/navigation bar insets natively: content never sits under the bars.
    // "LIGHT" = dark bar icons on the light #F7F3EC background (the site has no dark theme).
    SystemBars: {
      insetsHandling: "css",
      style: "LIGHT",
    },
    PushNotifications: {
      presentationOptions: ["alert", "sound", "badge"],
    },
  },
};

export default config;
