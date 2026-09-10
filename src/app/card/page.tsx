"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Chip, Field, Input, RoundBtn } from "@/components/ui";
import { TrustStars } from "@/components/trust-stars";
import { useApp } from "@/lib/store";

export default function CardPage() {
  const { t, user, linkCard } = useApp();
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 12) {
      setError(t.cardNeed);
      return;
    }
    linkCard();
    router.replace("/profile");
  };

  return (
    <PhoneShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-8">
        <RoundBtn onClick={() => router.back()}>
          <IconBack size={16} color="#17140F" />
        </RoundBtn>
        <h1 className="mt-8 font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.cardTitle}</h1>
        <p className="mt-2 text-[15px] leading-[1.5] text-muted">{t.cardHint}</p>
        <div className="mt-3 flex items-center gap-2">
          <TrustStars n={3} />
          <span className="text-[13px] font-semibold text-ink">{t.trustPhoneCard}</span>
        </div>
        <p className="mt-3 text-[13px] text-muted-2">{t.cardDemo}</p>
        <div className="mt-4 flex gap-2">
          <Chip active>{t.cardElcart}</Chip>
          <Chip>{t.cardVisa}</Chip>
        </div>
        <div className="mt-5">
          <Field label={t.cardNumber}>
            <Input value={number} onChange={setNumber} placeholder="9860 12** **** 3456" />
          </Field>
        </div>
        {error ? <p className="mt-2 text-[13px] text-accent">{error}</p> : null}
        <button
          type="button"
          onClick={submit}
          disabled={!user || user.method !== "sms"}
          className="shadow-btn mt-8 flex h-14 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-on disabled:opacity-40"
        >
          {t.cardSave}
        </button>
      </div>
    </PhoneShell>
  );
}
