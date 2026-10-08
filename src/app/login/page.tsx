"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { BrandGoogle } from "@/components/auth-brands";
import { Flag } from "@/components/icons";
import { BrandMark } from "@/components/brand";
import { ScreenBack } from "@/components/back-button";
import { PhoneShell } from "@/components/shell";
import { LangSwitch } from "@/components/ui";
import { fetchGoogleClientId, isInAppBrowser } from "@/lib/google-login";
import { useApp } from "@/lib/store";

function LoginInner() {
  const { t, lang, user, ready, pendingPath, signInWithGoogle } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const boxRef = useRef<HTMLDivElement>(null);
  const arrivedSignedIn = useRef<boolean | null>(null);
  const signRef = useRef(signInWithGoogle);
  signRef.current = signInWithGoogle;
  const destRef = useRef("/");
  destRef.current = pendingPath || params.get("next") || "/";
  const [native, setNative] = useState(false);
  const [phase, setPhase] = useState<"loading" | "soon" | "button" | "webview">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (arrivedSignedIn.current === null) arrivedSignedIn.current = Boolean(user);
    if (arrivedSignedIn.current && user) router.replace(pendingPath || "/");
  }, [ready, user, pendingPath, router]);

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

        <div className="mt-6" data-testid="google-login">
          {error ? <p className="mb-2 text-[13px] leading-[1.45] text-accent">{error}</p> : null}
          {phase === "soon" ? (
            <button
              type="button"
              disabled
              className="flex h-10 w-full items-center justify-center rounded-full border border-line bg-white text-[15px] font-semibold text-muted"
            >
              {t.loginSoon}
            </button>
          ) : null}
          {phase === "webview" ? <p className="text-[13px] leading-[1.45] text-muted">{t.loginOpenInBrowser}</p> : null}
          {native && phase !== "soon" && phase !== "webview" ? (
            <button
              type="button"
              onClick={onNative}
              disabled={busy || phase === "loading"}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line bg-white text-[15px] font-semibold text-ink"
            >
              <BrandGoogle size={18} />
              {t.loginGoogle}
            </button>
          ) : null}
          {!native && phase !== "soon" && phase !== "webview" ? <div ref={boxRef} className="min-h-10 w-full" /> : null}
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
