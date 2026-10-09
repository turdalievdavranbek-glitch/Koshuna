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
