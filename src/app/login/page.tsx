"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { brandMark } from "@/components/auth-brands";
import { Flag } from "@/components/icons";
import { BrandMark } from "@/components/brand";
import { PhoneShell } from "@/components/shell";
import { Chip, LangSwitch } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { useApp } from "@/lib/store";
import type { AuthMethod } from "@/lib/types";

const SOCIAL: AuthMethod[] = ["google", "facebook", "apple"];
const MESSENGERS: AuthMethod[] = ["whatsapp", "telegram", "instagram", "vk"];

function LoginInner() {
  const { t, setPendingPath, login, pendingPath } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const rememberNext = () => {
    const next = params.get("next");
    if (next) setPendingPath(next);
  };

  const goCode = (via: "sms" | "email" | "whatsapp" | "telegram") => {
    rememberNext();
    setError("");
    if (via === "email") {
      const value = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setError(t.emailInvalid);
        return;
      }
      router.push(`/password?email=${encodeURIComponent(value)}`);
      return;
    }
    const q = phone.replace(/\D/g, "") || "555123456";
    router.push(`/otp?via=${via}&phone=${q}`);
  };

  const goSocial = (method: AuthMethod) => {
    const next = params.get("next") || pendingPath || "/";
    if (method === "whatsapp" || method === "telegram") {
      if (next !== "/") setPendingPath(next);
      goCode(method);
      return;
    }
    login({
      method,
      name: "Давран",
      phone: "+996 555 12 34 56",
      email: method === "google" ? "davran@gmail.com" : undefined,
    });
    setPendingPath(null);
    router.replace(next);
  };

  return (
    <PhoneShell>
      <div className="sc flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-8 pt-4">
        <LangSwitch />
        <div className="mt-8">
          <BrandMark size={40} wordClass="text-[32px] leading-none text-ink" />
          <div className="mt-3 flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 w-fit">
            <Flag size={16} />
            <span className="text-xs font-semibold text-ink">{t.country}</span>
          </div>
        </div>
        <div className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-dark">{t.eyebrow}</div>
        <h1 className="mt-5 font-display text-[26px] font-bold leading-[1.12] tracking-[-0.01em] text-ink whitespace-pre-line">
          {t.loginTitle}
        </h1>
        <p className="mt-2.5 font-display text-[17px] font-bold leading-[1.3] text-accent-dark">{t.slogan}</p>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-muted">{t.loginHint}</p>
        <Link
          href="/"
          className="mt-4 flex h-12 items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink no-underline"
        >
          {t.skipCatalog}
        </Link>

        <div className="mt-5 rounded-[18px] border border-line bg-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.trustHow}</div>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-ink">{t.trustLead}</p>
          <div className="mt-3 flex flex-col gap-2">
            {[
              [0, t.trustNone],
              [1, t.trustSocial],
              [2, t.trustPhone],
              [3, t.trustPhoneCard],
            ].map(([n, label]) => (
              <div key={String(n)} className="flex items-start gap-2">
                <TrustStars n={Number(n)} size={13} className="mt-[1px] shrink-0" />
                <span className="text-[13px] leading-[1.4] text-muted">{label as string}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Chip active={mode === "phone"} onClick={() => setMode("phone")}>
            {t.authPhone}
          </Chip>
          <Chip active={mode === "email"} onClick={() => setMode("email")}>
            {t.authEmail}
          </Chip>
        </div>

        {mode === "phone" ? (
          <>
            <label className="mt-4 block text-[13px] font-semibold text-ink">{t.phone}</label>
            <div className="mt-2 flex h-14 items-center gap-2.5 rounded-2xl border border-line bg-white px-4">
              <span className="text-[17px] font-semibold text-ink">+996</span>
              <span className="block h-[22px] w-px bg-line" />
              <input
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))}
                placeholder="555 12 34 56"
                className="h-full flex-1 bg-transparent text-[17px] tracking-wide text-ink outline-none placeholder:text-muted-2"
              />
            </div>
            <button
              type="button"
              onClick={() => goCode("sms")}
              className="shadow-btn mt-3.5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-accent-on"
            >
              {t.getCode}
              <TrustStars n={2} size={13} onDark />
            </button>
          </>
        ) : (
          <>
            <label className="mt-4 block text-[13px] font-semibold text-ink">{t.email}</label>
            <div className="mt-2 flex h-14 items-center rounded-2xl border border-line bg-white px-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@mail.com"
                className="h-full w-full bg-transparent text-[17px] text-ink outline-none placeholder:text-muted-2"
              />
            </div>
            <button
              type="button"
              onClick={() => goCode("email")}
              className="shadow-btn mt-3.5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-accent-on"
            >
              {t.getEmailLink}
              <TrustStars n={0} size={13} onDark />
            </button>
          </>
        )}
        {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}

        <div className="mt-5 rounded-[14px] border border-line bg-chip px-4 py-3.5 text-[13px] leading-[1.5] text-muted">
          {t.loginDemo}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-muted-2">{t.or}</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{t.authVia}</p>
        <div className="mt-2.5 grid grid-cols-1 gap-2">
          {SOCIAL.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => goSocial(id)}
              className="flex h-12 items-center gap-3 rounded-2xl border border-line bg-white px-4 text-left text-[15px] font-semibold text-ink"
            >
              {brandMark(id, 20)}
              <span className="flex-1">{t.continueWith(t.authMethods[id])}</span>
              <TrustStars n={1} size={12} />
            </button>
          ))}
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{t.messengersKg}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {MESSENGERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => goSocial(id)}
              className="flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-white px-3 text-left text-[13px] font-semibold text-ink"
            >
              {brandMark(id, 18)}
              <span className="flex-1">{t.authMethods[id]}</span>
              <TrustStars n={1} size={12} />
            </button>
          ))}
        </div>
        <p className="mt-auto pt-[22px] text-center text-xs leading-[1.5] text-muted-2">
          {t.terms}{" "}
          <Link href="/help" className="text-accent">
            {t.termsLink}
          </Link>
          {" · "}
          <Link href="/help" className="text-accent">
            {t.privacyLink}
          </Link>
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
