"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Chip } from "@/components/ui";
import { SellerKindChips } from "@/components/seller-chips";
import type { ReactNode } from "react";

/** Horizontal chip scroller — never wrap into oversized circles. */
export function FeedFilterBar({ children }: { children: ReactNode }) {
  return <div className="sc mt-2.5 flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">{children}</div>;
}

export function SharedFeedFilters({
  section,
  extra,
}: {
  section?: "rent" | "cars" | "home" | "other";
  extra?: ReactNode;
}) {
  const { t, filters, setFilters, resetFilters } = useApp();
  const router = useRouter();
  const kind = section === "rent" ? "realty" : section === "cars" ? "auto" : null;

  return (
    <FeedFilterBar>
      {kind ? (
        <SellerKindChips variant={kind} />
      ) : (
        <Chip active={filters.neighborOnly} onClick={() => setFilters({ neighborOnly: !filters.neighborOnly })}>
          {t.fromNeighbor}
        </Chip>
      )}
      <Chip
        active={filters.priceDroppedOnly}
        onClick={() => setFilters({ priceDroppedOnly: !filters.priceDroppedOnly })}
      >
        {t.priceDropped}
      </Chip>
      <Chip active={filters.videoOnly} onClick={() => setFilters({ videoOnly: !filters.videoOnly })}>
        {t.videoOnly}
      </Chip>
      {extra}
      <Chip onClick={() => router.push("/filters")}>
        {filters.sort === "new" ? t.newest : filters.sort === "price-asc" ? t.priceAsc : t.priceDesc}
        <span className="ml-1 text-[10px] text-muted-2">▾</span>
      </Chip>
      <button type="button" onClick={resetFilters} className="shrink-0 whitespace-nowrap px-[13px] py-[7px] text-[13px] font-semibold text-accent">
        {t.resetFilters}
      </button>
    </FeedFilterBar>
  );
}
