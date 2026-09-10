"use client";

import { useRouter } from "next/navigation";
import {
  BrandFacebook,
  BrandGoogle,
  BrandInstagram,
  BrandTelegram,
  BrandWhatsApp,
} from "@/components/auth-brands";
import { useApp } from "@/lib/store";
import { SELLER_CHANNELS, type SellerChannel } from "@/lib/types";
import type { ReactNode } from "react";

const ICONS: Record<SellerChannel, (size: number) => ReactNode> = {
  instagram: (size) => <BrandInstagram size={size} />,
  facebook: (size) => <BrandFacebook size={size} />,
  telegram: (size) => <BrandTelegram size={size} />,
  whatsapp: (size) => <BrandWhatsApp size={size} />,
};

const CHANNEL_LABELS: Record<SellerChannel, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
};

export function KonshuBridges() {
  const { t } = useApp();
  const router = useRouter();

  const tiles: { key: string; label: string; icon: (size: number) => ReactNode; onClick: () => void }[] = [
    ...SELLER_CHANNELS.map((id) => ({
      key: id,
      label: CHANNEL_LABELS[id],
      icon: ICONS[id],
      onClick: () => router.push(`/from/${id}`),
    })),
    {
      key: "google",
      label: "Google",
      icon: (size: number) => <BrandGoogle size={size} />,
      onClick: () => router.push("/login"),
    },
  ];

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.bridgesTitle}</div>
      <p className="mt-1.5 text-[12px] leading-[1.4] text-muted">{t.bridgesLine}</p>
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={tile.onClick}
            className="flex flex-col items-center gap-1.5 rounded-[12px] border border-line bg-surface px-1 py-2.5"
          >
            <span className="flex h-6 w-6 items-center justify-center">{tile.icon(22)}</span>
            <span className="text-center text-[10px] font-semibold leading-[1.1] text-ink">{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
