"use client";

import { formatSom } from "@/lib/data";
import { groupMenu } from "@/lib/menu";
import { menuCatLabel } from "@/lib/menu-copy";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { Eyebrow } from "./ui";

export function RestaurantMenu({ listing }: { listing: Listing }) {
  const { t } = useApp();
  const dishes = listing.menu ?? [];
  const groups = groupMenu(dishes);
  if (!dishes.length) {
    return listing.section === "restaurants" ? (
      <div className="mt-6">
        <Eyebrow>{t.restaurantMenu}</Eyebrow>
        <p className="mt-2 text-[13px] leading-[1.45] text-muted">{t.restaurantMenuEmpty}</p>
      </div>
    ) : null;
  }
  return (
    <div className="mt-6">
      <Eyebrow>{t.restaurantMenu}</Eyebrow>
      <div className="mt-3 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.category}>
            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{menuCatLabel(t, group.category)}</div>
            <div className="mt-2 flex flex-col gap-2">
              {group.items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-[16px] border border-line bg-white p-3">
                  {item.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo} alt="" className="h-14 w-14 rounded-[12px] object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink">{item.title}</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-accent">
                      {item.price != null ? `${formatSom(item.price)} KGS` : t.shopAskPrice}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
