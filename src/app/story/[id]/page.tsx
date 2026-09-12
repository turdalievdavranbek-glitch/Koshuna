"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandFacebook, BrandInstagram, BrandTelegram, BrandWhatsApp } from "@/components/auth-brands";
import { BrandMark } from "@/components/brand";
import { IconBack } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Photo } from "@/components/ui";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { isFromNeighbor } from "@/lib/neighbor";
import { listingPlace, listingPublicUrl, ownerShareText, socialShareHref } from "@/lib/share";
import { useApp } from "@/lib/store";
import { isVideoListing } from "@/lib/video-ai";
import { shareFileSupported, watermarkFeedStill, watermarkVideoFrame } from "@/lib/watermark";

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, allListings } = useApp();
  const listing = allListings.find((l) => l.id === id);
  const [toast, setToast] = useState("");
  const [packUrl, setPackUrl] = useState<string | null>(null);
  const [packBlob, setPackBlob] = useState<Blob | null>(null);
  const [packError, setPackError] = useState(false);
  const held = useRef<string | null>(null);

  useEffect(() => {
    if (!listing) return;
    let gone = false;
    const src = listing.photos[0];
    const video = isVideoListing(listing) ? listing.videoUrl : undefined;
    const run = async () => {
      try {
        const blob = video
          ? await watermarkVideoFrame(video).catch(() => watermarkFeedStill(src))
          : await watermarkFeedStill(src);
        if (gone) return;
        const url = URL.createObjectURL(blob);
        if (held.current) URL.revokeObjectURL(held.current);
        held.current = url;
        setPackUrl(url);
        setPackBlob(blob);
      } catch {
        if (!gone) setPackError(true);
      }
    };
    void run();
    return () => {
      gone = true;
      if (held.current) URL.revokeObjectURL(held.current);
      held.current = null;
    };
  }, [listing]);

  if (!listing) {
    return (
      <PhoneShell>
        <div className="p-6">{t.empty}</div>
      </PhoneShell>
    );
  }

  const title = listingTitle(listing, lang);
  const unit = listing.unit ? t.units[listing.unit] : "";
  const url = listingPublicUrl(listing.id);
  const postText = ownerShareText(listing, t, lang, url);
  const video = isVideoListing(listing) && listing.videoUrl;

  const ping = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      ping(t.storyCopied);
    } catch {
      ping(url);
    }
  };

  const download = () => {
    if (!packUrl) return;
    const a = document.createElement("a");
    a.href = packUrl;
    a.download = `koshuna-${listing.id}.jpg`;
    a.click();
    ping(t.packDownloaded);
  };

  const shareNative = async () => {
    const file =
      packBlob && shareFileSupported()
        ? new File([packBlob], `koshuna-${listing.id}.jpg`, { type: "image/jpeg" })
        : null;
    if (navigator.share) {
      try {
        await navigator.share(
          file ? { title, text: postText, files: [file] } : { title, text: postText, url },
        );
        return;
      } catch {
        /* cancelled */
      }
    }
    download();
    await copy();
  };

  return (
    <PhoneShell>
      <div className="sc flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-1">
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
          >
            <IconBack size={16} color="#17140F" />
          </button>
          <span className="font-display text-[15px] font-bold text-ink">{t.packTitle}</span>
          <span className="w-9" />
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-ink">
          {video ? (
            <video
              src={listing.videoUrl}
              poster={listing.photos[0]}
              autoPlay
              controls
              playsInline
              className="aspect-[4/5] w-full object-cover"
            />
          ) : packUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={packUrl} alt="" className="aspect-[4/5] w-full object-cover" />
          ) : (
            <Photo src={listing.photos[0]} alt={title} className="aspect-[4/5] w-full object-cover opacity-80" />
          )}
          {!video && !packUrl ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,20,15,.92)] via-transparent to-transparent" />
              <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                <BrandMark size={22} wordClass="text-[18px] text-white" />
                {isFromNeighbor(listing) ? (
                  <span className="rounded-full bg-[#E7F3ED] px-2.5 py-1 text-[11px] font-bold text-success">{t.fromNeighbor}</span>
                ) : null}
              </div>
              <div className="absolute inset-x-4 bottom-5 text-white">
                <div className="text-[12px] font-semibold tracking-wide text-white/80">{listingPlace(listing, t, lang)}</div>
                <div className="mt-1 font-display text-[22px] font-bold leading-[1.15]">{title}</div>
                <div className="mt-2 font-display text-[24px] font-extrabold text-[#F4C7B8]">
                  {formatSom(listing.price)} KGS
                  {unit ? <span className="ml-1 text-[14px] font-semibold text-white/70">{unit}</span> : null}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => router.push(`/listing/${listing.id}`)}
          className="mt-3 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
        >
          {t.viewListing}
        </button>
        <p className="mt-3 text-[13px] leading-[1.45] text-muted">{t.packHow}</p>
        {video ? <p className="mt-1.5 text-[12px] leading-[1.4] text-muted-2">{t.packVideoNote}</p> : null}
        {packError ? <p className="mt-1.5 text-[12px] text-accent">{t.packFail}</p> : null}
        {packUrl ? <p className="mt-1.5 text-[12px] font-semibold text-success-ink">{t.packReady}</p> : null}

        <button
          type="button"
          onClick={download}
          disabled={!packUrl}
          className="shadow-btn mt-3 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on disabled:opacity-40"
        >
          {t.packDownload}
        </button>
        <button
          type="button"
          onClick={() => void shareNative()}
          className="mt-2 h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-screen"
        >
          {t.packSharePage}
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => window.open(socialShareHref("whatsapp", listing, t, lang), "_blank", "noreferrer")}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-line bg-white text-[12px] font-semibold"
          >
            <BrandWhatsApp size={18} />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => window.open(socialShareHref("telegram", listing, t, lang), "_blank", "noreferrer")}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-line bg-white text-[12px] font-semibold"
          >
            <BrandTelegram size={18} />
            Telegram
          </button>
          <button
            type="button"
            onClick={() => void shareNative()}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-line bg-white text-[12px] font-semibold"
          >
            <BrandInstagram size={18} />
            Stories
          </button>
          <button
            type="button"
            onClick={() => window.open(socialShareHref("facebook", listing, t, lang), "_blank", "noreferrer")}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-line bg-white text-[12px] font-semibold"
          >
            <BrandFacebook size={18} />
            Facebook
          </button>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-2 h-11 w-full rounded-2xl border border-line bg-white text-[13px] font-semibold text-ink"
        >
          {t.storyCopy}
        </button>
        {toast ? <div className="mt-2 text-center text-[12px] font-semibold text-accent-dark">{toast}</div> : null}
      </div>
    </PhoneShell>
  );
}
