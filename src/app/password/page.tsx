"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Field, Input, RoundBtn } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { useApp } from "@/lib/store";

function PasswordInner() {
  const { t, login, pendingPath, setPendingPath } = useApp();
  const router = useRouter();
  const email = useSearchParams().get("email") || "";
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (password.trim().length < 6) {
      setError(t.passwordNeed);
      return;
    }
    if (password !== repeat) {
      setError(t.passwordMismatch);
      return;
    }
    login({
      method: "email",
      email,
      name: email.split("@")[0] || "Давран",
    });
    const next = pendingPath || "/";
    setPendingPath(null);
    router.replace(next);
  };

  return (
    <PhoneShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-8">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="mt-8 font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.mailLinkTitle}</h1>
        <p className="mt-2 text-[15px] leading-[1.5] text-muted">
          {t.mailLinkHint} {email}
        </p>
        <div className="mt-3 flex items-center gap-2 text-[13px] text-muted">
          <TrustStars n={0} />
          <span>{t.trustNone}</span>
        </div>
        <p className="mt-3 text-[13px] text-muted-2">{t.mailLinkDemo}</p>
        <div className="mt-6">
          <Field label={t.password}>
            <Input type="password" value={password} onChange={setPassword} placeholder={t.passwordPh} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={t.passwordRepeat}>
            <Input type="password" value={repeat} onChange={setRepeat} placeholder={t.passwordPh} />
          </Field>
        </div>
        {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
        <button
          type="button"
          onClick={submit}
          className="shadow-btn mt-8 flex h-14 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {t.confirm}
        </button>
      </div>
    </PhoneShell>
  );
}

export default function PasswordPage() {
  return (
    <Suspense>
      <PasswordInner />
    </Suspense>
  );
}
