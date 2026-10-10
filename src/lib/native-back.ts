/**
 * Android hardware / gesture Back for APK v1.2 (versionCode 3).
 * Old APK v1.1 has no @capacitor/app plugin: this module does nothing,
 * the system Back still closes the app, and the local draft survives.
 *
 * On any page except home, Back follows WebView history (the draft screen
 * already asks before leaving). On / the first Back shows a toast; a second
 * Back within 2 s exits. The draft stays in local storage either way.
 */

export type BackDecision = "close-overlay" | "leave-dialog" | "history" | "toast-exit" | "exit" | "minimize" | "noop";

export const EXIT_WINDOW_MS = 2000;
export const EXIT_TOAST_RU = "Нажмите ещё раз, чтобы выйти";
export const EXIT_TOAST_KY = "Чыгуу үчүн дагы бир жолу басыңыз";

export function exitToastText(lang: string | null | undefined): string {
  return lang === "ky" ? EXIT_TOAST_KY : EXIT_TOAST_RU;
}

export function readUiLang(): "ru" | "ky" {
  try {
    const raw = localStorage.getItem("konshu-state-v1");
    if (!raw) return "ru";
    const lang = (JSON.parse(raw) as { lang?: string }).lang;
    return lang === "ky" ? "ky" : "ru";
  } catch {
    return "ru";
  }
}

export function isHomePath(pathname: string): boolean {
  return pathname === "/";
}

export function decideHardwareBack(input: {
  pluginAvailable: boolean;
  overlayOpen: boolean;
  leaveGuard: boolean;
  canGoBack: boolean;
  atHome?: boolean;
  exitArmed?: boolean;
}): BackDecision {
  if (!input.pluginAvailable) return "noop";
  if (input.overlayOpen) return "close-overlay";
  if (input.leaveGuard) return "leave-dialog";
  if (input.atHome) return input.exitArmed ? "exit" : "toast-exit";
  if (input.canGoBack) return "history";
  return "minimize";
}

type Overlay = { id: string; close: () => void };

let stack: Overlay[] = [];
let leaveHandler: (() => void) | null = null;

export function pushOverlay(id: string, close: () => void) {
  stack = stack.filter((row) => row.id !== id);
  stack.push({ id, close });
}

export function removeOverlay(id: string) {
  stack = stack.filter((row) => row.id !== id);
}

export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  stack = stack.slice(0, -1);
  top.close();
  return true;
}

export function hasOverlay(): boolean {
  return stack.length > 0;
}

export function setHardwareLeaveHandler(fn: (() => void) | null) {
  leaveHandler = fn;
}

export function hasLeaveGuard(): boolean {
  return Boolean(leaveHandler);
}

const TOAST_ID = "konshu-exit-toast";

export function showExitToast(text: string): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(TOAST_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = TOAST_ID;
    el.setAttribute("role", "status");
    el.style.position = "fixed";
    el.style.left = "16px";
    el.style.right = "16px";
    el.style.bottom = "96px";
    el.style.zIndex = "80";
    el.style.padding = "12px 16px";
    el.style.borderRadius = "14px";
    el.style.background = "#17140F";
    el.style.color = "#F7F3EC";
    el.style.textAlign = "center";
    el.style.fontSize = "14px";
    el.style.fontWeight = "600";
    el.style.lineHeight = "1.35";
    document.body.appendChild(el);
  }
  el.textContent = text;
  window.setTimeout(() => {
    const node = document.getElementById(TOAST_ID);
    if (node?.textContent === text) node.remove();
  }, EXIT_WINDOW_MS);
}

type BackDeps = {
  isNativePlatform: () => boolean;
  isPluginAvailable: (name: string) => boolean;
  addListener: (event: "backButton", cb: (event: { canGoBack: boolean }) => void) => Promise<unknown>;
  minimizeApp: () => Promise<unknown>;
  exitApp?: () => Promise<unknown>;
  showExitToast?: () => void;
  isHome?: () => boolean;
  now?: () => number;
};

export async function attachNativeBack(deps: BackDeps): Promise<"wired" | "noop"> {
  if (!deps.isNativePlatform() || !deps.isPluginAvailable("App")) return "noop";
  let armedUntil = 0;
  await deps.addListener("backButton", ({ canGoBack }) => {
    const now = deps.now ? deps.now() : Date.now();
    const atHome = deps.isHome ? deps.isHome() : typeof window !== "undefined" && isHomePath(window.location.pathname);
    const decision = decideHardwareBack({
      pluginAvailable: true,
      overlayOpen: hasOverlay(),
      leaveGuard: hasLeaveGuard(),
      canGoBack,
      atHome,
      exitArmed: now < armedUntil,
    });
    if (decision === "close-overlay") {
      armedUntil = 0;
      closeTopOverlay();
      return;
    }
    if (decision === "leave-dialog") {
      armedUntil = 0;
      leaveHandler?.();
      return;
    }
    if (decision === "history") {
      armedUntil = 0;
      window.history.back();
      return;
    }
    if (decision === "toast-exit") {
      armedUntil = now + EXIT_WINDOW_MS;
      if (deps.showExitToast) deps.showExitToast();
      else showExitToast(exitToastText(readUiLang()));
      return;
    }
    if (decision === "exit") {
      armedUntil = 0;
      void (deps.exitApp ? deps.exitApp() : deps.minimizeApp());
      return;
    }
    if (decision === "minimize") void deps.minimizeApp();
  });
  return "wired";
}

export async function wireNativeBack(): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("App")) return;
    const { App } = await import("@capacitor/app");
    await attachNativeBack({
      isNativePlatform: () => Capacitor.isNativePlatform(),
      isPluginAvailable: (name) => Capacitor.isPluginAvailable(name),
      addListener: (event, cb) => App.addListener(event, cb),
      minimizeApp: () => App.minimizeApp(),
      exitApp: () => App.exitApp(),
      showExitToast: () => showExitToast(exitToastText(readUiLang())),
      isHome: () => isHomePath(window.location.pathname),
      now: () => Date.now(),
    });
  } catch {
    /* Old APK: the plugin is not in the WebView. Autosave still keeps the draft. */
  }
}
