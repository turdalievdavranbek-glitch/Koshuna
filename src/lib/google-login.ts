import { nativeGoogleSignIn } from "./native-auth";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type GsiCredential = { credential?: string };

type GoogleAccounts = {
  id: {
    initialize: (config: {
      client_id: string;
      nonce: string;
      callback: (resp: GsiCredential) => void;
      ux_mode: "popup";
      auto_select: boolean;
      itp_support: boolean;
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: {
        theme: "outline";
        size: "large";
        shape: "pill";
        width: number;
        locale: string;
        text: "signin_with";
        logo_alignment: "center";
      },
    ) => void;
    disableAutoSelect: () => void;
  };
};

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts };
  }
}

export class GoogleLoginError extends Error {
  constructor(readonly code: "not-configured" | "open-in-browser" | "error" | "cancelled") {
    super(code);
  }
}

export function isInAppBrowser(ua: string): boolean {
  return /Instagram|FBAN|FBAV|Line\/|; wv\)/.test(ua);
}

export async function fetchGoogleClientId(): Promise<string | null> {
  const res = await fetch("/api/auth/config", { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) return null;
  const data = (await res.json()) as { google?: { clientId?: string | null } };
  const id = data.google?.clientId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function fetchNonce(): Promise<string> {
  const res = await fetch("/api/auth/google/nonce", { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new GoogleLoginError("error");
  const data = (await res.json()) as { nonce?: string };
  if (!data.nonce) throw new GoogleLoginError("error");
  return data.nonce;
}

let scriptPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new GoogleLoginError("error"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new GoogleLoginError("open-in-browser"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

function buttonRendered(container: HTMLElement): boolean {
  if (container.querySelector("iframe")) return true;
  const box = container.getBoundingClientRect();
  return container.childElementCount > 0 && box.height >= 30;
}

function isCancel(err: unknown): boolean {
  const message = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /cancel/i.test(message);
}

/**
 * One sign-in attempt. On the web the promise stays pending until the GIS
 * button calls back. A cancelled native dialog resolves to null.
 */
export async function startGoogleSignIn(opts: {
  locale: "ky" | "ru";
  container?: HTMLElement | null;
}): Promise<string | null> {
  const clientId = await fetchGoogleClientId();
  if (!clientId) throw new GoogleLoginError("not-configured");
  const nonce = await fetchNonce();
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await nativeGoogleSignIn({ clientId, nonce });
      return result.idToken || null;
    } catch (err) {
      if (isCancel(err)) return null;
      throw new GoogleLoginError("error");
    }
  }
  if (isInAppBrowser(navigator.userAgent || "")) throw new GoogleLoginError("open-in-browser");
  const container = opts.container;
  if (!container) throw new GoogleLoginError("error");
  await loadGsi();
  const gis = window.google?.accounts?.id;
  if (!gis) throw new GoogleLoginError("open-in-browser");
  container.replaceChildren();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const fail = (err: GoogleLoginError) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(err);
    };
    const timer = window.setTimeout(() => {
      if (settled) return;
      if (!buttonRendered(container)) fail(new GoogleLoginError("open-in-browser"));
    }, 8000);
    gis.initialize({
      client_id: clientId,
      nonce,
      callback: (resp) => {
        if (resp?.credential) finish(resp.credential);
        else fail(new GoogleLoginError("error"));
      },
      ux_mode: "popup",
      auto_select: false,
      itp_support: true,
    });
    const measured = Math.floor(container.getBoundingClientRect().width);
    const width = Math.min(400, Math.max(measured, 240));
    gis.renderButton(container, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width,
      locale: opts.locale,
      text: "signin_with",
      logo_alignment: "center",
    });
  });
}

export function disableGoogleAutoSelect(): void {
  try {
    window.google?.accounts?.id?.disableAutoSelect();
  } catch {
    /* ignore */
  }
}
