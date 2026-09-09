"use client";

import { settlementById, settlementLabel, settlementRoad } from "@/lib/data";
import { useApp } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { IconPin } from "./icons";

export function AiylRoad({ listing }: { listing: Listing }) {
  const { t, lang } = useApp();
  const s = settlementById(listing.settlement);
  if (!s && !(listing.city === "tokmok" || listing.city === "kochkor" || listing.city === "naryn" || listing.city === "talas" || listing.city === "batken")) {
    return null;
  }
  const title = s ? settlementLabel(s, lang) : t.cities[listing.city];
  const road = s ? settlementRoad(s, lang) : t.aiylFar;

  return (
    <div className="mt-3 flex items-start gap-3 rounded-[18px] border border-line bg-white p-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chip">
        <IconPin size={16} color="#B8452F" />
      </span>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-dark">{t.aiyl}</div>
        <div className="mt-1 text-[15px] font-semibold text-ink">{title}</div>
        <p className="mt-1 text-[13px] leading-[1.45] text-muted">{road}</p>
        <p className="mt-1.5 text-[12px] leading-[1.4] text-muted-2">{t.aiylTea}</p>
      </div>
    </div>
  );
}
