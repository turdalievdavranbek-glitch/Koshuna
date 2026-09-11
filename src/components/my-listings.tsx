"use client";

import { useRouter } from "next/navigation";
import { formatSom } from "@/lib/data";
import { listingTitle } from "@/lib/i18n";
import { mineListings } from "@/lib/listing-owner";
import { useApp } from "@/lib/store";
import { ListingThumb, isVideoListing } from "@/components/listing-media";
import { Photo } from "@/components/ui";

function statusLabel(
  item: { status: string; closedKind?: "sold" | "rented" },
  t: ReturnType<typeof useApp>["t"],
) {
  if (item.status === "closed" && item.closedKind === "sold") return t.closedSold;
  if (item.status === "closed" && item.closedKind === "rented") return t.closedRented;
  return t.status[item.status as keyof typeof t.status] ?? item.status;
}

export function MyListings({ limit }: { limit?: number }) {
  const { t, lang, user, extraListings, allListings, meetDeals, shops, duplicateListingToDraft } = useApp();
  const router = useRouter();
  const mine = mineListings(allListings, extraListings, user, shops);
  const rows = limit ? mine.slice(0, limit) : mine;

  if (!mine.length) {
    return (
      <div className="rounded-[18px] border border-line bg-white px-4 py-5 text-center">
        <p className="text-[15px] leading-[1.45] text-muted">{t.emptySellListings}</p>
        <button
          type="button"
          onClick={() => router.push("/post")}
          className="shadow-btn mt-4 h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
        >
          {t.sellPostCta}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((item) => (
        <div key={item.id} className="overflow-hidden rounded-[18px] border border-line bg-white">
          <button
            type="button"
            onClick={() => router.push(`/listing/${item.id}`)}
            className="flex w-full items-center text-left"
          >
            <div className={`shrink-0 p-2 ${isVideoListing(item) ? "w-[88px]" : "h-24 w-24 p-0"}`}>
              {isVideoListing(item) ? (
                <ListingThumb listing={item} alt="" compact />
              ) : (
                <div className="h-24 w-24 overflow-hidden">
                  <Photo src={item.photos[0]} alt="" />
                </div>
              )}
            </div>
            <div className="flex-1 px-3.5 py-3">
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background:
                      item.status === "promoted" || item.status === "reserved"
                        ? "#F3E0D9"
                        : item.status === "closed"
                          ? "#E4EFE9"
                          : item.status === "draft" || item.status === "withdrawn"
                            ? "#EFE8DB"
                            : "#E4EFE9",
                    color:
                      item.status === "promoted" || item.status === "reserved"
                        ? "#8E3423"
                        : item.status === "draft" || item.status === "withdrawn"
                          ? "#6E6558"
                          : "#2A6B57",
                  }}
                >
                  {statusLabel(item, t).toUpperCase()}
                </span>
                {item.reservedBy ? (
                  <span className="rounded-md bg-chip px-2 py-0.5 text-[10px] font-bold text-muted">
                    {item.reservedBy.name}
                    {meetDeals[item.id]?.buyerConfirmed ? "" : " · …"}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 text-sm leading-[1.3] text-ink">{listingTitle(item, lang)}</div>
              <div className="mt-1.5 text-xs text-muted-2">
                {item.status === "draft"
                  ? `${t.cities[item.city]} · ${formatSom(item.price)} KGS`
                  : `${item.views} ${t.views} · ${item.favCount} ${t.fav.toLowerCase()}${
                      item.leadCount ? ` · ${t.leadsTitle} ${item.leadCount}` : ""
                    }`}
              </div>
            </div>
          </button>
          <div className="flex gap-2 border-t border-line px-3.5 py-2">
            <button
              type="button"
              onClick={() => {
                duplicateListingToDraft(item);
                router.push("/post");
              }}
              className="rounded-full border border-line px-3 py-1.5 text-[12px] font-bold"
            >
              {t.duplicateListing}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
