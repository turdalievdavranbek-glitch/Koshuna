"use client";

import { useRouter } from "next/navigation";
import { BrandFacebook, BrandInstagram, BrandTelegram, BrandWhatsApp } from "@/components/auth-brands";
import { useApp } from "@/lib/store";
import { SELLER_CHANNELS, type SellerChannel } from "@/lib/types";
import type { ReactNode } from "react";

const ICONS: Record<SellerChannel, (size: number) => ReactNode> = {
  instagram: (size) => <BrandInstagram size={size} />,
  facebook: (size) => <BrandFacebook size={size} />,
  telegram: (size) => <BrandTelegram size={size} />,
  whatsapp: (size) => <BrandWhatsApp size={size} />,
};

export function KonshuBridges() {
  const { t } = useApp();
  const router = useRouter();
  const labels: Record<SellerChannel, { title: string; hint: string }> = {
    instagram: { title: t.bridgeIg, hint: t.bridgeIgHint },
    facebook: { title: t.bridgeFb, hint: t.bridgeFbHint },
    telegram: { title: t.bridgeTg, hint: t.bridgeTgHint },
    whatsapp: { title: t.bridgeWa, hint: t.bridgeWaHint },
  };

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.bridgesTitle}</div>
      <p className="mt-1.5 text-[12px] leading-[1.4] text-muted">{t.bridgesLine}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {SELLER_CHANNELS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => router.push(`/from/${id}`)}
            className="rounded-[16px] border border-line bg-surface px-2.5 py-3 text-left"
          >
            <span className="flex h-7 w-7 items-center justify-center">{ICONS[id](22)}</span>
            <div className="mt-2 text-[15px] font-bold leading-[1.15] text-ink">{labels[id].title}</div>
            <p className="mt-1 text-[11px] leading-[1.3] text-muted">{labels[id].hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
