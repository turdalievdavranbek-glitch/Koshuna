"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { BrandApple, BrandGoogle, BrandTelegram } from "@/components/auth-brands";
import { Flag } from "@/components/icons";
import { BrandMark } from "@/components/brand";
import { ScreenBack } from "@/components/back-button";
import { PhoneShell } from "@/components/shell";
import { LangSwitch } from "@/components/ui";
import { startAppleSignIn } from "@/lib/apple-login";
import { fetchGoogleClientId, isInAppBrowser } from "@/lib/google-login";
import { openExternal } from "@/lib/native-links";
import {
  fetchTelegramConfig,
  fitTelegramFrame,
  mountTelegramWidget,
  pollTelegramLogin,
  startTelegramAppLogin,
  tryClickTelegramWidget,
  writeTelegramDestCookie,
  type TelegramClientConfig,
} from "@/lib/telegram-login";
import { useApp } from "@/lib/store";

const authBtn =
  "flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-ink disabled:opacity-60";

function LoginInner() {
  const { t, lang, user, ready, pendingPath, signInWithGoogle, acceptSignedInUser } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const boxRef = useRef<HTMLDivElement>(null);
  const arrivedSignedIn = useRef<boolean | null>(null);
  const signRef = useRef(signInWithGoogle);
  signRef.current = signInWithGoogle;
  const destRef = useRef("/");
  destRef.current = pendingPath || params.get("next") || "/";
  const [native, setNative] = useState(false);
  const [ios, setIos] = useState(false);
  const [phase, setPhase] = useState<"loading" | "soon" | "button" | "webview">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [shell, setShell] = useState<"unknown" | "web" | "app">("unknown");
  const [telegram, setTelegram] = useState<TelegramClientConfig | null>(null);
  const [tgWait, setTgWait] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);
  const [tgLocalError, setTgLocalError] = useState("");
  const [widgetOn, setWidgetOn] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleError, setAppleError] = useState("");
  const tgBoxRef = useRef<HTMLDivElement>(null);
  const tgMounted = useRef(false);
  const pollRef = useRef<() => void>(() => undefined);
  const acceptRef = useRef(acceptSignedInUser);
  acceptRef.current = acceptSignedInUser;

  useEffect(() => {
    if (!ready) return;
    if (arrivedSignedIn.current === null) arrivedSignedIn.current = Boolean(user);
    if (arrivedSignedIn.current && user) router.replace(pendingPath || "/");
  }, [ready, user, pendingPath, router]);

  useEffect(() => {
    let dead = false;
    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (!dead) {
          setShell(Capacitor.isNativePlatform() ? "app" : "web");
          setIos(Capacitor.getPlatform() === "ios");
        }
      })
      .catch(() => {
        if (!dead) setShell("web");
      });
    void fetchTelegramConfig().then((config) => {
      if (!dead) setTelegram(config);
    });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!tgWait) return;
    let dead = false;
    const started = Date.now();
    const tick = async () => {
      if (dead) return;
      if (Date.now() - started > 10 * 60 * 1000) {
        setTgWait(false);
        setTgLocalError(t.loginTelegramTimeout);
        return;
      }
      if (document.visibilityState !== "visible") return;
      const result = await pollTelegramLogin();
      if (dead) return;
      if (result.ok) {
        dead = true;
        setTgWait(false);
        acceptRef.current(result.user, result.isNew, (href) => router.replace(href), destRef.current);
        return;
      }
      if (result.status === "expired") {
        setTgWait(false);
        setTgLocalError(t.loginTelegramTimeout);
      } else if (result.status === "blocked") {
        setTgWait(false);
        setTgLocalError(t.loginAccountUnavailable);
      } else if (result.status === "error") {
        setTgWait(false);
        setTgLocalError(t.loginTelegramError);
      }
    };
    pollRef.current = () => {
      void tick();
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 2000);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tgWait, router, t.loginAccountUnavailable, t.loginTelegramError, t.loginTelegramTimeout]);

  useEffect(() => {
    if (shell !== "app" || !telegram?.enabled || tgWait) return;
    let dead = false;
    void pollTelegramLogin().then((result) => {
      if (dead) return;
      if (result.ok) {
        acceptRef.current(result.user, result.isNew, (href) => router.replace(href), destRef.current);
        return;
      }
      if (result.status === "pending") setTgWait(true);
      else if (result.status === "blocked") setTgLocalError(t.loginAccountUnavailable);
    });
    return () => {
      dead = true;
    };
  }, [shell, telegram, tgWait, router, t.loginAccountUnavailable]);

  useEffect(() => {
    if (!widgetOn || shell !== "web" || !telegram?.botUsername) return;
    const box = tgBoxRef.current;
    if (!box || tgMounted.current) return;
    tgMounted.current = true;
    mountTelegramWidget(box, {
      botUsername: telegram.botUsername,
      authUrl: `${window.location.origin}/api/auth/telegram/callback`,
    });
    tryClickTelegramWidget(box);
    const ro = new ResizeObserver(() => fitTelegramFrame(box));
    ro.observe(box);
    return () => ro.disconnect();
  }, [widgetOn, shell, telegram]);

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        const isNative = Capacitor.isNativePlatform();
        if (dead) return;
        setNative(isNative);
        if (!isNative && isInAppBrowser(navigator.userAgent || "")) {
          setPhase("webview");
          return;
        }
        const clientId = await fetchGoogleClientId();
        if (dead) return;
        setPhase(clientId ? "button" : "soon");
      } catch {
        if (!dead) {
          setError(t.loginGoogleError);
          setPhase("button");
        }
      }
    })();
    return () => {
      dead = true;
    };
  }, [t.loginGoogleError]);

  useEffect(() => {
    if (phase !== "button" || native) return;
    const container = boxRef.current;
    if (!container) return;
    let dead = false;
    void (async () => {
      const result = await signRef.current({
        locale: lang === "ky" ? "ky" : "ru",
        container,
        navigate: (href) => router.replace(href),
        dest: destRef.current,
      });
      if (dead) return;
      if (result === "cancelled") {
        setError("");
        setBusy(false);
        return;
      }
      if (result === "not-configured") {
        setPhase("soon");
        return;
      }
      if (result === "open-in-browser") {
        setPhase("webview");
        return;
      }
      if (result === "error") {
        setError(t.loginGoogleError);
        setAttempt((n) => n + 1);
      }
    })();
    return () => {
      dead = true;
    };
  }, [phase, native, lang, attempt, router, t.loginGoogleError]);

  const onNative = () => {
    if (busy) return;
    setBusy(true);
    setError("");
    void (async () => {
      const result = await signRef.current({
        locale: lang === "ky" ? "ky" : "ru",
        navigate: (href) => router.replace(href),
        dest: destRef.current,
      });
      setBusy(false);
      if (result === "cancelled") return;
      if (result === "not-configured") {
        setPhase("soon");
        return;
      }
      if (result === "open-in-browser") {
        setPhase("webview");
        return;
      }
      if (result === "error") setError(t.loginGoogleError);
    })();
  };

  const onApple = () => {
    if (appleBusy) return;
    setAppleBusy(true);
    setAppleError("");
    void (async () => {
      const result = await startAppleSignIn();
      setAppleBusy(false);
      if (!result.ok) {
        if (result.status === "blocked") setAppleError(t.loginAccountUnavailable);
        else if (result.status === "error") setAppleError(t.loginAppleError);
        return;
      }
      acceptRef.current(result.user, result.isNew, (href) => router.replace(href), destRef.current);
    })();
  };

  const tgFlag = params.get("tg");
  const queryError = tgFlag === "blocked" ? t.loginAccountUnavailable : tgFlag === "error" ? t.loginTelegramError : "";
  const tgError = tgLocalError || queryError;
  const telegramOn = telegram?.enabled === true;

  const onTelegram = () => {
    if (tgBusy || shell === "unknown") return;
    setTgLocalError("");
    if (shell === "app") {
      setTgBusy(true);
      void (async () => {
        const started = await startTelegramAppLogin();
        setTgBusy(false);
        if ("error" in started) {
          setTgLocalError(t.loginTelegramError);
          return;
        }
        setTgWait(true);
        if (ios) openExternal(started.link);
        else window.location.href = started.link;
      })();
      return;
    }
    writeTelegramDestCookie(destRef.current);
    setWidgetOn(true);
  };

  return (
    <PhoneShell>
      <div className="sc flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-8 pt-4">
        <ScreenBack fallback="/" />
        <div className="mt-3">
          <LangSwitch />
        </div>
        <div className="mt-8">
          <BrandMark size={40} wordClass="text-[32px] leading-none text-ink" />
          <div className="mt-3 flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
            <Flag size={16} />
            <span className="text-xs font-semibold text-ink">{t.country}</span>
          </div>
        </div>
        <div className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-dark">{t.eyebrow}</div>
        <h1 className="mt-5 font-display text-[26px] font-bold leading-[1.12] tracking-[-0.01em] text-ink">{t.slogan}</h1>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-muted">{t.loginHint}</p>

        <div className="mx-auto mt-6 flex w-full max-w-[360px] flex-col items-center gap-3">
          <div className="w-full" data-testid="google-login">
            {error ? <p className="mb-2 text-[13px] leading-[1.45] text-accent">{error}</p> : null}
            {phase === "soon" ? (
              <button
                type="button"
                disabled
                className="flex h-10 w-full items-center justify-center rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-muted"
              >
                {t.loginSoon}
              </button>
            ) : null}
            {phase === "webview" ? <p className="text-[13px] leading-[1.45] text-muted">{t.loginOpenInBrowser}</p> : null}
            {native && phase !== "soon" && phase !== "webview" ? (
              <button type="button" onClick={onNative} disabled={busy || phase === "loading"} className={authBtn}>
                <BrandGoogle size={18} />
                {t.loginGoogle}
              </button>
            ) : null}
            {!native && phase !== "soon" && phase !== "webview" ? (
              <div ref={boxRef} className="h-10 w-full overflow-hidden rounded-full" />
            ) : null}
          </div>

          {ios ? (
            <div className="w-full" data-testid="apple-login">
              {appleError ? <p className="mb-2 text-[13px] leading-[1.45] text-accent">{appleError}</p> : null}
              <button type="button" onClick={onApple} disabled={appleBusy} className={authBtn}>
                <BrandApple size={18} />
                {t.loginApple}
              </button>
            </div>
          ) : null}

          {telegramOn ? (
            <div className="flex w-full flex-col gap-3" data-testid="telegram-login">
              <div className="flex items-center gap-3 text-[13px] text-muted">
                <span className="h-px flex-1 bg-line" />
                <span>{t.loginOr}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              {tgError ? <p className="text-[13px] leading-[1.45] text-accent">{tgError}</p> : null}
              {tgWait ? (
                <div className="flex flex-col gap-3">
                  <p className="flex items-center gap-2 text-[14px] leading-[1.45] text-ink">
                    <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
                    {t.loginTelegramWait}
                  </p>
                  <button type="button" onClick={() => pollRef.current()} className={authBtn}>
                    {t.loginTelegramConfirmed}
                  </button>
                </div>
              ) : (
                <div className="relative h-10 w-full">
                  <button
                    type="button"
                    onClick={onTelegram}
                    disabled={tgBusy || shell === "unknown"}
                    className={authBtn}
                  >
                    <BrandTelegram size={18} />
                    {t.loginTelegram}
                  </button>
                  {widgetOn && shell === "web" ? (
                    <div
                      ref={tgBoxRef}
                      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-full opacity-0"
                    />
                  ) : null}
                </div>
              )}
              <p className="text-[12px] leading-[1.45] text-muted">{t.loginTelegramSeparate}</p>
            </div>
          ) : tgError ? (
            <p className="w-full text-[13px] leading-[1.45] text-accent">{tgError}</p>
          ) : null}
        </div>

        <Link
          href="/"
          className="mt-4 flex h-12 items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink no-underline"
        >
          {t.skipCatalog}
        </Link>
        <p className="mt-auto pt-[22px] text-center text-xs leading-[1.5] text-muted-2">
          {t.terms}{" "}
          <a href="/terms" className="text-accent">
            {t.termsLink}
          </a>
          {" · "}
          <a href="/privacy" className="text-accent">
            {t.privacyLink}
          </a>
        </p>
      </div>
    </PhoneShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
