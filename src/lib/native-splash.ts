import { Capacitor, registerPlugin } from "@capacitor/core";

type SplashPlugin = { hide: (options?: { fadeOutDuration?: number }) => Promise<void> };
let plugin: SplashPlugin | null = null;
let hidden = false;

/**
 * Hide the native splash once, after the next paint. Never throws: APK 1.3 has no SplashScreen plugin,
 * so the call is skipped there (native also caps the splash at 3 s in capacitor.config).
 */
export function hideNativeSplash() {
  if (hidden || typeof window === "undefined") return;
  hidden = true;
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("SplashScreen")) return;
    plugin ??= registerPlugin<SplashPlugin>("SplashScreen");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          void plugin?.hide({ fadeOutDuration: 150 }).catch(() => undefined);
        } catch {
          /* plugin missing or bridge error: the native 3 s cap hides it */
        }
      }),
    );
  } catch {
    /* never break the page for the splash */
  }
}
