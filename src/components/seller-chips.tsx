"use client";

import { AUTO_SELLER_KINDS, SELLER_KINDS } from "@/lib/partners";
import { useApp } from "@/lib/store";
import { Chip, Eyebrow } from "@/components/ui";

export function SellerKindChips({
  labeled,
  variant = "realty",
}: {
  labeled?: boolean;
  variant?: "realty" | "auto";
}) {
  const { t, filters, setFilters } = useApp();
  const kinds = variant === "auto" ? AUTO_SELLER_KINDS : SELLER_KINDS;
  const labelOf = (id: (typeof kinds)[number]) => {
    if (id === "any") return t.sellerAll;
    if (id === "neighbor") return t.fromNeighbor;
    if (id === "owner") return t.sellerOwner;
    if (id === "realtor") return t.sellerRealtor;
    if (id === "private") return t.sellerPrivate;
    return t.sellerDealer;
  };
  const row = (
    <div className={`flex flex-wrap gap-2 ${labeled ? "mt-2.5" : ""}`}>
      {kinds.map((id) => (
        <Chip
          key={id}
          active={filters.sellerKind === id}
          onClick={() =>
            setFilters({
              sellerKind: id,
              neighborOnly: variant === "realty" && id === "neighbor",
            })
          }
        >
          {labelOf(id)}
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
