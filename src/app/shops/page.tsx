"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/data";
import { applyShopFilters, filterShopParent, publicShops, SHOP_CATEGORIES, shopKindsOf, shopsOf, type ShopCategory, type ShopKind } from "@/lib/shops";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { ShopThumb } from "@/components/shop-thumb";
import { Chip } from "@/components/ui";
import { IconBack, IconSearch } from "@/components/icons";

export default function ShopsPage() {
  const { t, user, shops, city, ready } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ShopCategory | ShopKind | "all">("all");
  const [cityKey, setCityKey] = useState(city);
  const [mine, setMine] = useState(false);

  const list = useMemo(() => {
    const source = mine ? shopsOf(shops, user) : publicShops(shops);
    return applyShopFilters(source, { query, city: cityKey, category: cat }, city);
  }, [shops, query, cityKey, cat, user, city, mine]);
  const parent = filterShopParent(cat);
  const kids = shopKindsOf(parent);

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
          {CITIES.map((id) => (
            <Chip key={id} active={cityKey === id} onClick={() => setCityKey(id)}>
              {id === "all" ? t.country : t.cities[id]}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            {t.shopCats.all}
          </Chip>
          {SHOP_CATEGORIES.map((id) => (
            <Chip key={id} active={parent === id} onClick={() => setCat(id)}>
              {t.shopCats[id]}
            </Chip>
          ))}
        </div>
        {kids.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {kids.map((id) => (
              <Chip key={id} active={cat === id} onClick={() => setCat(id)}>
                {t.shopKinds[id]}
              </Chip>
            ))}
          </div>
        ) : null}
        {user ? (
          <Link href="/shops/new" className="shadow-btn mt-4 flex h-12 items-center justify-center rounded-2xl bg-accent text-[15px] font-semibold text-accent-on no-underline">
            {t.shopNew}
          </Link>
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
          <p className="mt-6 text-[14px] leading-[1.45] text-muted">{query || cat !== "all" || cityKey !== "all" ? t.shopEmptyFilter : mine ? t.shopEmptyMine : t.shopEmpty}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2.5">
          {list.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => router.push(`/shops/${shop.id}`)}
              className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3 text-left"
            >
              <ShopThumb cover={shop.coverUrl} video={shop.videoUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-display text-[16px] font-bold text-ink">{shop.name || t.shopCard}</span>
                  {shop.status !== "active" ? (
                    <span className="rounded-md bg-chip px-1.5 py-0.5 text-[10px] font-bold text-muted">{t.status[shop.status]}</span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {t.shopCats[shop.category]}
                  {(shop.kinds ?? []).length ? ` · ${shop.kinds.slice(0, 2).map((id) => t.shopKinds[id]).join(", ")}` : ""}
                  {" · "}
                  {t.cities[shop.city]}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted-2">{shop.address}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
