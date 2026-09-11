"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { PhoneShell } from "@/components/shell";
import { Toggle } from "@/components/ui";
import { LayoutSwitch, ListingGrid } from "@/components/listing-grid";
import { SideSwitch } from "@/components/side-switch";

export default function FavoritesPage() {
  const { t, user, favouriteIds, savedSearches, toggleSearchNotify, setPendingPath, allListings } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"items" | "searches">("items");
  const items = favouriteIds.map((id) => allListings.find((item) => item.id === id)).filter(Boolean);

  if (!user) {
    return (
      <PhoneShell tab>
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <h1 className="font-display text-[28px] font-extrabold text-ink">{t.fav}</h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-muted">{t.emptyFavHint}</p>
          <button
            type="button"
            onClick={() => {
              setPendingPath("/favorites");
              router.push("/login");
            }}
            className="shadow-btn mt-6 h-[54px] rounded-2xl bg-accent px-6 text-base font-semibold text-accent-on"
          >
            {t.loginCta}
          </button>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tab>
      <div className="px-5 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.fav}</h1>
          {tab === "items" && items.length ? <LayoutSwitch /> : null}
        </div>
        <div className="mt-3.5">
          <SideSwitch compact />
        </div>
        <div className="mt-3.5 flex gap-1 rounded-[14px] bg-chip p-1">
          <button
            type="button"
            onClick={() => setTab("items")}
            className="flex-1 rounded-[11px] py-2 text-center text-sm font-semibold"
            style={{
              background: tab === "items" ? "#FFFFFF" : "transparent",
              color: tab === "items" ? "#17140F" : "#6E6558",
              boxShadow: tab === "items" ? "0 1px 3px rgba(23,20,15,.08)" : "none",
            }}
          >
            {t.listingsTab(items.length)}
          </button>
          <button
            type="button"
            onClick={() => setTab("searches")}
            className="flex-1 rounded-[11px] py-2 text-center text-sm font-semibold"
            style={{
              background: tab === "searches" ? "#FFFFFF" : "transparent",
              color: tab === "searches" ? "#17140F" : "#6E6558",
              boxShadow: tab === "searches" ? "0 1px 3px rgba(23,20,15,.08)" : "none",
            }}
          >
            {t.searchesTab(savedSearches.length)}
          </button>
        </div>
      </div>

      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {tab === "items" ? (
          items.length === 0 ? (
            <div className="mt-10 text-center text-[15px] text-muted">{t.emptyFav}</div>
          ) : (
            <ListingGrid listings={items.filter((item): item is NonNullable<typeof item> => Boolean(item))} />
          )
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-accent-dark">{t.savedSearches}</div>
            {savedSearches.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-[18px] border border-line bg-white px-4 py-[15px]">
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-ink">{s.title}</div>
                  <div className="mt-1 text-[13px] text-muted">
                    {t.newSince}{" "}
                    {s.newCount ? <span className="font-bold text-accent">{s.newCount}</span> : 0}
                  </div>
                </div>
                <Toggle on={s.notify} onChange={() => toggleSearchNotify(s.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
