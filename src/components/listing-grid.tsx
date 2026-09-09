"use client";

import { useRouter } from "next/navigation";
import { listingChipLabel, listingTitle } from "@/lib/i18n";
import { settlementById, settlementLabel } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { Listing, ListingLayout } from "@/lib/types";
import { IconCols, IconHeart } from "./icons";
import { NeighborMark } from "./neighbor-seal";
import { Photo, Price } from "./ui";

export function LayoutSwitch() {
  const { t, listingLayout, setListingLayout } = useApp();
  const opts: { id: ListingLayout; count: 1 | 2 | 3; label: string }[] = [
    { id: "large", count: 1, label: t.layoutLarge },
    { id: "medium", count: 2, label: t.layoutMedium },
    { id: "small", count: 3, label: t.layoutSmall },
  ];
  return (
    <div className="flex shrink-0 rounded-[10px] border border-line bg-white p-0.5">
      {opts.map((o) => {
        const on = listingLayout === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-label={o.label}
            title={o.label}
            onClick={() => setListingLayout(o.id)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px]"
            style={{ background: on ? "#17140F" : "transparent" }}
          >
            <IconCols size={16} count={o.count} color={on ? "#F7F3EC" : "#6E6558"} />
          </button>
        );
      })}
    </div>
  );
}

function ListingCard({
  listing,
  layout,
  onFav,
}: {
  listing: Listing;
  layout: ListingLayout;
  onFav?: (id: string) => void;
}) {
  const { t, lang, isFav, user } = useApp();
  const router = useRouter();
  const title = listingTitle(listing, lang);
  const saved = Boolean(user && isFav(listing.id));
  const photoH = layout === "large" ? "h-[186px]" : layout === "medium" ? "h-[112px]" : "h-[74px]";
  const radius = layout === "small" ? "rounded-[12px]" : "rounded-[16px]";
  const pad = layout === "large" ? "px-[15px] pb-[15px] pt-[13px]" : layout === "medium" ? "px-2.5 pb-2.5 pt-2" : "px-1.5 pb-1.5 pt-1";

  return (
    <button
      type="button"
      onClick={() => router.push(`/listing/${listing.id}`)}
      className={`overflow-hidden border border-line bg-surface text-left ${radius}`}
    >
      <div className={`relative ${photoH}`}>
        <Photo src={listing.photos[0]} alt={title} />
        {layout !== "small" ? (
          <span className="pointer-events-none absolute left-2 top-2 max-w-[80%] truncate rounded-full bg-[rgba(23,20,15,.72)] px-2 py-0.5 text-[10px] font-semibold text-screen">
            {listingChipLabel(listing, t)}
          </span>
        ) : null}
        <span className="pointer-events-none absolute bottom-2 left-2">
          <NeighborMark listing={listing} compact={layout === "small"} />
        </span>
        {onFav && layout !== "small" ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onFav(listing.id);
            }}
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/92"
          >
            <IconHeart size={15} color={saved ? "#B8452F" : "#17140F"} filled={saved} />
          </span>
        ) : null}
      </div>
      <div className={pad}>
        <Price listing={listing} compact={layout !== "large"} />
        <div
          className={`mt-0.5 font-medium leading-[1.25] text-ink ${
            layout === "large" ? "text-[15px]" : layout === "medium" ? "line-clamp-2 text-[13px]" : "line-clamp-2 text-[11px]"
          }`}
        >
          {title}
        </div>
        {layout === "large" && listing.rooms ? (
          <div className="mt-1 text-[13px] text-muted">
            {listing.rooms} {t.roomWord} · {listing.area} м²
          </div>
        ) : null}
        {layout !== "small" ? (
          <div className="mt-1 text-[11px] text-muted-2">
            {listing.settlement && settlementById(listing.settlement)
              ? `${settlementLabel(settlementById(listing.settlement)!, lang)} · ${t.aiyl}`
              : t.cities[listing.city]}
          </div>
        ) : null}
      </div>
    </button>
  );
}

export function ListingGrid({
  listings,
  onFav,
}: {
  listings: Listing[];
  onFav?: (id: string) => void;
}) {
  const { listingLayout } = useApp();
  const cols = listingLayout === "large" ? "grid-cols-1" : listingLayout === "small" ? "grid-cols-3" : "grid-cols-2";
  const gap = listingLayout === "small" ? "gap-1.5" : "gap-2.5";
  return (
    <div className={`mt-3 grid ${cols} ${gap}`}>
      {listings.map((item) => (
        <ListingCard key={item.id} listing={item} layout={listingLayout} onFav={onFav} />
      ))}
    </div>
  );
}
