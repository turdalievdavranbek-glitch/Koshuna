"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { phoneDigits } from "@/lib/phone";
import { useApp } from "@/lib/store";
import { ScreenBack } from "@/components/back-button";
import { IconPhone, IconWa } from "@/components/icons";
import { PhoneShell } from "@/components/shell";

function SoonBody() {
  const params = useSearchParams();
  const listingId = params.get("listing") || "";
  const { t, user } = useApp();
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !listingId) {
      setPhone(null);
      return;
    }
    let cancel = false;
    void api<{ phone?: string | null }>(`/api/listings/${encodeURIComponent(listingId)}/contact`).then((res) => {
      if (!cancel) setPhone(res.ok ? res.data?.phone || null : null);
    });
    return () => {
      cancel = true;
    };
  }, [user, listingId]);

  return (
    <PhoneShell>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        <ScreenBack fallback={listingId ? `/listing/${listingId}` : "/"} />
        <h1 className="mt-4 font-display text-[26px] font-bold leading-[1.15] text-ink">{t.chatSoonTitle}</h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-2">{t.chatSoonBody}</p>
        {phone ? (
          <div className="mt-5 flex gap-2">
            <a
              href={`tel:${phone}`}
              className="shadow-btn flex h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-base font-semibold text-screen"
            >
              <IconPhone size={19} color="#F7F3EC" />
              {t.callNow}
            </a>
            <a
              href={`https://wa.me/${phoneDigits(phone)}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-success"
            >
              <IconWa size={19} color="#F7F3EC" />
            </a>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => router.push(listingId ? `/listing/${listingId}` : "/")}
          className="mt-4 h-12 w-full rounded-2xl border border-line text-[15px] font-semibold"
        >
          {t.backLeave}
        </button>
      </div>
    </PhoneShell>
  );
}

export default function ChatSoonPage() {
  return (
    <Suspense fallback={null}>
      <SoonBody />
    </Suspense>
  );
}
