"use client";

import { useRouter } from "next/navigation";
import { SellerEntryCards } from "@/components/seller-entry-cards";
import { PhoneShell } from "@/components/shell";
import { IconBack } from "@/components/icons";
import { shopsOf } from "@/lib/shops";
import { useApp } from "@/lib/store";

export function BusinessPost() {
  const { t, user, shops } = useApp();
  const router = useRouter();
  if (!user) return null;
  const points = shopsOf(shops, user);
  return (
    <PhoneShell>
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            data-testid="post-back"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            className="flex items-center gap-1 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3 text-[13px] font-semibold"
            aria-label={t.backLeave}
          >
            <IconBack size={16} color="#17140F" />
            {t.backLeave}
          </button>
          <span className="font-display text-[16px] font-bold">{t.postWhere}</span>
          <span className="w-16" />
        </div>
        <p className="mt-2 text-[13px] text-muted">{t.postWhereHint}</p>
      </div>
      <div className="sc min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {points.length ? <div className="mt-2 text-[13px] font-bold text-ink">{t.myPoints}</div> : null}
        <div className="mt-2 flex flex-col gap-2">
          {points.map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => router.push(`/shops/quick?shop=${shop.id}`)}
              className="rounded-[16px] border border-line bg-white px-3 py-3 text-left"
            >
              <div className="text-[15px] font-semibold text-ink">{shop.name}</div>
              <div className="mt-0.5 text-[12px] text-muted">
                {t.cities[shop.city] || shop.city}
                {shop.address ? ` · ${shop.address}` : ""}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <SellerEntryCards />
        </div>
        <button
          type="button"
          onClick={() => router.push("/shops/new")}
          className="mt-3 h-[52px] w-full rounded-2xl border border-accent text-[15px] font-semibold text-accent"
        >
          {t.shopNewPoint}
        </button>
      </div>
    </PhoneShell>
  );
}
