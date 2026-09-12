"use client";

import { useRouter } from "next/navigation";
import { isShopCategory, isShopKind, parentOfShopKind, shopKindsOf, SHOP_CATEGORIES } from "@/lib/shops";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";
import { SectionList } from "@/components/section-list";

export function applySellerShopCategory(category: string | null) {
  if (!category) return { section: "shops" as const, category: null, goodsKind: "any" };
  return { section: "shops" as const, category, goodsKind: "any" };
}

export function ShopCategoryChips({ labeled, list }: { labeled?: boolean; list?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const router = useRouter();
  const parent = isShopKind(filters.category) ? parentOfShopKind(filters.category) : isShopCategory(filters.category) ? filters.category : null;
  const kinds = parent ? shopKindsOf(parent) : [];

  const pick = (category: string | null) => {
    setFilters(applySellerShopCategory(category));
    if (category && isShopCategory(category) && shopKindsOf(category).length) {
      router.push(`/shops/c/${category}`);
    }
  };

  const pickKind = (id: string) => {
    setFilters({ section: "shops", category: id });
    if (parent) router.push(`/shops/c/${parent}/${id}`);
  };

  if (list) {
    return (
      <div className="flex flex-col gap-3">
        <SectionList
          title={t.category}
          rows={SHOP_CATEGORIES.map((c) => ({
            id: c,
            label: t.shopCats[c],
            active: filters.category === c || parent === c,
            onClick: () => pick(c),
          }))}
        />
        {kinds.length ? (
          <SectionList
            title={t.shopProductKind}
            rows={kinds.map((id) => ({
              id,
              label: t.shopKinds[id],
              active: filters.category === id,
              onClick: () => pickKind(id),
            }))}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {labeled ? <Eyebrow>{t.category}</Eyebrow> : null}
      <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
        {SHOP_CATEGORIES.map((id) => (
          <Chip key={id} active={filters.category === id || parent === id} onClick={() => pick(id)}>
            {t.shopCats[id]}
          </Chip>
        ))}
      </div>
      {kinds.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {kinds.map((id) => (
            <Chip key={id} active={filters.category === id} onClick={() => pickKind(id)}>
              {t.shopKinds[id]}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
