"use client";

import { useRouter } from "next/navigation";
import { mineListings } from "@/lib/listing-owner";
import { shopsOf } from "@/lib/shops";
import { useApp } from "@/lib/store";
import { MyListings } from "@/components/my-listings";
import { PhoneShell } from "@/components/shell";
import { SideSwitch } from "@/components/side-switch";

export default function SellingPage() {
  const { t, user, extraListings, allListings, shops, setPendingPath, setSide } = useApp();
  const router = useRouter();
  const mine = mineListings(allListings, extraListings, user, shops);
  const shopCount = shopsOf(shops, user).length;

  if (!user) {
    return (
      <PhoneShell tab>
        <div className="flex flex-1 flex-col px-5 pt-4">
          <h1 className="font-display text-[28px] font-extrabold text-ink">{t.myListings}</h1>
          <p className="mt-2 text-[15px] leading-[1.5] text-muted">{t.guestSideHint}</p>
          <button
            type="button"
            onClick={() => {
              setPendingPath("/selling");
              router.push("/login");
            }}
            className="shadow-btn mt-6 h-[54px] rounded-2xl bg-accent text-base font-semibold text-accent-on"
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
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">{t.myListings}</h1>
          <span className="text-[13px] font-semibold text-muted">{t.nListings(mine.length)}</span>
        </div>
        <div className="mt-3.5">
          <SideSwitch compact />
        </div>
      </div>
      <div className="sc mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <button
          type="button"
          onClick={() => {
            setSide("sell");
            router.push("/post");
          }}
          className="shadow-btn h-12 w-full rounded-2xl bg-accent text-[15px] font-semibold text-accent-on"
        >
          {t.sellPostCta}
        </button>
        <button
          type="button"
          onClick={() => router.push("/shops")}
          className="mt-2.5 flex h-12 w-full items-center justify-between rounded-2xl border border-line bg-white px-4 text-left"
        >
          <span className="text-[15px] font-semibold text-ink">{t.shopMine}</span>
          <span className="text-[13px] font-semibold text-accent">{t.allN(shopCount)}</span>
        </button>
        <div className="mt-4">
          <MyListings />
        </div>
      </div>
    </PhoneShell>
  );
}
