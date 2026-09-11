"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyShopFilters, publicShops, SHOP_CATEGORIES, shopKindsOf, shopsOf, type ShopCategory } from "@/lib/shops";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { ShopRows } from "@/components/shop-rows";
import { Chip } from "@/components/ui";
import { IconBack, IconSearch } from "@/components/icons";
import { LocationLine } from "@/components/location-line";

export default function ShopsPage() {
  const { t, user, shops, city, ready } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ShopCategory | "all">("all");
  const [mine, setMine] = useState(false);

  const list = useMemo(() => {
    const source = mine ? shopsOf(shops, user) : publicShops(shops);
    return applyShopFilters(source, { query, city, category: cat }, city);
  }, [shops, query, cat, user, city, mine]);

  const openCategory = (id: ShopCategory) => {
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
          <Chip active={!mine} onClick={() => setMine(false)}>
            {t.shopCats.all}
          </Chip>
          {user ? (
            <Chip active={mine} onClick={() => setMine(true)}>
              {t.shopMine}
            </Chip>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            {t.shopCats.all}
          </Chip>
          {SHOP_CATEGORIES.map((id) => (
            <Chip key={id} active={cat === id} onClick={() => openCategory(id)}>
              {t.shopCats[id]}
            </Chip>
          ))}
        </div>
        {user ? (
          <>
            <Link href="/shops/quick" className="shadow-btn mt-4 flex h-12 items-center justify-center rounded-2xl bg-accent text-[15px] font-semibold text-accent-on no-underline">
              {t.shopQuickCta}
            </Link>
            <Link href="/shops/new" className="mt-2.5 flex h-12 items-center justify-center rounded-2xl border border-line bg-white text-[15px] font-semibold text-ink no-underline">
              {t.shopNew}
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-4 h-12 w-full rounded-2xl border border-line bg-white text-[14px] font-semibold"
          >
            {t.shopNeedAuth}
          </button>
        )}
        {!ready ? <p className="mt-6 text-[14px] text-muted">{t.shopLoad}</p> : null}
        {ready && !list.length ? (
          <p className="mt-6 text-[14px] leading-[1.45] text-muted">{query || cat !== "all" || city !== "all" ? t.shopEmptyFilter : mine ? t.shopEmptyMine : t.shopEmpty}</p>
        ) : null}
        <div className="mt-4">
          <ShopRows shops={list} />
        </div>
      </div>
    </PhoneShell>
  );
}
