import { Capacitor, registerPlugin } from "@capacitor/core";

type SplashPlugin = { hide: (options?: { fadeOutDuration?: number }) => Promise<void> };
const SplashScreen = registerPlugin<SplashPlugin>("SplashScreen");
let hidden = false;

/** Hide the native splash once, after the next paint. Native also caps the splash at 3 s (capacitor.config). */
export function hideNativeSplash() {
  if (hidden || typeof window === "undefined") return;
  hidden = true;
  if (!Capacitor.isNativePlatform()) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      void SplashScreen.hide({ fadeOutDuration: 150 }).catch(() => undefined);
    }),
  );
}
