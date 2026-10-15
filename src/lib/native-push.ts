/**
 * Native push (Android shell). The website does not register a browser push.
 * Permission is asked after login, or the first time Messages is opened or a
 * message is sent — not on cold start. A tap opens the path already used by
 * in-app notices (chat thread, request, listing).
 */

import { api } from "./api/client";
import { navigateToAppPath } from "./native-links";
import { isSafePushPath, PUSH_CHANNEL_ID } from "./push-path";

const TOKEN_KEY = "koshuna-push-token";

let listenersReady = false;
let prompted = false;
let generation = 0;
let currentToken: string | null = null;
let activePlatform: "android" | "ios" | null = null;
let posting: Promise<void> | null = null;
let postAbort: AbortController | null = null;

type PushHandle = {
  platform: "android" | "ios";
  PushNotifications: typeof import("@capacitor/push-notifications").PushNotifications;
};

async function nativePush(): Promise<PushHandle | null> {
  if (typeof window === "undefined") return null;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("PushNotifications")) return null;
    const platform = Capacitor.getPlatform();
    if (platform !== "android" && platform !== "ios") return null;
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return { platform, PushNotifications };
  } catch {
    return null;
  }
}

function rememberToken(token: string): void {
  currentToken = token;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* session storage can be blocked; the in-memory token still works */
  }
}

function storedToken(): string | null {
  if (currentToken) return currentToken;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearStoredToken(): void {
  currentToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function postToken(token: string, platform: "android" | "ios"): Promise<void> {
  const seen = generation;
  postAbort?.abort();
  const ac = new AbortController();
  postAbort = ac;
  const run = (async () => {
    const res = await api("/api/me/push-tokens", { method: "POST", json: { token, platform }, signal: ac.signal });
    if (seen !== generation) {
      if (res.ok) await api("/api/me/push-tokens", { method: "DELETE", json: { token } });
      return;
    }
    if (!res.ok) return;
    rememberToken(token);
  })();
  posting = run;
  try {
    await run;
  } finally {
    if (posting === run) posting = null;
  }
}

async function ensureChannel(PushNotifications: PushHandle["PushNotifications"]): Promise<void> {
  try {
    await PushNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: "Сообщения",
      description: "Новые сообщения и уведомления Коңшу",
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {
    /* The APK also creates this channel at startup. */
  }
}

/** Tap listener only. Does not ask for permission. */
export async function wirePushOpen(): Promise<void> {
  if (listenersReady) return;
  const handle = await nativePush();
  if (!handle) return;
  listenersReady = true;
  activePlatform = handle.platform;
  const { PushNotifications } = handle;
  await PushNotifications.addListener("registration", ({ value }) => {
    if (!value || !activePlatform) return;
    void postToken(value, activePlatform);
  });
  await PushNotifications.addListener("registrationError", () => {
    /* FCM stays off until google-services.json is in the APK. */
  });
  await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
    const data = event.notification?.data as { path?: unknown } | undefined;
    const path = typeof data?.path === "string" ? data.path : "";
    if (!isSafePushPath(path)) return;
    navigateToAppPath(path);
  });
}

async function registerGranted(handle: PushHandle): Promise<void> {
  activePlatform = handle.platform;
  await ensureChannel(handle.PushNotifications);
  await handle.PushNotifications.register();
}

/** Refresh the token when permission was already granted. Does not show a dialog. */
export async function resumeNativePush(): Promise<void> {
  const handle = await nativePush();
  if (!handle) return;
  await wirePushOpen();
  try {
    const status = await handle.PushNotifications.checkPermissions();
    if (status.receive !== "granted") return;
    await registerGranted(handle);
  } catch {
    /* Old shell without the push plugin. */
  }
}

/**
 * Ask for notification permission if the system still allows a prompt,
 * then register the FCM token. Safe to call more than once.
 */
export async function enableNativePush(): Promise<void> {
  const handle = await nativePush();
  if (!handle) return;
  await wirePushOpen();
  try {
    let status = await handle.PushNotifications.checkPermissions();
    if (status.receive === "granted") {
      await registerGranted(handle);
      return;
    }
    if (status.receive !== "prompt" && status.receive !== "prompt-with-rationale") return;
    if (prompted) return;
    prompted = true;
    status = await handle.PushNotifications.requestPermissions();
    if (status.receive !== "granted") return;
    await registerGranted(handle);
  } catch {
    /* FCM needs google-services.json. The rest of the app still works. */
  }
}

/** DELETE this device token while the session is still valid. */
export async function forgetNativePush(): Promise<void> {
  const handle = await nativePush();
  if (!handle) return;
  generation += 1;
  postAbort?.abort();
  await posting?.catch(() => undefined);
  const token = storedToken();
  clearStoredToken();
  if (!token) return;
  await api("/api/me/push-tokens", { method: "DELETE", json: { token } });
}
