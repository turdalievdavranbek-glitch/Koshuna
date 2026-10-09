/**
 * Native shell hooks for the Android APK (Шаг 1).
 * No UI. Login buttons are Шаг 8. The home bell lists in-app notices (Шаг 18).
 * A phone push is not sent: the device-token table exists, but there is no server send path.
 * Crashlytics and FCM stay quiet until google-services.json is in the APK.
 */

let wired = false;

export async function wireNativeShell(): Promise<void> {
  if (typeof window === "undefined") return;
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) document.documentElement.classList.add("native");
  if (wired || !Capacitor.isNativePlatform()) return;
  wired = true;
  const { wireNativeBack } = await import("./native-back");
  const { wireAppLinks } = await import("./native-links");
  void wireNativeBack();
  void wireAppLinks();
  wireJsErrors();
  await wirePushPermission();
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

async function wirePushPermission(): Promise<void> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let status = await PushNotifications.checkPermissions();
    if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
      status = await PushNotifications.requestPermissions();
    }
    if (status.receive !== "granted") return;
    try {
      await PushNotifications.addListener("registration", ({ value }) => {
        void fetch("/api/devices", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: value, platform: "android" }),
        }).catch(() => undefined);
      });
    } catch {
      /* FCM token needs a real google-services.json. */
    }
    await PushNotifications.register();
  } catch {
    /* FCM token needs a real google-services.json. The permission request still ran. */
  }
}
