"use client";

import { useRouter } from "next/navigation";
import { PointList } from "@/components/point-rows";
import { SellerEntryCards } from "@/components/seller-entry-cards";
import { PhoneShell } from "@/components/shell";
import { IconBack, IconBag, IconCamera, IconCheck, IconPin } from "@/components/icons";
import { shopsOf } from "@/lib/shops";
import { useApp } from "@/lib/store";

export function BusinessPost() {
  const { t, user, shops } = useApp();
  const router = useRouter();
  if (!user) return null;
  const points = shopsOf(shops, user);
  const benefits = [
    { icon: <IconPin size={16} color="#B8452F" />, text: t.pointOffer1 },
    { icon: <IconCheck size={16} color="#B8452F" />, text: t.pointOffer2 },
    { icon: <IconCamera size={16} color="#B8452F" />, text: t.pointOffer3 },
    { icon: <IconBag size={16} color="#B8452F" />, text: t.pointOffer4 },
  ];
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
      <div data-testid="post-where" className="sc min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-8">
        {points.length === 0 ? (
          <div data-testid="point-offer" className="mt-2 rounded-[18px] border border-accent bg-white px-4 py-4">
            <div className="font-display text-[18px] font-bold leading-tight text-ink">{t.pointOfferTitle}</div>
            <div className="mt-3 flex flex-col gap-2.5">
              {benefits.map((row) => (
                <div key={row.text} className="flex items-start gap-2 text-[13px] leading-[1.4] text-ink">
                  <span className="mt-0.5 shrink-0">{row.icon}</span>
                  <span>{row.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[12px] text-muted">{t.pointOfferTime}</p>
          </div>
        ) : (
          <>
            <div className="mt-2 text-[13px] font-bold text-ink">{t.myPoints}</div>
            <div className="mt-2">
              <PointList shops={points} />
            </div>
          </>
        )}
        <div className="mt-4">
          <SellerEntryCards />
        </div>
        <button
          type="button"
          data-testid="point-new"
          onClick={() => router.push("/shops/new")}
          className="mt-3 h-[52px] w-full rounded-2xl border border-accent text-[15px] font-semibold text-accent"
        >
          {t.shopNewPoint}
        </button>
        {points.length === 0 ? (
          <button
            type="button"
            data-testid="point-offer-no"
            onClick={() => router.push("/post?type=personal")}
            className="mt-3 w-full text-center text-[13px] font-semibold text-muted"
          >
            {t.pointOfferNo}
          </button>
        ) : null}
      </div>
    </PhoneShell>
  );
}
