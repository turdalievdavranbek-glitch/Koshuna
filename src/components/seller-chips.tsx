"use client";

import { SELLER_KINDS } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function SellerKindChips({ labeled }: { labeled?: boolean }) {
  const { t, filters, setFilters } = useApp();
  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      {SELLER_KINDS.map((id) => (
        <Chip
          key={id}
          active={filters.sellerKind === id}
          onClick={() => setFilters({ sellerKind: id, neighborOnly: id === "neighbor" })}
        >
          {id === "any"
            ? t.sellerAll
            : id === "neighbor"
              ? t.fromNeighbor
              : id === "owner"
                ? t.sellerOwner
                : t.sellerRealtor}
        </Chip>
      ))}
    </div>
  );
  if (!labeled) return row;
  return (
    <div>
      <Eyebrow>{t.sellerWho}</Eyebrow>
      {row}
    </div>
  );
}
