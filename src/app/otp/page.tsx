"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { RoundBtn } from "@/components/ui";
import { useApp } from "@/lib/store";

function OtpInner() {
  const { t, login, pendingPath, setPendingPath } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") || "555123456";
  const display = phone.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const submit = (code = digits.join("")) => {
    if (code.replace(/\D/g, "").length < 4) return;
    login(display);
    const next = pendingPath || "/";
    setPendingPath(null);
    router.replace(next);
  };

  return (
    <PhoneShell>
      <div className="flex min-h-0 flex-1 flex-col px-7 pb-8">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="mt-8 font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.otpTitle}</h1>
        <p className="mt-2 text-[15px] leading-[1.5] text-muted">
          {t.otpHint} +996 {display}
        </p>
        <p className="mt-2 text-[13px] text-muted-2">{t.otpAny}</p>
        <div className="mt-8 flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                const next = [...digits];
                next[i] = v;
                setDigits(next);
                if (v && i < 5) refs.current[i + 1]?.focus();
                if (next.every(Boolean)) submit(next.join(""));
              }}
              className="h-14 w-12 rounded-2xl border border-line bg-white text-center font-display text-[22px] font-bold text-ink outline-none"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => submit()}
          className="shadow-btn mt-8 flex h-14 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {t.confirm}
        </button>
        <button type="button" className="mt-4 text-[13px] font-semibold text-accent">
          {t.resend}
        </button>
      </div>
    </PhoneShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpInner />
    </Suspense>
  );
}
