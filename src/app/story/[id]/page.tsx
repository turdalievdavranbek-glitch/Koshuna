"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { isFromNeighbor } from "@/lib/neighbor";
import { listingPlace, storyCaption } from "@/lib/share";
import { useApp } from "@/lib/store";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo } from "@/components/ui";

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, allListings } = useApp();
  const listing = allListings.find((l) => l.id === id);
  const [toast, setToast] = useState("");

  if (!listing) {
    return (
      <PhoneShell>
        <div className="p-6">{t.empty}</div>
      </PhoneShell>
    );
  }

  const title = listingTitle(listing, lang);
  const caption = storyCaption(listing, t, lang);
  const unit = listing.unit ? t.units[listing.unit] : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setToast(t.storyCopied);
    } catch {
      setToast(caption);
    }
    setTimeout(() => setToast(""), 1800);
  };

  const share = async () => {
    const url = `${window.location.origin}/listing/${listing.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: caption, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await copy();
  };

  return (
    <PhoneShell>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-1">
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
          >
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="font-display text-[15px] font-bold text-ink">{t.storyTitle}</span>
          <span className="w-9" />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[24px] bg-ink">
          <Photo src={listing.photos[0]} alt={title} className="h-full min-h-[420px] object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,20,15,.92)] via-[rgba(23,20,15,.25)] to-transparent" />
          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <span className="font-display text-[18px] font-extrabold text-white">
              konshu<span className="text-accent">●</span>
            </span>
            {isFromNeighbor(listing) ? (
              <span className="rounded-full bg-[#E7F3ED] px-2.5 py-1 text-[11px] font-bold text-success">{t.fromNeighbor}</span>
            ) : null}
          </div>
          <div className="absolute inset-x-4 bottom-5 text-white">
            <div className="text-[12px] font-semibold tracking-wide text-white/80">{listingPlace(listing, t, lang)}</div>
            <div className="mt-1 font-display text-[26px] font-bold leading-[1.15]">{title}</div>
            <div className="mt-2 font-display text-[28px] font-extrabold text-[#F4C7B8]">
              {formatSom(listing.price)} KGS
              {unit ? <span className="ml-1 text-[14px] font-semibold text-white/70">{unit}</span> : null}
            </div>
            <p className="mt-2 text-[12px] leading-[1.4] text-white/75">{t.storyWatermark}</p>
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-[1.45] text-muted">{t.storyHow}</p>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="h-[48px] flex-1 rounded-2xl border border-line bg-white text-[14px] font-semibold text-ink"
          >
            {t.storyCopy}
          </button>
          <button
            type="button"
            onClick={share}
            className="shadow-btn h-[48px] flex-1 rounded-2xl bg-accent text-[14px] font-semibold text-accent-on"
          >
            {t.storyShare}
          </button>
        </div>
        {toast ? <div className="mt-2 text-center text-[12px] font-semibold text-accent-dark">{toast}</div> : null}
      </div>
    </PhoneShell>
  );
}
