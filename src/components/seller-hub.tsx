"use client";

import { useRouter } from "next/navigation";
import { BrandFacebook, BrandInstagram, BrandTelegram, BrandWhatsApp } from "@/components/auth-brands";
import { hasChannel } from "@/lib/channels";
import { useApp } from "@/lib/store";
import { SELLER_CHANNELS, type SellerChannel } from "@/lib/types";
import type { ReactNode } from "react";

const ICONS: Record<SellerChannel, ReactNode> = {
  instagram: <BrandInstagram size={22} />,
  facebook: <BrandFacebook size={22} />,
  telegram: <BrandTelegram size={22} />,
  whatsapp: <BrandWhatsApp size={22} />,
};

export function SellerHub({ highlight }: { highlight?: SellerChannel }) {
  const { t, user } = useApp();
  const router = useRouter();
  const phone = user?.phone ?? t.channelHubGuest;

  return (
    <div className="rounded-[18px] border border-line bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.channelsOnAccount}</div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.channelsOnHint}</p>
      <div className="mt-3 rounded-[14px] bg-chip px-3.5 py-3 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t.channelPhoneLabel}</div>
        <div className="mt-1 font-display text-[18px] font-bold text-ink">{phone}</div>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {SELLER_CHANNELS.map((id) => {
          const on = hasChannel(user, id);
          const glow = highlight === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => router.push(`/from/${id}`)}
              className="flex flex-col items-center gap-1 rounded-[14px] px-1 py-2"
              style={{
                background: on ? "#17140F" : glow ? "#F3E0D9" : "#FFFDF8",
                border: glow && !on ? "1.5px solid #B8452F" : "1px solid #E4DCCE",
              }}
            >
              <span className="flex h-7 w-7 items-center justify-center">{ICONS[id]}</span>
              <span
                className="text-[9px] font-semibold leading-tight"
                style={{ color: on ? "#F7F3EC" : "#17140F" }}
              >
                {t.authMethods[id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
