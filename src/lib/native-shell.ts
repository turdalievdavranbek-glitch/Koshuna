/**
 * Native shell hooks for the Android APK (Шаг 1) and the iOS shell (Шаг 30).
 * No UI. Login buttons are Шаг 8. The home bell lists in-app notices (Шаг 18).
 * Push permission is not asked here. The native app asks after login or when
 * Messages is opened. Crashlytics stays quiet until google-services.json is in the APK.
 */

let wired = false;

export async function wireNativeShell(): Promise<void> {
  if (typeof window === "undefined") return;
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add("native");
    if (Capacitor.getPlatform() === "ios") document.documentElement.classList.add("ios");
  }
  if (wired || !Capacitor.isNativePlatform()) return;
  wired = true;
  const { wireNativeBack } = await import("./native-back");
  const { wireAppLinks, wireIosExternalLinks } = await import("./native-links");
  void wireNativeBack();
  void wireAppLinks();
  if (Capacitor.getPlatform() === "ios") wireIosExternalLinks();
  wireJsErrors();
  const { wirePushOpen } = await import("./native-push");
  await wirePushOpen();
}

function wireJsErrors(): void {
  const report = (message: string) => {
    const text = message.replace(/\s+/g, " ").trim().slice(0, 4000);
    if (!text) return;
    void import("@capacitor-firebase/crashlytics")
      .then(({ FirebaseCrashlytics }) =>
        FirebaseCrashlytics.recordException({ message: text }),
      )
      .catch(() => {
        /* Firebase is inactive until google-services.json is added. */
      });
  };

  window.addEventListener("error", (event) => {
    const stack = event.error instanceof Error ? event.error.stack : "";
    report(stack ? `${event.message}\n${stack}` : event.message || "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      report(reason.stack ? `${reason.message}\n${reason.stack}` : reason.message);
      return;
    }
    report(typeof reason === "string" ? reason : "unhandledrejection");
  });
}
