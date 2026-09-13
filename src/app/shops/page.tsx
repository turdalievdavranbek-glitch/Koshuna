"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyShopFilters, publicShops, SHOP_CATEGORIES, shopKindsOf, shopsOf, type ShopCategory } from "@/lib/shops";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { ShopRows } from "@/components/shop-rows";
import { ListingGrid } from "@/components/listing-grid";
import { Chip } from "@/components/ui";
import { IconBack, IconSearch } from "@/components/icons";
import { LocationLine } from "@/components/location-line";

export default function ShopsPage() {
  const { t, user, shops, city, ready, allListings, toggleFav, setPendingPath, filters } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ShopCategory | "all">("all");
  const [mine, setMine] = useState(false);

  useEffect(() => {
    if (filters.section === "shops" && filters.category && (SHOP_CATEGORIES as readonly string[]).includes(filters.category)) {
      setCat(filters.category as ShopCategory);
    }
  }, [filters.section, filters.category]);

  const list = useMemo(() => {
    const source = mine ? shopsOf(shops, user) : publicShops(shops);
    return applyShopFilters(source, { query, city, category: cat }, city);
  }, [shops, query, cat, user, city, mine]);
  const cards = useMemo(() => {
    const shopIds = new Set(list.map((shop) => shop.id));
    const q = query.trim().toLowerCase();
    return allListings.filter((item) => {
      if (item.section !== "shops") return false;
      if (item.status === "draft" || item.status === "withdrawn" || item.status === "closed") return false;
      if (item.shopId && !shopIds.has(item.shopId)) return false;
      if (q && !`${item.title} ${item.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allListings, list, query]);

  const openCategory = (id: ShopCategory) => {
    if (cat === id) {
      setCat("all");
      return;
    }
    if (shopKindsOf(id).length) {
      router.push(`/shops/c/${id}`);
      return;
    }
    setCat(id);
  };

  return (
    <PhoneShell tab>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push("/")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="font-display text-[17px] font-bold text-ink">{t.shopNav}</h1>
          <span className="w-9" />
        </div>
        <div className="mt-1">
          <LocationLine />
        </div>
        <div className="mt-3 flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4">
          <IconSearch size={17} color="#A79C8C" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.shopSearch}
            className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
          />
        </div>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Chip
              active={mine}
              onClick={() => setMine((v) => !v)}
            >
              {t.shopMine}
            </Chip>
          ) : null}
          {SHOP_CATEGORIES.map((id) => (
            <Chip key={id} active={cat === id} onClick={() => openCategory(id)}>
              {t.shopCats[id]}
            </Chip>
          ))}
        </div>
        {!ready ? <p className="mt-6 text-[14px] text-muted">{t.shopLoad}</p> : null}
        {ready && !list.length ? (
          <p className="mt-6 text-[14px] leading-[1.45] text-muted">{query || cat !== "all" || city !== "all" ? t.shopEmptyFilter : mine ? t.shopEmptyMine : t.shopEmpty}</p>
        ) : null}
        <div className="mt-4">
          <ShopRows shops={list} />
        </div>
        {cards.length ? (
          <div className="mt-6">
            <h2 className="font-display text-[19px] font-bold text-ink">{t.shopFeedTitle}</h2>
            <div className="mt-3">
              <ListingGrid
                listings={cards}
                onFav={(id) => {
                  const ok = toggleFav(id);
                  if (!ok) {
                    setPendingPath("/shops");
                    router.push("/login");
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </PhoneShell>
  );
}
