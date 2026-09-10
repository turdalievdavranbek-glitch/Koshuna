"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CITIES } from "@/lib/data";
import { applyShopFilters, isShopCategory, isShopKind, parentOfShopKind, publicShops, shopKindsOf } from "@/lib/shops";
import { shopKindLabel } from "@/lib/shop-copy";
import { useApp } from "@/lib/store";
import type { ShopCategory, ShopKind } from "@/lib/types";
import { PhoneShell } from "@/components/shell";
import { ShopRows } from "@/components/shop-rows";
import { Chip } from "@/components/ui";
import { IconBack, IconSearch } from "@/components/icons";

export default function ShopKindResultsPage() {
  const { category, kind } = useParams<{ category: string; kind: string }>();
  const router = useRouter();
  const { t, shops, city, ready } = useApp();
  const [query, setQuery] = useState("");
  const [cityKey, setCityKey] = useState(city);

  const parentOk = isShopCategory(category);
  const all = kind === "all";
  const kindOk = all || (isShopKind(kind) && parentOfShopKind(kind) === category);
  const filter: ShopCategory | ShopKind | "all" = all && parentOk ? category : kindOk && isShopKind(kind) ? kind : "all";
  const title = all && parentOk ? t.shopCats[category] : shopKindLabel(t, kind);

  const list = useMemo(() => {
    if (filter === "all") return [];
    return applyShopFilters(publicShops(shops), { query, city: cityKey, category: filter }, city);
  }, [shops, query, cityKey, filter, city]);

  if (!parentOk || !shopKindsOf(category).length || !kindOk) {
    return (
      <PhoneShell tab>
        <div className="p-6 text-[15px] text-muted">{t.empty}</div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => router.push(`/shops/c/${category}`)} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface">
            <IconBack size={16} color="#17140F" />
          </button>
          <h1 className="max-w-[240px] truncate font-display text-[17px] font-bold text-ink">{title}</h1>
          <span className="w-9" />
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
          {CITIES.map((id) => (
            <Chip key={id} active={cityKey === id} onClick={() => setCityKey(id)}>
              {id === "all" ? t.country : t.cities[id]}
            </Chip>
          ))}
        </div>
        {!ready ? <p className="mt-6 text-[14px] text-muted">{t.shopLoad}</p> : null}
        {ready && !list.length ? <p className="mt-6 text-[14px] leading-[1.45] text-muted">{t.shopEmptyFilter}</p> : null}
        <div className="mt-4">
          <ShopRows shops={list} />
        </div>
      </div>
    </PhoneShell>
  );
}
