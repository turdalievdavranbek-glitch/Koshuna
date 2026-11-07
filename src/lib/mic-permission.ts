export type MicGate = "granted" | "denied" | "settings";

type MicBridge = {
  requestMic: () => void;
  openSettings: () => void;
};

function bridge(): MicBridge | null {
  if (typeof window === "undefined") return null;
  const native = (window as Window & { KoshunaNative?: MicBridge }).KoshunaNative;
  if (!native || typeof native.requestMic !== "function") return null;
  return native;
}

/** Android WebView: ask RECORD_AUDIO ourselves so the system dialog appears on the tap. */
export function requestNativeMic(): Promise<MicGate> {
  const native = bridge();
  if (!native) return Promise.resolve("granted");
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve("denied"), 20000);
    (window as Window & { __koshunaMic?: (status: string) => void }).__koshunaMic = (status) => {
      window.clearTimeout(timer);
      resolve(status === "granted" || status === "settings" ? status : "denied");
    };
    try {
      native.requestMic();
    } catch {
      window.clearTimeout(timer);
      resolve("granted");
    }
  });
}

export function openMicSettings() {
  bridge()?.openSettings();
}

export function hasNativeMic(): boolean {
  return bridge() !== null;
}
