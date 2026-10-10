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
    // Splash stays until the web app reports the first paint of the home feed (SplashScreen.hide from
    // src/lib/native-splash.ts), but never longer than 3 s: auto-hide is the 3 s cap, not the normal path.
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3000,
      launchFadeOutDuration: 150,
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["alert", "sound", "badge"],
    },
  },
};

export default config;
