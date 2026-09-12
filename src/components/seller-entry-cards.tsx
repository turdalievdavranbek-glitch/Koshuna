"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

export function SellerEntryCards() {
  const { t, setSide } = useApp();
  const router = useRouter();
  const cards = [
    { id: "shop", href: "/shops/quick?card=shop", title: t.sellCardShop, hint: t.sellCardShopHint },
    { id: "stall", href: "/shops/quick?card=stall", title: t.sellCardStall, hint: t.sellCardStallHint },
    { id: "cafe", href: "/restaurants/quick", title: t.sellCardCafe, hint: t.sellCardCafeHint },
    { id: "developer", href: "/post?card=developer", title: t.sellCardDeveloper, hint: t.sellCardDeveloperHint },
    { id: "dealer", href: "/post?card=dealer", title: t.sellCardDealer, hint: t.sellCardDealerHint },
  ] as const;

  return (
    <div data-testid="seller-entry-cards">
      <div className="text-[13px] font-semibold text-muted">{t.sellCardsTitle}</div>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              setSide("sell");
              router.push(card.href);
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3.5 text-left"
          >
            <div className="text-[15px] font-semibold text-ink">{card.title}</div>
            <p className="mt-1 text-[12px] leading-[1.4] text-muted">{card.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
