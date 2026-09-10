"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandFacebook, BrandInstagram, BrandTelegram, BrandVk, BrandWhatsApp } from "@/components/auth-brands";
import { hasChannel } from "@/lib/channels";
import { listingTitle } from "@/lib/i18n";
import { listingPublicUrl, ownerShareText, socialShareHref } from "@/lib/share";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";

export function ShareToSocial({ listing }: { listing: Listing }) {
  const { t, lang, user } = useApp();
  const router = useRouter();
  const [toast, setToast] = useState("");

  const url = listingPublicUrl(listing.id);
  const text = ownerShareText(listing, t, lang, url);
  const title = listingTitle(listing, lang);

  const ping = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}`);
      ping(t.shareCopied);
    } catch {
      ping(url);
    }
  };

  const more = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copy();
  };

  const cell = (
    key: string,
    label: string,
    icon: ReactNode,
    onClick: () => void,
    linked?: boolean,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-[16px] px-2 py-3"
      style={{
        background: linked ? "#17140F" : "#FFFFFF",
        border: linked ? "none" : "1px solid #E4DCCE",
      }}
    >
      <span className="flex h-11 w-11 items-center justify-center">{icon}</span>
      <span className="text-[11px] font-semibold" style={{ color: linked ? "#F7F3EC" : "#17140F" }}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="w-full text-left">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.shareAfterTitle}</div>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.shareAfterHint}</p>
      {toast ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{toast}</p> : null}
      <button
        type="button"
        onClick={() => router.push(`/story/${listing.id}`)}
        className="mt-3 h-11 w-full rounded-[14px] bg-ink text-[13px] font-semibold text-screen"
      >
        {t.packOpen}
      </button>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {cell("wa", t.shareWa, <BrandWhatsApp size={28} />, () => {
          window.open(socialShareHref("whatsapp", listing, t, lang), "_blank", "noreferrer");
        }, hasChannel(user, "whatsapp"))}
        {cell("tg", t.shareTg, <BrandTelegram size={28} />, () => {
          window.open(socialShareHref("telegram", listing, t, lang), "_blank", "noreferrer");
        }, hasChannel(user, "telegram"))}
        {cell("ig", t.shareIg, <BrandInstagram size={28} />, () => router.push(`/story/${listing.id}`), hasChannel(user, "instagram"))}
        {cell("fb", t.shareFb, <BrandFacebook size={28} />, () => {
          window.open(socialShareHref("facebook", listing, t, lang), "_blank", "noreferrer");
        }, hasChannel(user, "facebook"))}
        {cell("vk", t.shareVk, <BrandVk size={28} />, () => {
          window.open(socialShareHref("vk", listing, t, lang), "_blank", "noreferrer");
        })}
        {cell("copy", t.shareCopyLink, <CopyMark />, copy)}
      </div>
      <button
        type="button"
        onClick={() => void more()}
        className="mt-2.5 h-11 w-full rounded-[14px] border border-line bg-chip text-[13px] font-semibold text-ink"
      >
        {t.shareMore}
      </button>
    </div>
  );
}

function CopyMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-screen">
      ↗
    </span>
  );
}
