"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Flag } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { LangSwitch } from "@/components/ui";
import { useApp } from "@/lib/store";

function LoginInner() {
  const { t, setPendingPath } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");

  const go = () => {
    const next = params.get("next");
    if (next) setPendingPath(next);
    const q = phone.replace(/\D/g, "") || "555123456";
    router.push(`/otp?phone=${q}`);
  };

  return (
    <PhoneShell>
      <div className="sc flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-8 pt-4">
        <LangSwitch />
        <div className="mt-11 flex items-center gap-2.5">
          <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.02em] text-ink">
            konshu<span className="text-accent">●</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
            <Flag />
            <span className="text-xs font-semibold text-ink">{t.country}</span>
          </span>
        </div>
        <div className="ornament mt-[18px]" />
        <div className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-dark">{t.eyebrow}</div>
        <h1 className="mt-[26px] font-display text-[29px] font-bold leading-[1.12] tracking-[-0.01em] text-ink whitespace-pre-line">
          {t.loginTitle}
        </h1>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-muted">{t.slogan}</p>
        <p className="mt-3.5 text-[15px] leading-[1.5] text-muted">{t.loginHint}</p>

        <label className="mt-[34px] block text-[13px] font-semibold text-ink">{t.phone}</label>
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
          onClick={go}
          className="shadow-btn mt-3.5 flex h-14 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {t.getCode}
        </button>

        <div className="mt-[26px] flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-muted-2">{t.or}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={go}
            className="flex h-[52px] items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
          >
            {t.google}
          </button>
          <button
            type="button"
            onClick={go}
            className="flex h-[52px] items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
          >
            {t.apple}
          </button>
        </div>

        <div className="mt-[26px] rounded-[14px] border border-line bg-chip px-4 py-3.5 text-[13px] leading-[1.5] text-muted">
          {t.loginNote}
        </div>
        <Link href="/" className="mt-4 text-center text-[13px] font-semibold text-accent no-underline">
          {t.skipCatalog}
        </Link>
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
