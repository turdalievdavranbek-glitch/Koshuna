import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Tunnel-dependent WebView shell (last resort).
 * next.config output:'export' breaks critical App Router routes
 * (e.g. /chat/[id], /listing/[id], /section/[id], shop APIs) without UI rewrites.
 */
const config: CapacitorConfig = {
  appId: "com.koshuna.app",
  appName: "Koshuna",
  webDir: "public",
  server: {
    url: "https://priced-reminder-begin-paths.trycloudflare.com",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
