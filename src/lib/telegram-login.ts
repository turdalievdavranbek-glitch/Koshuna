import type { User } from "./types";

export type TelegramClientConfig = {
  enabled: boolean;
  botUsername: string | null;
  botId: string | null;
};

const OFF: TelegramClientConfig = { enabled: false, botUsername: null, botId: null };

export async function fetchTelegramConfig(): Promise<TelegramClientConfig> {
  try {
    const res = await fetch("/api/auth/config", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return OFF;
    const data = (await res.json()) as { telegram?: { enabled?: boolean; botUsername?: string | null; botId?: string | null } };
    const tg = data.telegram;
    if (!tg?.enabled || typeof tg.botUsername !== "string" || !tg.botUsername.trim()) return OFF;
    return {
      enabled: true,
      botUsername: tg.botUsername.trim(),
      botId: typeof tg.botId === "string" ? tg.botId : null,
    };
  } catch {
    return OFF;
  }
}

export function writeTelegramDestCookie(path: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `ktgdest=${encodeURIComponent(path)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;
}

/** Official widget, redirect mode. No data-request-access: we do not write to the user. */
export function mountTelegramWidget(container: HTMLElement, opts: { botUsername: string; authUrl: string }): void {
  container.replaceChildren();
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.setAttribute("data-telegram-login", opts.botUsername);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-radius", "20");
  script.setAttribute("data-auth-url", opts.authUrl);
  script.setAttribute("data-lang", "ru");
  container.appendChild(script);
}

/** Stretch the fixed iframe to the slot. The widget ignores width, so scale is the fit. */
export function fitTelegramFrame(container: HTMLElement): void {
  const iframe = container.querySelector("iframe");
  if (!(iframe instanceof HTMLIFrameElement)) return;
  iframe.style.transform = "none";
  const naturalW = iframe.offsetWidth;
  const naturalH = iframe.offsetHeight;
  const boxW = container.clientWidth;
  const boxH = container.clientHeight;
  if (naturalW < 8 || naturalH < 8 || boxW < 8 || boxH < 8) return;
  iframe.style.transformOrigin = "top left";
  iframe.style.transform = `scale(${boxW / naturalW}, ${boxH / naturalH})`;
  iframe.style.display = "block";
  iframe.style.border = "0";
  container.style.pointerEvents = "auto";
}

/** The widget iframe is cross-origin, so the click usually fails and the widget stays visible. */
export function tryClickTelegramWidget(container: HTMLElement): void {
  const started = Date.now();
  const tick = () => {
    const iframe = container.querySelector("iframe");
    if (iframe instanceof HTMLIFrameElement) {
      fitTelegramFrame(container);
      try {
        const button = iframe.contentDocument?.querySelector("button, a");
        if (button instanceof HTMLElement) button.click();
      } catch {
        /* Leave the official widget under our label. */
      }
      return;
    }
    if (Date.now() - started < 2000) window.setTimeout(tick, 100);
  };
  tick();
}

export async function startTelegramAppLogin(): Promise<{ link: string } | { error: "rate" | "error" }> {
  try {
    const res = await fetch("/api/auth/telegram/start", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const data = (await res.json().catch(() => null)) as { link?: string } | null;
    if (res.status === 429) return { error: "rate" };
    if (!res.ok || typeof data?.link !== "string" || !data.link.startsWith("https://t.me/")) return { error: "error" };
    return { link: data.link };
  } catch {
    return { error: "error" };
  }
}

export type TelegramPoll =
  | { ok: true; user: User; isNew: boolean }
  | { ok: false; status: "pending" | "expired" | "blocked" | "error" };

export async function pollTelegramLogin(): Promise<TelegramPoll> {
  try {
    const res = await fetch("/api/auth/telegram/poll", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; user?: User; isNew?: boolean; status?: string } | null;
    if (data?.ok && data.user?.id) return { ok: true, user: data.user, isNew: data.isNew === true };
    if (data?.status === "pending" || data?.status === "expired" || data?.status === "blocked") {
      return { ok: false, status: data.status };
    }
    return { ok: false, status: "error" };
  } catch {
    return { ok: false, status: "error" };
  }
}
