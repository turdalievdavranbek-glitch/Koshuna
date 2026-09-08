"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { formatSom, ownerById } from "@/lib/data";
import { listingDesc, listingTitle } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { IconBack, IconChat, IconHeart, IconPhone, IconPin, IconShare, IconTg, IconWa } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { Eyebrow, Photo } from "@/components/ui";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, allListings, isFav, toggleFav, user, setPendingPath, ensureThread } = useApp();
  const listing = allListings.find((l) => l.id === id);
  const [photo, setPhoto] = useState(0);
  const [toast, setToast] = useState("");

  if (!listing) {
    return (
      <PhoneShell>
        <div className="p-6">{t.empty}</div>
      </PhoneShell>
    );
  }

  const owner = ownerById(listing.ownerId);
  const title = listingTitle(listing, lang);
  const gate = (path: string) => {
    if (!user) {
      setPendingPath(path);
      router.push("/login");
      return false;
    }
    return true;
  };

  const onFav = () => {
    if (!gate(`/listing/${listing.id}`)) return;
    toggleFav(listing.id);
  };

  const onChat = () => {
    if (!gate(`/chat/${listing.id}`)) return;
    const tid = ensureThread(listing.id);
    router.push(`/chat/${tid}`);
  };

  return (
    <PhoneShell>
      <div className="sc relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative bg-ink" style={{ height: listing.section === "secondhand" ? 300 : 320 }}>
          <Photo src={listing.photos[photo] ?? listing.photos[0]} alt={title} />
          <div className="absolute left-[18px] right-[18px] top-[12px] flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/94"
            >
              <IconBack size={17} color="#17140F" />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const text = `${t.shareText}: ${title}`;
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setToast(t.copied);
                  } catch {
                    setToast(text);
                  }
                  setTimeout(() => setToast(""), 1600);
                }}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/94"
              >
                <IconShare size={17} color="#17140F" />
              </button>
              <button
                type="button"
                onClick={onFav}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/94"
              >
                <IconHeart size={18} color="#B8452F" filled={isFav(listing.id)} />
              </button>
            </div>
          </div>
          <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-[rgba(23,20,15,.72)] px-[11px] py-1 text-xs font-semibold text-screen">
            {photo + 1} / {listing.photos.length}
          </span>
        </div>

        {listing.photos.length > 1 ? (
          <div className="flex gap-2 px-5 pt-3">
            {listing.photos.slice(0, 3).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setPhoto(i)}
                className="h-[60px] w-[60px] overflow-hidden rounded-xl"
                style={{ border: i === photo ? "2px solid #B8452F" : "1px solid #E4DCCE" }}
              >
                <Photo src={src} alt="" />
              </button>
            ))}
            {listing.photos.length > 3 ? (
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-xl border border-line bg-chip text-[13px] font-semibold text-muted">
                +{listing.photos.length - 3}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="px-5 pt-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-chip px-[11px] py-1 text-xs font-semibold text-muted">
              {listing.section === "secondhand" && listing.category
                ? t.cats[listing.category]
                : t.sectionNames[listing.section]}
            </span>
            {listing.condition ? (
              <span className="rounded-full bg-success-tint px-[11px] py-1 text-xs font-bold text-success">
                {t.conditions[listing.condition]}
              </span>
            ) : (
              <span className="text-xs text-muted-2">
                {t.cities[listing.city]} · {t.sample}
              </span>
            )}
          </div>
          <h1 className="mt-3.5 font-display text-[26px] font-bold leading-[1.14] tracking-[-0.015em] text-ink">
            {title}
          </h1>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <IconPin size={14} color="#B8452F" />
            {listing.district ? `${t.cities[listing.city]}, ${listing.district}` : `${t.cities[listing.city]} · ${t.ago[listing.postedAgo]}`}
          </div>
          <div className="mt-4">
            <span className="font-display text-[32px] font-extrabold tracking-[-0.02em] text-accent">
              {formatSom(listing.price)} KGS
            </span>
            {listing.unit ? <span className="ml-2 text-sm text-muted">{t.units[listing.unit]}</span> : null}
          </div>
          {listing.utilitiesNote ? <div className="mt-1 text-[13px] text-muted-2">{t.utilities}</div> : null}

          {listing.rooms ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                [String(listing.rooms), t.roomWord],
                [String(listing.area), "м²"],
                ["мес", t.monthRent],
              ].map(([v, l]) => (
                <div key={l} className="rounded-[14px] border border-line bg-white px-3 py-3">
                  <div className="font-display text-[19px] font-bold text-ink">{v}</div>
                  <div className="mt-0.5 text-xs text-muted">{l}</div>
                </div>
              ))}
            </div>
          ) : null}

          {listing.specs ? (
            <div className="mt-[22px] overflow-hidden rounded-[18px] border border-line bg-white">
              {listing.specs.map((row, i) => (
                <div
                  key={row.label}
                  className="flex justify-between px-4 py-3.5 text-sm"
                  style={{ borderTop: i ? "1px solid #EFE8DB" : undefined }}
                >
                  <span className="text-muted">{t.spec[row.label] ?? row.label}</span>
                  <span className="font-semibold text-ink">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            <Eyebrow>{t.description}</Eyebrow>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-ink-2">{listingDesc(listing, lang)}</p>
            <p className="mt-2.5 text-xs leading-[1.5] text-muted-2">{t.disclaimer.split(".")[0]}.</p>
          </div>

          {owner ? (
            <button
              type="button"
              onClick={() => router.push(`/owner/${owner.id}`)}
              className="mt-6 flex w-full items-center gap-3 rounded-[18px] border border-line bg-white p-4 text-left"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full font-display text-xl font-bold text-screen"
                style={{ background: owner.color === "ink" ? "#17140F" : "#8E3423" }}
              >
                {owner.initial}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-semibold text-ink">{owner.name}</span>
                  {owner.verified ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-bold text-success">
                      {t.verified}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[13px] text-muted">
                  {owner.replyTime
                    ? `${t.onKonshu} ${owner.since} · ${owner.replyTime}`
                    : `${owner.listingsCount} ${t.nListingsOwner} · ${t.rating} ${owner.rating}`}
                </div>
              </div>
              <span className="text-[13px] font-semibold text-accent">{t.ownerProfile}</span>
            </button>
          ) : null}

          <div className="mt-3 rounded-[18px] bg-accent-tint p-4">
            <div className="text-[15px] font-bold text-accent-dark">{t.meetSafe}</div>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-safe">
              {listing.safetyKind === "home" ? t.meetHome : t.meetGoods}
            </p>
          </div>
          <div className="h-[120px]" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-line bg-[rgba(247,243,236,.96)] px-5 pb-[26px] pt-3.5">
        <button
          type="button"
          onClick={onChat}
          className="shadow-btn flex h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          <IconChat size={18} color="#FFF7F0" />
          {listing.section === "secondhand" ? t.writeSeller : t.write}
        </button>
        <a
          href={`tel:+996555123456`}
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              gate(`/listing/${listing.id}`);
            }
          }}
          className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-ink"
        >
          <IconPhone size={19} color="#F7F3EC" />
        </a>
        {listing.contact === "telegram" ? (
          <a
            href="https://t.me/share"
            target="_blank"
            rel="noreferrer"
            className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-telegram"
          >
            <IconTg size={19} color="#F7F3EC" />
          </a>
        ) : (
          <a
            href="https://wa.me/996555123456"
            target="_blank"
            rel="noreferrer"
            className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-success"
          >
            <IconWa size={19} color="#F7F3EC" />
          </a>
        )}
      </div>
      {toast ? (
        <div className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-screen">
          {toast}
        </div>
      ) : null}
    </PhoneShell>
  );
}
