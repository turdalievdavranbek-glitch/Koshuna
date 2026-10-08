/**
 * Android hardware / gesture Back for APK v1.2+.
 * Old APK v1.1 has no @capacitor/app plugin: this module does nothing,
 * the system Back still closes the app, and the local draft survives.
 */

export type BackDecision = "close-overlay" | "leave-dialog" | "history" | "minimize" | "noop";

export function decideHardwareBack(input: {
  pluginAvailable: boolean;
  overlayOpen: boolean;
  leaveGuard: boolean;
  canGoBack: boolean;
}): BackDecision {
  if (!input.pluginAvailable) return "noop";
  if (input.overlayOpen) return "close-overlay";
  if (input.leaveGuard) return "leave-dialog";
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

type BackDeps = {
  isNativePlatform: () => boolean;
  isPluginAvailable: (name: string) => boolean;
  addListener: (event: "backButton", cb: (event: { canGoBack: boolean }) => void) => Promise<unknown>;
  minimizeApp: () => Promise<unknown>;
};

export async function attachNativeBack(deps: BackDeps): Promise<"wired" | "noop"> {
  if (!deps.isNativePlatform() || !deps.isPluginAvailable("App")) return "noop";
  await deps.addListener("backButton", ({ canGoBack }) => {
    const decision = decideHardwareBack({
      pluginAvailable: true,
      overlayOpen: hasOverlay(),
      leaveGuard: hasLeaveGuard(),
      canGoBack,
    });
    if (decision === "close-overlay") {
      closeTopOverlay();
      return;
    }
    if (decision === "leave-dialog") {
      leaveHandler?.();
      return;
    }
    if (decision === "history") {
      window.history.back();
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
    });
  } catch {
    /* Old APK: the plugin is not in the WebView. Autosave still keeps the draft. */
  }
}
