"use client";

import { useRouter } from "next/navigation";
import { BrandFacebook, BrandInstagram, BrandTelegram, BrandWhatsApp } from "@/components/auth-brands";
import { isAbroad } from "@/lib/strategy";
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
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.bridgesTitle}</div>
        <button
          type="button"
          onClick={() => router.push("/strategy")}
          className="text-[11px] font-semibold text-accent"
        >
          {t.strategyNav}
        </button>
      </div>
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

export function AbroadBanner() {
  const { t, viewerPlace } = useApp();
  const router = useRouter();
  if (!isAbroad(viewerPlace)) return null;
  return (
    <button
      type="button"
      onClick={() => router.push("/strategy")}
      className="mt-3 w-full rounded-[18px] border border-line bg-white px-4 py-3.5 text-left"
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">
        {t.viewerWhere}: {t.viewerPlaces[viewerPlace]}
      </div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.abroadBannerBody}</p>
      <span className="mt-2 inline-block text-[12px] font-semibold text-accent">{t.strategyNav} ›</span>
    </button>
  );
}
