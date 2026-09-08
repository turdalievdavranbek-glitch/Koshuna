"use client";

import { CATEGORIES, goodsKindsOf } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function SecondhandChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const kinds = goodsKindsOf(filters.category);

  const pickCategory = (category: string | null) => {
    setFilters({ category, goodsKind: "any" });
  };

  const categoryRow = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      <Chip active={!filters.category} onClick={() => pickCategory(null)}>
        {t.allCategories}
      </Chip>
      {CATEGORIES.map((c) => (
        <Chip key={c} active={filters.category === c} onClick={() => pickCategory(c)}>
          {t.cats[c]}
        </Chip>
      ))}
    </div>
  );

  const kindRow =
    kinds.length > 0 ? (
      <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
        <Chip active={filters.goodsKind === "any"} onClick={() => setFilters({ goodsKind: "any" })}>
          {t.any}
        </Chip>
        {kinds.map((id) => (
          <Chip key={id} active={filters.goodsKind === id} onClick={() => setFilters({ goodsKind: id })}>
            {t.goodsKinds[id]}
          </Chip>
        ))}
      </div>
    ) : null;

  if (labeled) {
    return (
      <>
        <div>
          <Eyebrow>{t.category}</Eyebrow>
          {categoryRow}
        </div>
        {kindRow ? (
          <div>
            <Eyebrow>{t.itemType}</Eyebrow>
            {kindRow}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {categoryRow}
      {kindRow}
    </div>
  );
}
