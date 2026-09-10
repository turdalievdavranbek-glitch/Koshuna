"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatSom, ownerById } from "@/lib/data";
import { formatStayRange, nightsBetween } from "@/lib/dates";
import { goLookKind, similarListings } from "@/lib/deal";
import { twoGisUrl } from "@/lib/geo";
import { listingChipLabel, listingDesc, listingTitle } from "@/lib/i18n";
import { familyShareText } from "@/lib/share";
import { isAbroad } from "@/lib/strategy";
import { useApp } from "@/lib/store";
import { IconBack, IconChat, IconHeart, IconPhone, IconPin, IconShare, IconTg, IconWa } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { NeighborCard } from "@/components/neighbor-seal";
import { VoiceNote } from "@/components/voice-note";
import { AiylRoad } from "@/components/aiyl-road";
import { StayCalendar } from "@/components/stay-calendar";
import { GoLookCard, PayAfterNote } from "@/components/go-look";
import { ListingStageBanner, OwnerListingTools } from "@/components/owner-listing";
import { MeetDealBlock } from "@/components/meet-deal";
import { ReportListing } from "@/components/report-listing";
import { isOwnListing, isOffMarket } from "@/lib/listing-owner";
import { ShareToSocial } from "@/components/share-to-social";
import { Eyebrow, Photo, Price } from "@/components/ui";
import { ListingHero, ListingThumb, isVideoListing } from "@/components/listing-media";
import { SellerStarsBadge } from "@/components/trust-stars";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, allListings, extraListings, isFav, toggleFav, user, setPendingPath, ensureThread, filters, setFilters, addMessage, elderMode, markViewed, viewerPlace, shops } =
    useApp();
  const listing = allListings.find((l) => l.id === id);
  const [photo, setPhoto] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (listing) markViewed(listing.id);
    // Record the visit once per listing id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);

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

  const similar = similarListings(listing, allListings);
  const mine = isOwnListing(listing, extraListings, user);
  const off = isOffMarket(listing);
  const reserved = listing.status === "reserved";
  const isStay = listing.section === "stays" || listing.dealKind === "short";
  const look = goLookKind(listing);
  const nights = filters.checkIn && filters.checkOut ? nightsBetween(filters.checkIn, filters.checkOut) : 0;
  const stayTotal = nights ? listing.price * nights : 0;

  const onBook = () => {
    if (!filters.checkIn || !filters.checkOut || !nights) {
      setToast(t.pickDatesFirst);
      setTimeout(() => setToast(""), 1800);
      return;
    }
    if (!gate(`/chat/${listing.id}`)) return;
    const tid = ensureThread(listing.id);
    addMessage(
      tid,
      t.bookRequest(formatStayRange(filters.checkIn, filters.checkOut, lang), t.nights(nights), formatSom(stayTotal)),
    );
    router.push(`/chat/${tid}`);
  };

  return (
    <PhoneShell>
      <div className="sc relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative bg-ink" style={{ height: isVideoListing(listing) ? 360 : listing.section === "secondhand" ? 300 : 320 }}>
          <ListingHero listing={listing} photo={photo} title={title} />
          <div className="absolute left-[18px] right-[18px] top-[12px] z-10 flex items-center justify-between">
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
                onClick={() => router.push(`/story/${listing.id}`)}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/94"
                aria-label={t.storyToIg}
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
          {isVideoListing(listing) ? (
            <span className="pointer-events-none absolute bottom-4 right-4">
              <SellerStarsBadge listing={listing} placed />
            </span>
          ) : (
            <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-2">
              <SellerStarsBadge listing={listing} placed />
              <span className="rounded-full bg-[rgba(23,20,15,.72)] px-[11px] py-1 text-xs font-semibold text-screen">
                {photo + 1} / {listing.photos.length}
              </span>
            </span>
          )}
        </div>

        {listing.photos.length > 1 && !isVideoListing(listing) ? (
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
              {listingChipLabel(listing, t)}
            </span>
            {isVideoListing(listing) ? (
              <span className="rounded-full bg-ink px-[11px] py-1 text-xs font-semibold text-screen">{t.videoListing}</span>
            ) : null}
            {listing.condition ? (
              <span className="rounded-full bg-success-tint px-[11px] py-1 text-xs font-bold text-success">
                {t.conditions[listing.condition]}
              </span>
            ) : (
              <span className="text-xs text-muted-2">
                {t.cities[listing.city]} · {t.sample}
              </span>
            )}
            {listing.mediaKind === "voice" ? (
              <span className="rounded-full bg-chip px-[11px] py-1 text-xs font-semibold text-muted">{t.voiceListing}</span>
            ) : null}
          </div>
          <h1 className="mt-3.5 font-display text-[26px] font-bold leading-[1.14] tracking-[-0.015em] text-ink">
            {title}
          </h1>
          <ListingStageBanner listing={listing} />
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <IconPin size={14} color="#B8452F" />
            {listing.district ? `${t.cities[listing.city]}, ${listing.district}` : `${t.cities[listing.city]} · ${t.ago[listing.postedAgo]}`}
          </div>
          {listing.lng != null && listing.lat != null ? (
            <a
              href={twoGisUrl(listing.city, listing.lng, listing.lat)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-[13px] font-semibold text-accent"
            >
              {t.open2gis}
            </a>
          ) : null}
          <div className="mt-4">
            <Price listing={listing} large />
          </div>
          {listing.shopId
            ? (() => {
                const shop = shops.find((item) => item.id === listing.shopId);
                if (!shop || shop.status !== "active") return null;
                const others = allListings.filter(
                  (item) => item.shopId === shop.id && item.id !== listing.id && item.status !== "draft" && item.status !== "withdrawn" && item.status !== "closed",
                );
                return (
                  <div className="mt-3 rounded-[16px] border border-line bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.shopFromListing}</div>
                    <button type="button" onClick={() => router.push(`/shops/${shop.id}`)} className="mt-1.5 text-left">
                      <div className="font-display text-[17px] font-bold text-ink">{shop.name}</div>
                      <div className="text-[13px] text-muted">{t.shopToShop} · {t.cities[shop.city]}</div>
                    </button>
                    {others.length ? (
                      <div className="mt-2">
                        <div className="text-[12px] font-semibold text-muted">{t.shopMoreFrom}</div>
                        {others.slice(0, 4).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => router.push(`/listing/${item.id}`)}
                            className="mt-1 block text-left text-[13px] font-semibold text-ink"
                          >
                            {listingTitle(item, lang)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })()
            : null}
          {mine ? <OwnerListingTools listing={listing} /> : null}
          {reserved ? <MeetDealBlock listing={listing} mine={mine} /> : null}
          <PayAfterNote listing={listing} />
          {isStay && nights ? (
            <div className="mt-2 text-[15px] font-semibold text-ink">
              {t.stayTotal}: {formatSom(stayTotal)} KGS · {t.nights(nights)}
            </div>
          ) : null}
          {listing.utilitiesNote ? <div className="mt-1 text-[13px] text-muted-2">{t.utilities}</div> : null}

          <NeighborCard listing={listing} />
          {isAbroad(viewerPlace) ? (
            <div className="mt-3 rounded-[16px] border border-line bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.bridgeAbroad}</div>
              <p className="mt-1.5 text-[13px] leading-[1.45] text-muted">{t.abroadListingHint(t.viewerPlaces[viewerPlace])}</p>
            </div>
          ) : null}
          {off || reserved ? null : <GoLookCard listing={listing} />}
          <VoiceNote listing={listing} />
          <AiylRoad listing={listing} />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push(`/story/${listing.id}`)}
              className="h-[48px] rounded-[14px] border border-line bg-white text-[13px] font-semibold text-ink"
            >
              {t.storyToIg}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(familyShareText(listing, t, lang, viewerPlace))}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-[48px] items-center justify-center rounded-[14px] bg-success text-[13px] font-semibold text-white"
            >
              {isAbroad(viewerPlace) ? t.showFamily : t.showApa}
            </a>
          </div>
          <div className="mt-3 rounded-[18px] border border-line bg-white p-4">
            <ShareToSocial listing={listing} />
          </div>

          {listing.rooms ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                [String(listing.rooms), t.roomWord],
                [String(listing.area), "м²"],
                listing.dealKind === "buy"
                  ? [t.dealBuy, t.dealType]
                  : listing.dealKind === "short" || listing.unit === "day"
                    ? ["сут", t.units.day.replace("/ ", "")]
                    : ["мес", t.monthRent],
              ].map(([v, l]) => (
                <div key={l} className="rounded-[14px] border border-line bg-white px-3 py-3">
                  <div className="font-display text-[19px] font-bold text-ink">{v}</div>
                  <div className="mt-0.5 text-xs text-muted">{l}</div>
                </div>
              ))}
            </div>
          ) : null}

          {isStay ? (
            <div className="mt-[22px]">
              <Eyebrow>
                {t.checkIn} / {t.checkOut}
              </Eyebrow>
              <div className="mt-2.5">
                <StayCalendar
                  checkIn={filters.checkIn}
                  checkOut={filters.checkOut}
                  onChange={(next) => setFilters(next)}
                />
              </div>
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
            {listing.transcript ? (
              <p className="mt-2 text-[12px] font-semibold text-accent-dark">{t.fromSpeech}</p>
            ) : null}
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
                    ? `${t.onKoshuna} ${owner.since} · ${owner.replyTime}`
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

          {similar.length ? (
            <div className="mt-6">
              <Eyebrow>{t.similar}</Eyebrow>
              <div className="sc mt-2.5 flex gap-2.5 overflow-x-auto pb-0.5">
                {similar.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/listing/${item.id}`)}
                    className={`w-[148px] shrink-0 text-left ${
                      isVideoListing(item) ? "" : "overflow-hidden rounded-2xl border border-line bg-white"
                    }`}
                  >
                    <ListingThumb
                      listing={item}
                      alt={listingTitle(item, lang)}
                      compact
                      className={isVideoListing(item) ? "px-4 pt-2" : ""}
                    />
                    <div className={`px-[11px] pb-[11px] pt-[9px] ${isVideoListing(item) ? "text-center" : ""}`}>
                      <div className="font-display text-[15px] font-bold text-ink">{formatSom(item.price)} KGS</div>
                      <div className="mt-[3px] line-clamp-2 text-xs leading-[1.3] text-muted">
                        {listingTitle(item, lang)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <ReportListing listing={listing} />
          <div className="h-[120px]" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-line bg-[rgba(247,243,236,.96)] px-5 pb-[26px] pt-3.5">
        {elderMode && !isStay ? (
          <>
            <a
              href={`tel:+996555123456`}
              onClick={(e) => {
                if (!user) {
                  e.preventDefault();
                  gate(`/listing/${listing.id}`);
                }
              }}
              className="shadow-btn flex h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-base font-semibold text-screen"
            >
              <IconPhone size={19} color="#F7F3EC" />
              {t.call}
            </a>
            <button
              type="button"
              onClick={onChat}
              className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-accent"
            >
              <IconChat size={18} color="#FFF7F0" />
            </button>
          </>
        ) : (
          <>
        <button
          type="button"
          onClick={() => {
            if (off) return;
            if (reserved) {
              document.getElementById("meet-deal")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (isStay) {
              onBook();
              return;
            }
            if (look !== "none") {
              document.getElementById("go-look")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            onChat();
          }}
          className="shadow-btn flex h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-accent-on"
        >
          {off || reserved ? (
            listing.status === "reserved" ? t.status.reserved : listing.status === "closed" ? t.status.closed : t.status.withdrawn
          ) : isStay ? (
            t.bookStay
          ) : look !== "none" ? (
            look === "meet" ? t.goMeet : t.goLook
          ) : (
            <>
              <IconChat size={18} color="#FFF7F0" />
              {listing.section === "secondhand" ? t.writeSeller : t.write}
            </>
          )}
        </button>
        {!isStay && look !== "none" ? (
          <button
            type="button"
            onClick={onChat}
            className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-accent"
          >
            <IconChat size={18} color="#FFF7F0" />
          </button>
        ) : null}
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
          </>
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
