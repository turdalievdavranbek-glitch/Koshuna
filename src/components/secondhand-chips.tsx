"use client";

import { CATEGORIES, goodsKindsOf, isTechCategory, techBrandsOf, techModelsOf } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function SecondhandChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const kinds = goodsKindsOf(filters.category);
  const brands = techBrandsOf(filters.category);
  const models = techModelsOf(filters.category, filters.techBrand);

  const pickCategory = (category: string | null) => {
    setFilters({ category, goodsKind: "any", techBrand: "any", techModel: "any" });
  };

  const pickKind = (goodsKind: string) => {
    setFilters({ goodsKind });
  };

  const pickBrand = (techBrand: string) => {
    setFilters({ techBrand, techModel: "any" });
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
        <Chip active={filters.goodsKind === "any"} onClick={() => pickKind("any")}>
          {t.any}
        </Chip>
        {kinds.map((id) => (
          <Chip key={id} active={filters.goodsKind === id} onClick={() => pickKind(id)}>
            {t.goodsKinds[id]}
          </Chip>
        ))}
      </div>
    ) : null;

  const brandRow =
    brands.length > 0 ? (
      <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
        <Chip active={filters.techBrand === "any"} onClick={() => pickBrand("any")}>
          {t.any}
        </Chip>
        {brands.map((id) => (
          <Chip key={id} active={filters.techBrand === id} onClick={() => pickBrand(id)}>
            {t.techBrands[id]}
          </Chip>
        ))}
      </div>
    ) : null;

  const modelRow =
    models.length > 0 ? (
      <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
        <Chip active={filters.techModel === "any"} onClick={() => setFilters({ techModel: "any" })}>
          {t.any}
        </Chip>
        {models.map((id) => (
          <Chip key={id} active={filters.techModel === id} onClick={() => setFilters({ techModel: id })}>
            {t.techModels[id]}
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
            <Eyebrow>{isTechCategory(filters.category) ? t.equipmentType : t.itemType}</Eyebrow>
            {kindRow}
          </div>
        ) : null}
        {brandRow ? (
          <div>
            <Eyebrow>{t.carMake}</Eyebrow>
            {brandRow}
          </div>
        ) : null}
        {modelRow ? (
          <div>
            <Eyebrow>{t.carModel}</Eyebrow>
            {modelRow}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {categoryRow}
      {kindRow}
      {brandRow}
      {modelRow}
    </div>
  );
}
