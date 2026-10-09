"use client";

import { useState } from "react";
import { formatSom } from "@/lib/data";
import { listingHasPrice } from "@/lib/deal";
import { listingTitle } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/open-graph";
import { cardShareText, listingPlace, listingPublicUrl } from "@/lib/share";
import { shopHasPointPlace, shopPlaceHeadline } from "@/lib/shops";
import { shopPublicUrl } from "@/lib/shop-share";
import { renderStoriesCard, shareFileSupported } from "@/lib/stories-card";
import { useApp } from "@/lib/store";
import type { Listing, Shop } from "@/lib/types";
import { IconShare } from "./icons";

type Props = {
  listing?: Listing;
  shop?: Shop;
  variant?: "icon" | "button";
  /** Share the site itself (https://koshuna.ru), not a listing. */
  appTitle?: string;
};

export function ShareButton({ listing, shop, variant = "button", appTitle }: Props) {
  const { t, lang, shops } = useApp();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const sharingApp = Boolean(appTitle) && !listing && !shop;
  const url = listing ? listingPublicUrl(listing.id) : shop ? shopPublicUrl(shop.id) : sharingApp ? SITE_ORIGIN : "";
  const title = listing ? listingTitle(listing, lang) : shop?.name || appTitle || t.share;
  const point = listing?.shopId ? shops.find((item) => item.id === listing.shopId) : undefined;
  const place = listing
    ? listingPlace(listing, t, lang)
    : shop
      ? shopHasPointPlace(shop)
        ? shopPlaceHeadline(shop, t.cities[shop.city] || shop.city, lang)
        : t.cities[shop.city] || shop.city
      : "";
  const storiesPlace = point?.name || place;
  const price = listing ? (listingHasPrice(listing) ? `${formatSom(listing.price)} KGS` : t.priceNegotiable) : "";
  const text = cardShareText({ title, price, place, url });

  const ping = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      ping(t.shareCopied);
    } catch {
      ping(url);
    }
  };

  const stories = async () => {
    if (!listing) return;
    setBusy(true);
    try {
      const blob = await renderStoriesCard({
        photoSrc: listing.photos[0],
        videoSrc: listing.videoUrl,
        title,
        price,
        place: storiesPlace || t.cities[listing.city] || "",
      });
      const file = new File([blob], `koshuna-${listing.id}.jpg`, { type: "image/jpeg" });
      if (shareFileSupported() && navigator.share) {
        try {
          await navigator.share({ files: [file], title });
          setOpen(false);
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(href);
      ping(t.shareStories);
    } catch {
      ping(t.packNeedPhoto);
    } finally {
      setBusy(false);
    }
  };

  const control =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => void share()}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/94"
        aria-label={t.share}
      >
        <IconShare size={17} color="#17140F" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void share()}
        className="flex h-[54px] flex-1 items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink"
      >
        {t.share}
      </button>
    );

  return (
    <>
      {control}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(23,20,15,.45)]" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-[430px] rounded-t-[24px] bg-white px-5 pb-8 pt-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-display text-[20px] font-bold text-ink">{t.share}</div>
            {toast ? <p className="mt-2 text-[13px] font-semibold text-success-ink">{toast}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center rounded-2xl bg-success text-[15px] font-semibold text-screen"
              >
                {t.shareWa}
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center rounded-2xl border border-line text-[15px] font-semibold text-ink"
              >
                {t.shareTg}
              </a>
              <button type="button" onClick={() => void copy()} className="h-12 rounded-2xl border border-line text-[15px] font-semibold text-ink">
                {t.shareCopyLink}
              </button>
              {listing ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void stories()}
                  className="h-12 rounded-2xl bg-ink text-[15px] font-semibold text-screen disabled:opacity-60"
                >
                  {t.shareStories}
                </button>
              ) : null}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 h-12 w-full text-[15px] font-semibold text-muted">
              {t.cardDeleteCancel}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
