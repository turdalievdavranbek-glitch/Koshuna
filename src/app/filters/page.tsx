"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { applyFilters } from "@/lib/filter";
import { feedHrefFromFilters } from "@/lib/section-tree";
import { goBack } from "@/lib/go-back";
import { useApp } from "@/lib/store";
import { IconBack, IconHeart } from "@/components/icons";
import { PhoneShell } from "@/components/shell";
import { FiltersPanel } from "@/components/filters-panel";

export default function FiltersPage() {
  const { t, filters, resetFilters, city, allListings, user, setPendingPath, saveCurrentSearch } = useApp();
  const router = useRouter();
  const count = applyFilters(allListings, filters, city).length;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const leave = () => {
      if (!mq.matches || document.documentElement.classList.contains("native")) return;
      goBack(router, "/search");
    };
    leave();
    mq.addEventListener("change", leave);
    return () => mq.removeEventListener("change", leave);
  }, [router]);

  return (
    <PhoneShell>
      <div className="flex w-full min-w-0 items-center justify-between gap-2 px-5 pb-3.5 pt-1">
        <button
          type="button"
          onClick={() => goBack(router, "/search")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
        >
          <IconBack size={16} color="#17140F" />
        </button>
        <span className="min-w-0 truncate font-display text-lg font-bold text-ink">{t.filters}</span>
        <button type="button" onClick={resetFilters} className="shrink-0 text-sm font-semibold text-accent" data-testid="filters-reset">
          {t.filterReset}
        </button>
      </div>

      <FiltersPanel />

      <div className="flex w-full min-w-0 shrink-0 gap-2.5 border-t border-line bg-screen px-5 pb-[26px] pt-3.5">
        <button
          type="button"
          onClick={() => {
            if (!user) {
              setPendingPath("/filters");
              router.push("/login");
              return;
            }
            saveCurrentSearch();
            router.push("/favorites");
          }}
          className="flex h-[54px] w-14 items-center justify-center rounded-2xl border border-line bg-white"
          aria-label={t.saveSearch}
        >
          <IconHeart size={19} color="#17140F" />
        </button>
        <button
          type="button"
          onClick={() => router.push(feedHrefFromFilters(filters))}
          data-testid="filters-show"
          className="shadow-btn box-border flex h-[54px] min-w-0 flex-1 items-center justify-center rounded-2xl bg-accent px-3 text-center text-base font-semibold text-accent-on"
        >
          {t.showN(count)}
        </button>
      </div>
    </PhoneShell>
  );
}
