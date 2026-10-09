/**
 * Android App Links for https://koshuna.ru (Шаг 26).
 * The WebView stays on this site. A verified link opens that path inside the app.
 */

const HOST = "koshuna.ru";

export function pathFromAppUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== HOST) return null;
  const path = `${url.pathname || "/"}${url.search}${url.hash}`;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) return null;
  return path;
}

const APP_HOSTS = new Set(["koshuna.ru", "www.koshuna.ru"]);

/** Off-site http(s), tel, and mailto. Same-site paths stay in the WebView. */
export function externalUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, typeof window === "undefined" ? "https://koshuna.ru" : window.location.href);
  } catch {
    return null;
  }
  if (url.protocol === "http:" || url.protocol === "https:") {
    if (APP_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.href;
  }
  if (url.protocol === "tel:" || url.protocol === "mailto:") return url.href;
  return null;
}

/** iOS: hand the URL to the system. Capacitor opens `_blank` in Safari. */
export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Clicks on external anchors leave the iOS WebView. Android keeps its own path. */
export function wireIosExternalLinks(): void {
  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const next = externalUrl(anchor.href);
      if (!next) return;
      event.preventDefault();
      openExternal(next);
    },
    true,
  );
}

export function navigateToAppPath(path: string): void {
  const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (here === path) return;
  window.location.assign(path);
}

export async function wireAppLinks(): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("App")) return;
    const { App } = await import("@capacitor/app");
    let last = "";
    const open = (url: string | undefined) => {
      if (!url || url === last) return;
      const path = pathFromAppUrl(url);
      if (!path) return;
      last = url;
      navigateToAppPath(path);
    };
    await App.addListener("appUrlOpen", (event) => open(event.url));
    const launch = await App.getLaunchUrl();
    open(launch?.url);
  } catch {
    /* Old APK: links stay in the browser. The site still opens them. */
  }
}
