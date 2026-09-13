import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WebView shell loads the live VPS (nginx → Next).
 * Use the IP until koshuna.ru DNS is ready; HTTP needs cleartext.
 */
const config: CapacitorConfig = {
  appId: "com.koshuna.app",
  appName: "Koshuna",
  webDir: "public",
  server: {
    url: "http://147.45.98.245",
    cleartext: true,
    androidScheme: "http",
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
